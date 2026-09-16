"""G0 — reconnaissance territorial de los 113 municipios de Bizkaia.

Descriptivo y NO selectivo: no altera la muestra congelada de G0.

Por municipio:
  Codigo_Mun, nombre, total_buildings, known, unknown, suspicious, invalid,
  coverage_pct, min_year, max_year, suspicious_year_count, top suspicious values,
  geometry: null/invalid, area min/p50/p95/max

Uso:
  python pipeline/g0_recon.py [--limit N] [--workers 8]

Salidas:
  evidence/g0/02-recon/recon-bizkaia.csv
  evidence/g0/02-recon/recon-bizkaia.json
  evidence/g0/02-recon/recon-qa-summary.json
  data/raw/catastro/*.zip            (gitignored)
  data/interim/catastro/<cod>/       (gitignored)
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import csv
import hashlib
import json
import re
import sys
import time
import zipfile
from pathlib import Path

import duckdb
import requests

ROOT = Path(__file__).resolve().parents[1]
DATASETS = ROOT / "evidence/g0/02-recon/datasets.json"
RAW = ROOT / "data/raw/catastro"
INTERIM = ROOT / "data/interim/catastro"
OUTDIR = ROOT / "evidence/g0/02-recon"
UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu G0)"}

MIN_VALID_YEAR = 1700
SNAPSHOT_YEAR = 2026


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path) -> tuple[bool, str, int]:
    if dest.exists() and dest.stat().st_size > 0:
        return True, sha256_file(dest), dest.stat().st_size
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    try:
        with requests.get(url, headers=UA, timeout=600, stream=True, verify=False) as r:
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}", 0
            with tmp.open("wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)
        for attempt in range(10):
            try:
                if dest.exists():
                    dest.unlink()
                tmp.replace(dest)
                break
            except PermissionError:
                time.sleep(0.3 * (attempt + 1))
        else:
            return False, "PermissionError replacing .part (file locked)", tmp.stat().st_size if tmp.exists() else 0
        return True, sha256_file(dest), dest.stat().st_size
    except Exception as exc:  # noqa: BLE001
        try:
            if tmp.exists():
                tmp.unlink(missing_ok=True)
        except OSError:
            pass
        return False, f"{type(exc).__name__}: {exc}"[:200], 0


def extract(zip_path: Path, out_dir: Path) -> Path:
    if out_dir.exists() and any(out_dir.glob("*.shp")):
        return out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(out_dir)
    return out_dir


RE_YEAR = re.compile(r"[^0-9-]")


def aggregate(shp: Path, codigo: int, nombre: str) -> dict:
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    p = shp.as_posix()
    sql = f"""
    WITH b AS (SELECT * FROM ST_Read('{p}')),
    c AS (
      SELECT
        TRY_CAST(Ano_Constr AS INTEGER) AS y,
        geom
      FROM b
    ),
    s AS (
      SELECT
        y,
        CASE
          WHEN y IS NULL THEN 'UNKNOWN'
          WHEN y = 0 THEN 'UNKNOWN'
          WHEN y < {MIN_VALID_YEAR} OR y > {SNAPSHOT_YEAR} THEN 'SUSPICIOUS'
          ELSE 'VALID'
        END AS year_state,
        geom
      FROM c
    )
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE year_state = 'VALID') AS known,
      count(*) FILTER (WHERE year_state = 'UNKNOWN') AS unknown,
      count(*) FILTER (WHERE year_state = 'SUSPICIOUS') AS suspicious,
      min(y) FILTER (WHERE year_state = 'VALID') AS min_year,
      max(y) FILTER (WHERE year_state = 'VALID') AS max_year,
      count(*) FILTER (WHERE geom IS NULL) AS null_geom,
      count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)) AS invalid_geom,
      round(min(ST_Area(geom)), 2) AS area_min_m2,
      round(quantile_cont(ST_Area(geom), 0.50), 2) AS area_p50_m2,
      round(quantile_cont(ST_Area(geom), 0.95), 2) AS area_p95_m2,
      round(max(ST_Area(geom)), 2) AS area_max_m2
    FROM s
    """
    row = con.execute(sql).fetchone()
    cols = [d[0] for d in con.description]
    rec = dict(zip(cols, row))

    susp_values = con.execute(
        f"""
        SELECT CAST(y AS VARCHAR) AS v, count(*) AS n
        FROM (SELECT TRY_CAST(Ano_Constr AS INTEGER) AS y FROM ST_Read('{p}'))
        WHERE y IS NOT NULL AND y <> 0 AND (y < {MIN_VALID_YEAR} OR y > {SNAPSHOT_YEAR})
        GROUP BY 1 ORDER BY n DESC, v LIMIT 5
        """
    ).fetchall()
    heaping = con.execute(
        f"""
        SELECT CAST(y % 10 AS VARCHAR) AS d, count(*) AS n
        FROM (SELECT TRY_CAST(Ano_Constr AS INTEGER) AS y FROM ST_Read('{p}'))
        WHERE y BETWEEN {MIN_VALID_YEAR} AND {SNAPSHOT_YEAR}
        GROUP BY 1 ORDER BY 1
        """
    ).fetchall()
    con.close()

    total = rec["total"] or 0
    known = rec["known"] or 0
    heaping_total = sum(n for _, n in heaping) or 1
    rec.update(
        Codigo_Mun=codigo,
        Municipio=nombre,
        coverage_pct=round(100 * known / total, 2) if total else None,
        suspicious_values=dict(susp_values),
        heaping_mod10={str(d): n for d, n in heaping},
        heaping_05_pct=round(100 * (dict(heaping).get("0", 0) + dict(heaping).get("5", 0)) / heaping_total, 2),
    )
    return rec


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    datasets = json.loads(DATASETS.read_text(encoding="utf-8"))
    jobs = []
    for d in datasets:
        if not d.get("shp"):
            continue
        m = re.match(r"^(\d{3})_", Path(d["shp"]).name)
        if not m:
            print("  ! no codigo:", d["dataset"], d["shp"])
            continue
        cod = int(m.group(1))
        jobs.append((cod, d))
    jobs.sort()
    if args.limit:
        jobs = jobs[: args.limit]
    print(f"municipios a procesar: {len(jobs)}")

    RAW.mkdir(parents=True, exist_ok=True)
    INTERIM.mkdir(parents=True, exist_ok=True)
    download_meta = {}

    def fetch(job):
        cod, d = job
        dest = RAW / f"{cod:03d}.zip"
        try:
            ok, info, size = download(d["shp"], dest)
        except Exception as exc:  # noqa: BLE001
            ok, info, size = False, f"{type(exc).__name__}: {exc}"[:200], 0
        return cod, d, ok, info, size

    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        for cod, d, ok, info, size in ex.map(fetch, jobs):
            download_meta[cod] = {"ok": ok, "sha256_or_error": info, "bytes": size, "url": d["shp"]}
            if not ok:
                print(f"  FAIL {cod}: {info}")

    print("descarga completada; agregando...")
    results = []
    failures = []
    for cod, d in jobs:
        meta = download_meta[cod]
        if not meta["ok"]:
            failures.append({"Codigo_Mun": cod, "dataset": d["dataset"], "error": meta["sha256_or_error"]})
            continue
        try:
            ex = extract(RAW / f"{cod:03d}.zip", INTERIM / f"{cod:03d}")
            shp = next(ex.glob("*_Edificio.shp"))
            rec = aggregate(shp, cod, d["dataset"].removeprefix("parcelario-catastral-"))
            rec["dataset"] = d["dataset"]
            results.append(rec)
        except Exception as exc:  # noqa: BLE001
            failures.append({"Codigo_Mun": cod, "dataset": d["dataset"], "error": f"{type(exc).__name__}: {exc}"[:250]})
            print(f"  ERR {cod}: {exc}"[:200])

    results.sort(key=lambda r: r["Codigo_Mun"])
    OUTDIR.mkdir(parents=True, exist_ok=True)

    fields = [
        "Codigo_Mun", "Municipio", "total", "known", "unknown", "suspicious",
        "coverage_pct", "min_year", "max_year", "null_geom", "invalid_geom",
        "area_min_m2", "area_p50_m2", "area_p95_m2", "area_max_m2",
        "heaping_05_pct", "dataset",
    ]
    with (OUTDIR / "recon-bizkaia.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(results)

    (OUTDIR / "recon-bizkaia.json").write_text(
        json.dumps({"results": results, "downloads": download_meta, "failures": failures},
                   ensure_ascii=False, indent=1), encoding="utf-8")

    totals = sum(r["total"] for r in results)
    known = sum(r["known"] for r in results)
    covs = sorted(r["coverage_pct"] for r in results if r["coverage_pct"] is not None)
    summary = {
        "municipalities_expected": len(jobs),
        "municipalities_ok": len(results),
        "municipalities_failed": len(failures),
        "failures": failures,
        "total_buildings_sum": totals,
        "known_sum": known,
        "global_coverage_pct": round(100 * known / totals, 2) if totals else None,
        "coverage_pct_min": covs[0] if covs else None,
        "coverage_pct_p25": covs[len(covs) // 4] if covs else None,
        "coverage_pct_median": covs[len(covs) // 2] if covs else None,
        "coverage_pct_max": covs[-1] if covs else None,
        "coverage_below_90": sorted([(r["Codigo_Mun"], r["Municipio"], r["coverage_pct"]) for r in results
                                     if r["coverage_pct"] is not None and r["coverage_pct"] < 90]),
        "leioa": next((r for r in results if r["Codigo_Mun"] == 54), None),
        "min_valid_year": MIN_VALID_YEAR,
        "snapshot_year": SNAPSHOT_YEAR,
    }
    (OUTDIR / "recon-qa-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in
                      ["municipalities_ok", "municipalities_failed", "total_buildings_sum",
                       "global_coverage_pct", "coverage_pct_min", "coverage_pct_median",
                       "coverage_pct_max"]}, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
