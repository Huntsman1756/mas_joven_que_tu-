"""G1 — build completo de datos para toda Bizkaia (112 municipios con ZIP).

Entrada: data/interim/catastro/<cod>/  (descomprimido por g0_recon.py)

Produce:
  data/processed/g1/buildings/<cod>.parquet        normalizado (OGC:CRS84)
  data/processed/g1/geojson/buildings/<cod>.geojson features para tippecanoe
  data/processed/g1/geojson/cells.geojson          celdas 500 m de toda Bizkaia
  data/processed/g1/geojson/municipalities.geojson límites + agregados
  data/processed/g1/geojson/municipalities-light.geojson  (PIP en cliente + contorno del seleccionado)
  app/static/data/metrics/<slug>.json              agregados canónicos C-01..C-10
  app/static/data/municipalities.json              índice de municipios (slug/cod/bbox)
  app/static/data/catalog.json                     campañas de ortofoto (C-11)
  evidence/g1/03-data/qa-all.json                  QA consolidado por municipio
  evidence/g1/03-data/geometry-repairs.json        registro de reparaciones
  evidence/g1/03-data/slice-summary.json           resumen + hashes de salidas

Contratos: DATA_SEMANTICS.md §11 (C-01..C-12). Política de anomalías: §5.
Uso: python pipeline/g1_buildings.py [--limit N] [--only 20,54]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import (  # noqa: E402
    CAMPAIGNS,
    MIN_VALID_YEAR,
    SNAPSHOT_YEAR,
    SQL_DOMINANT_DECADE,
    classify_year,
)

INTERIM = ROOT / "data/interim/catastro"
PROC = ROOT / "data/processed/g1"
GJ = PROC / "geojson"
OUT_STATIC = ROOT / "app/static/data"
EVID = ROOT / "evidence/g1/03-data"

CELL_SIZE_M = 500
NORA_MUNI_URL = "https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/municipios?provinciaId=48"
UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu G1)"}

# --------------------------------------------------------------------------- #
# Normalización de la capa Edificio (misma lógica que g0_slice.py)
# --------------------------------------------------------------------------- #
NORM_SQL = """
CREATE OR REPLACE TABLE buildings AS
WITH b AS (
  SELECT * FROM ST_Read('{shp}')
),
n AS (
  SELECT
    CAST(Codigo_Mun AS INTEGER) AS codigo_mun,
    CAST(Codigo_Mun AS VARCHAR) || '-' || CAST(Codigo_Pol AS VARCHAR) || '-' ||
      CAST(Codigo_Par AS VARCHAR) || '-' || CAST(Codigo_Sub AS VARCHAR) || '-' ||
      CAST(Codigo_Edi AS VARCHAR) AS building_id,
    TRY_CAST(Ano_Constr AS INTEGER) AS year_raw,
    UPPER(TRIM(COALESCE(Codigo_Uso, ''))) AS uso,
    TRY_CAST(Numero_Alt AS INTEGER) AS alturas,
    TRY_CAST(Numero_Viv AS INTEGER) AS viviendas,
    TRY_CAST(Ano_Rehabi AS INTEGER) AS ano_rehabi,
    TRY_CAST(Ano_Reform AS INTEGER) AS ano_reform,
    TRY_CAST(Ano_Calcul AS INTEGER) AS ano_calcul,
    geom AS geom_src
  FROM b
),
validity AS (
  SELECT
    *,
    ST_IsValid(geom_src) AS geom_valid_original,
    md5(ST_AsWKB(geom_src)) AS geom_original_md5
  FROM n
),
repaired AS (
  SELECT
    *,
    CASE WHEN geom_valid_original THEN geom_src ELSE ST_MakeValid(geom_src) END AS geom_final,
    CASE WHEN geom_valid_original THEN NULL ELSE ST_IsValid(ST_MakeValid(geom_src)) END AS geom_valid_after_repair
  FROM validity
),
c AS (
  SELECT
    *,
    CASE
      WHEN year_raw IS NULL OR year_raw = 0 THEN 'UNKNOWN'
      WHEN year_raw < {miny} OR year_raw > {snap} THEN 'SUSPICIOUS'
      ELSE 'VALID'
    END AS year_state,
    (geom_valid_original OR COALESCE(geom_valid_after_repair, false)) AS geom_valid,
    (NOT geom_valid_original AND COALESCE(geom_valid_after_repair, false)) AS geom_repaired,
    ST_Area(geom_src) AS area_raw_m2,
    ST_Area(geom_final) AS footprint_area_m2
  FROM repaired
)
SELECT
  codigo_mun, building_id, year_raw,
  CASE WHEN year_state = 'VALID' THEN year_raw END AS year,
  year_state, uso, alturas, viviendas,
  ano_rehabi, ano_reform, ano_calcul,
  geom_valid_original, geom_valid, geom_repaired,
  CASE WHEN geom_valid_original THEN NULL ELSE 'ST_IsValid = false (reason unavailable in DuckDB spatial 1.5.5)' END AS geom_invalid_reason,
  geom_original_md5,
  area_raw_m2, footprint_area_m2,
  CAST(floor(ST_X(ST_Centroid(geom_final)) / {cell}) AS INTEGER) AS cell_x,
  CAST(floor(ST_Y(ST_Centroid(geom_final)) / {cell}) AS INTEGER) AS cell_y,
  ST_Transform(geom_final, 'OGC:CRS84') AS geom
FROM c
"""


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""):
            h.update(ch)
    return h.hexdigest()


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


def fetch_nora_municipalities() -> dict[int, dict]:
    """Nombres oficiales y centroides desde NORA (complementario). Fallback: Descripcio."""
    try:
        r = requests.get(NORA_MUNI_URL, headers=UA, timeout=60, verify=False)
        r.raise_for_status()
        r.encoding = r.apparent_encoding or "latin-1"
        data = r.json()
        out = {}
        for m in data:
            cod = int(m["id"])
            out[cod] = {
                "name": m.get("descripcionOficial") or "",
                "lat": float(m["latETRS89"]) if m.get("latETRS89") else None,
                "lon": float(m["lonETRS89"]) if m.get("lonETRS89") else None,
            }
        EVID.mkdir(parents=True, exist_ok=True)
        (EVID / "nora-municipios.json").write_text(
            json.dumps({"retrieved_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "url": NORA_MUNI_URL, "count": len(data)},
                       ensure_ascii=False, indent=1),
            encoding="utf-8")
        return out
    except Exception as exc:  # noqa: BLE001
        print(f"  ! NORA no disponible ({exc}); se usará Descripcio de Catastro")
        return {}


def titleize(name: str) -> str:
    small = {"de", "del", "la", "las", "los", "y", "e", "en", "el", "o"}
    words = []
    for i, w in enumerate(name.lower().split()):
        words.append(w if (i > 0 and w in small) else w.capitalize())
    return " ".join(words)


def write_featurecollection(con, out: Path, sql: str) -> int:
    rows = con.execute(sql).fetchall()
    parts = []
    for fid, gj, props in rows:
        p = props if isinstance(props, str) else json.dumps(props, ensure_ascii=False, separators=(",", ":"))
        head = f'{{"type":"Feature","id":{fid},' if fid is not None else '{"type":"Feature",'
        parts.append(head + f'"properties":{p},"geometry":{gj}}}')
    out.write_text('{"type":"FeatureCollection","features":[' + ",".join(parts) + "]}",
                   encoding="utf-8")
    return len(rows)


def sparse_years(con, group_cols: str, table: str = "all_buildings") -> dict:
    """Devuelve {key: 'y:c,y:c,...'} con conteos por año VALID, ordenado."""
    rows = con.execute(f"""
        SELECT {group_cols}, year, count(*) AS n
        FROM {table}
        WHERE year_state='VALID' AND year IS NOT NULL
        GROUP BY {group_cols}, year ORDER BY {group_cols}, year
    """).fetchall()
    ncol = len(group_cols.split(","))
    out: dict[tuple, list[str]] = {}
    for *key, y, n in rows:
        out.setdefault(tuple(key), []).append(f"{y}:{n}")
    return {k: ",".join(v) for k, v in out.items()}


def municipality_dirs(only: set[int] | None) -> list[int]:
    cods = sorted(int(d.name) for d in INTERIM.iterdir()
                  if d.is_dir() and any(d.glob("*_Edificio.shp")))
    if only:
        cods = [c for c in cods if c in only]
    return cods


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", type=str, default="")
    args = ap.parse_args()
    only = {int(x) for x in args.only.split(",") if x} or None

    for d in (PROC / "buildings", GJ / "buildings", OUT_STATIC / "metrics", EVID):
        d.mkdir(parents=True, exist_ok=True)

    nora = fetch_nora_municipalities()

    cods = municipality_dirs(only)
    if args.limit:
        cods = cods[: args.limit]
    print(f"municipios: {len(cods)}")

    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")

    repairs_registry: list[dict] = []
    qa_all: list[dict] = []
    catalog_index: list[dict] = []
    slugs: dict[str, int] = {}

    for i, cod in enumerate(cods):
        mdir = INTERIM / f"{cod:03d}"
        shp = next(mdir.glob("*_Edificio.shp"))
        con.execute(NORM_SQL.format(shp=shp.as_posix(), miny=MIN_VALID_YEAR,
                                    snap=SNAPSHOT_YEAR, cell=CELL_SIZE_M))

        # nombre oficial: NORA > Descripcio de la capa Municipio
        descr = None
        mshp = list(mdir.glob("*_Municipio.shp"))
        if mshp:
            descr = con.execute(
                f"SELECT Descripcio FROM ST_Read('{mshp[0].as_posix()}') LIMIT 1").fetchone()
            descr = descr[0] if descr else None
        name = (nora.get(cod) or {}).get("name") or (titleize(descr) if descr else f"Municipio {cod:03d}")
        slug = slugify(name)
        if slug in slugs and slugs[slug] != cod:
            slug = f"{slug}-{cod:03d}"
        slugs[slug] = cod

        # coherencia de la clasificación con la función de referencia
        rows = con.execute("SELECT year_raw, year_state FROM buildings").fetchall()
        mismatches = sum(1 for y, st in rows if classify_year(y)[1] != st)

        con.execute("CREATE TABLE IF NOT EXISTS all_buildings AS SELECT * FROM buildings WHERE false")
        con.execute("INSERT INTO all_buildings SELECT * FROM buildings")

        parquet = PROC / "buildings" / f"{cod:03d}.parquet"
        con.execute(f"COPY buildings TO '{parquet.as_posix()}' (FORMAT PARQUET)")

        n_feat = write_featurecollection(con, GJ / "buildings" / f"{cod:03d}.geojson", """
            SELECT NULL AS fid, ST_AsGeoJSON(geom) AS gj,
                   json_object(
                     'id', building_id, 'mun', codigo_mun, 'state', year_state,
                     'year', year, 'uso', uso, 'alturas', alturas, 'viv', viviendas,
                     'area_m2', round(footprint_area_m2, 2)
                   ) AS props
            FROM buildings WHERE geom IS NOT NULL ORDER BY building_id
        """)

        rep = con.execute("""
            SELECT building_id, geom_invalid_reason, geom_valid_original, geom_valid,
                   geom_repaired, round(area_raw_m2,2), round(footprint_area_m2,2), geom_original_md5
            FROM buildings WHERE NOT geom_valid_original
        """).fetchall()
        for bid, reason, bv, av, repaired, area_raw, area_final, md5 in rep:
            repairs_registry.append({
                "municipality": name, "codigo_mun": cod, "building_id": bid,
                "invalid_reason": reason, "was_valid": bv, "repaired": repaired,
                "valid_after_repair": av, "original_geometry_md5": md5,
                "area_raw_m2": area_raw, "area_after_repair_m2": area_final,
                "operation": "ST_MakeValid",
            })

        # agregados canónicos del municipio
        const = con.execute("""
            SELECT
              count(*) AS c01,
              count(*) FILTER (WHERE year_state='VALID') AS c02,
              count(*) FILTER (WHERE year_state='UNKNOWN') AS c_unknown,
              count(*) FILTER (WHERE year_state='SUSPICIOUS') AS c_suspicious,
              count(*) FILTER (WHERE year_state='INVALID') AS c_invalid,
              count(*) FILTER (WHERE NOT geom_valid) AS invalid_geom,
              round(100.0 * count(*) FILTER (WHERE year_state='VALID') / count(*), 2) AS coverage_pct,
              round(sum(footprint_area_m2) FILTER (WHERE year_state='VALID' AND geom_valid), 2) AS c06,
              min(year) FILTER (WHERE year_state='VALID') AS min_year,
              max(year) FILTER (WHERE year_state='VALID') AS max_year
            FROM buildings
        """).fetchone()
        ccols = ["c01", "c02", "unknown", "suspicious", "invalid", "invalid_geom",
                 "coverage_pct", "c06", "min_year", "max_year"]
        constants = dict(zip(ccols, const))

        dist = con.execute("""
            SELECT year, count(*) AS n FROM buildings
            WHERE year_state='VALID' AND year IS NOT NULL GROUP BY year ORDER BY year
        """).fetchall()
        running_b, running_a = 0, 0.0
        cum = []
        for y, n, a in con.execute("""
            SELECT year, count(*), round(sum(footprint_area_m2) FILTER (WHERE geom_valid), 2)
            FROM buildings WHERE year_state='VALID' AND year IS NOT NULL
            GROUP BY year ORDER BY year
        """).fetchall():
            running_b += n
            running_a += a or 0.0
            cum.append({"y": int(y), "cum_buildings": running_b,
                        "cum_footprint_area": round(running_a, 2)})

        heap = con.execute("""
            SELECT 100.0 * count(*) FILTER (WHERE year % 10 IN (0,5)) / count(*)
            FROM buildings WHERE year_state='VALID'
        """).fetchone()[0]
        constants["heaping_05_pct"] = round(heap, 1) if heap is not None else None

        # buckets canónicos de la vista (§14): <1900 · décadas 1900s-2020s · SIN AÑO
        decades = [{"bucket": "pre1900",
                    "n": sum(n for y, n in dist if y < 1900)}]
        for dec in range(1900, 2030, 10):
            decades.append({"bucket": f"{dec}s",
                            "n": sum(n for y, n in dist if dec <= y <= dec + 9)})
        no_year = constants["c01"] - constants["c02"]

        # bbox/centro del municipio para el índice
        bbox = con.execute("""
            SELECT round(min(ST_XMin(geom)),5), round(min(ST_YMin(geom)),5),
                   round(max(ST_XMax(geom)),5), round(max(ST_YMax(geom)),5),
                   round(ST_X(ST_Centroid(ST_Envelope(ST_Union_Agg(geom)))),5),
                   round(ST_Y(ST_Centroid(ST_Envelope(ST_Union_Agg(geom)))),5)
            FROM buildings WHERE geom IS NOT NULL
        """).fetchone()

        metrics_payload = {
            "municipality": {"codigo_mun": cod, "slug": slug, "name": name},
            "snapshot_year": SNAPSHOT_YEAR,
            "contracts_version": "DATA_SEMANTICS.md §11",
            "constants": constants,
            "cum": cum,
            "dist": [{"y": int(y), "n": int(n)} for y, n in dist],
            "decades": decades,
            "no_year_count": no_year,
        }
        mpath = OUT_STATIC / "metrics" / f"{slug}.json"
        mpath.write_text(json.dumps(metrics_payload, ensure_ascii=False, separators=(",", ":")),
                         encoding="utf-8")

        nora_c = nora.get(cod) or {}
        catalog_index.append({
            "slug": slug, "cod": cod, "name": name,
            "lon": nora_c.get("lon") or bbox[4],
            "lat": nora_c.get("lat") or bbox[5],
            "bbox": [bbox[0], bbox[1], bbox[2], bbox[3]],
            "buildings": constants["c01"],
        })

        qa_all.append({
            "codigo_mun": cod, "slug": slug, "name": name,
            "total_buildings": constants["c01"],
            "year_states": dict(con.execute(
                "SELECT year_state, count(*) FROM buildings GROUP BY 1 ORDER BY 1").fetchall()),
            "coverage_pct": constants["coverage_pct"],
            "min_year": constants["min_year"], "max_year": constants["max_year"],
            "classification_mismatches_vs_reference_fn": mismatches,
            "geometry": {
                "invalid_original": con.execute(
                    "SELECT count(*) FROM buildings WHERE NOT geom_valid_original").fetchone()[0],
                "repaired_ok": con.execute(
                    "SELECT count(*) FROM buildings WHERE geom_repaired").fetchone()[0],
                "invalid_after_repair": con.execute(
                    "SELECT count(*) FROM buildings WHERE NOT geom_valid").fetchone()[0],
            },
            "features": n_feat,
        })
        print(f"  [{i+1:>3}/{len(cods)}] {cod:>3} {name:<34} total={constants['c01']:>6} "
              f"cov={constants['coverage_pct']}%")

    # ----------------------------------------------------------------- #
    # Celdas 500 m — toda Bizkaia, con conteos por año embebidos (`ys`)
    # ----------------------------------------------------------------- #
    print("agregando celdas de toda Bizkaia...")
    con.execute(f"""
    CREATE OR REPLACE TABLE cells AS
    WITH base AS (
      SELECT codigo_mun, cell_x, cell_y, year_state, year, footprint_area_m2, geom_valid
      FROM all_buildings WHERE geom IS NOT NULL
    ),
    dec AS (
      SELECT codigo_mun, cell_x, cell_y, CAST((year//10)*10 AS INTEGER) AS decade, count(*) AS n
      FROM base WHERE year_state='VALID' GROUP BY 1,2,3,4
    ),
    dom AS ({SQL_DOMINANT_DECADE.format(keys='codigo_mun, cell_x, cell_y', src='dec')}),
    ys AS (
      SELECT codigo_mun, cell_x, cell_y,
             string_agg(CAST(year AS VARCHAR) || ':' || CAST(n AS VARCHAR), ',' ORDER BY year) AS ys
      FROM (SELECT codigo_mun, cell_x, cell_y, year, count(*) AS n
            FROM base WHERE year_state='VALID' GROUP BY 1,2,3,4) t
      GROUP BY 1,2,3
    ),
    -- `ya`: huella por año en m² enteros (universo C-06: VALID + geom_valid) para
    -- C-08 en tooltip; la cuota no cambia con decimales y cada caracter pesa en tesela
    ya AS (
      SELECT codigo_mun, cell_x, cell_y,
             string_agg(CAST(year AS VARCHAR) || ':' || CAST(round(a) AS BIGINT), ',' ORDER BY year) AS ya
      FROM (SELECT codigo_mun, cell_x, cell_y, year, sum(footprint_area_m2) AS a
            FROM base WHERE year_state='VALID' AND geom_valid GROUP BY 1,2,3,4) t
      GROUP BY 1,2,3
    ),
    agg AS (
      SELECT codigo_mun, cell_x, cell_y,
        count(*) AS n_total,
        count(*) FILTER (WHERE year_state='VALID') AS n_known,
        count(*) FILTER (WHERE year_state<>'VALID') AS n_no_year,
        count(*) FILTER (WHERE year_state='SUSPICIOUS') AS n_suspicious,
        count(*) FILTER (WHERE year_state='INVALID') AS n_invalid,
        round(sum(footprint_area_m2) FILTER (WHERE geom_valid), 2) AS area_m2
      FROM base GROUP BY 1,2,3
    )
    SELECT row_number() OVER (ORDER BY a.codigo_mun, a.cell_x, a.cell_y) AS fid,
           a.*, d.dominant_decade, y.ys, ya2.ya,
           CASE WHEN a.n_total>0 THEN round(100.0*a.n_known/a.n_total,2) END AS coverage_pct
    FROM agg a
    LEFT JOIN dom d USING (codigo_mun, cell_x, cell_y)
    LEFT JOIN ys  y USING (codigo_mun, cell_x, cell_y)
    LEFT JOIN ya ya2 USING (codigo_mun, cell_x, cell_y)
    """)
    n_cells = con.execute("SELECT count(*) FROM cells").fetchone()[0]

    c = CELL_SIZE_M
    # Las series por año (`ys`/`ya`) no viajan en la tesela: son ~600 B/celda y
    # dominaban la transferencia de RESULT (PERF5). Se publican como JSON por
    # municipio en app/static/data/cells/<cod>.json y el cliente las resuelve
    # por `fid` (+`mun` para carga perezosa de municipios vecinos).
    write_featurecollection(con, GJ / "cells.geojson", f"""
        SELECT fid, ST_AsGeoJSON(ST_Transform(
                 ST_SetCRS(ST_MakeEnvelope(cell_x*{c}, cell_y*{c}, (cell_x+1)*{c}, (cell_y+1)*{c}), 'EPSG:25830'),
                 'OGC:CRS84')) AS gj,
               json_object(
                 'fid', fid, 'mun', codigo_mun, 'n', n_total, 'known', n_known,
                 'noyear', n_no_year, 'suspicious', n_suspicious, 'invalid', n_invalid,
                 'cov', coverage_pct, 'decade', dominant_decade, 'area_m2', area_m2
               ) AS props
        FROM cells ORDER BY fid
    """)

    cells_json_dir = OUT_STATIC / "cells"
    cells_json_dir.mkdir(parents=True, exist_ok=True)
    for old in cells_json_dir.glob("*.json"):
        old.unlink()
    for cod, in con.execute("SELECT DISTINCT codigo_mun FROM cells ORDER BY 1").fetchall():
        rows = con.execute(
            "SELECT fid, ys, ya FROM cells WHERE codigo_mun = ? ORDER BY fid", [cod]
        ).fetchall()
        payload = {str(fid): [ys, ya] for fid, ys, ya in rows}
        (cells_json_dir / f"{cod:03d}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")

    # ----------------------------------------------------------------- #
    # Municipios: geometría + agregados (para coropleta a z<9)
    # ----------------------------------------------------------------- #
    print("agregando municipios...")
    con.execute(f"""
    CREATE OR REPLACE TABLE munis AS
    WITH agg AS (
      SELECT codigo_mun,
        count(*) AS n_total,
        count(*) FILTER (WHERE year_state='VALID') AS n_known,
        count(*) FILTER (WHERE year_state<>'VALID') AS n_no_year
      FROM all_buildings GROUP BY 1
    ),
    dec AS (
      SELECT codigo_mun, CAST((year//10)*10 AS INTEGER) AS decade, count(*) AS n
      FROM all_buildings WHERE year_state='VALID' GROUP BY 1,2
    ),
    dom AS ({SQL_DOMINANT_DECADE.format(keys='codigo_mun', src='dec')}),
    ys AS (
      SELECT codigo_mun,
             string_agg(CAST(year AS VARCHAR) || ':' || CAST(n AS VARCHAR), ',' ORDER BY year) AS ys
      FROM (SELECT codigo_mun, year, count(*) AS n
            FROM all_buildings WHERE year_state='VALID' GROUP BY 1,2) t
      GROUP BY 1
    )
    SELECT row_number() OVER (ORDER BY a.codigo_mun) AS fid,
           a.codigo_mun, a.n_total, a.n_known, a.n_no_year, d.dominant_decade, y.ys
    FROM agg a LEFT JOIN dom d USING (codigo_mun) LEFT JOIN ys y USING (codigo_mun)
    """)

    # geometría municipal desde la capa Municipio de cada ZIP (misma fuente)
    muni_geoms = {}
    for cod in cods:
        mdir = INTERIM / f"{cod:03d}"
        mshp = list(mdir.glob("*_Municipio.shp"))
        if not mshp:
            continue
        gj = con.execute(f"""
            SELECT ST_AsGeoJSON(ST_Transform(ST_Union_Agg(geom), 'OGC:CRS84'))
            FROM ST_Read('{mshp[0].as_posix()}')
        """).fetchone()[0]
        if gj:
            muni_geoms[cod] = gj

    idx_by_cod = {m["cod"]: m for m in catalog_index}
    feats = []
    for fid, cod, n_total, n_known, n_no_year, dec, ys in con.execute(
            "SELECT fid, codigo_mun, n_total, n_known, n_no_year, dominant_decade, ys FROM munis ORDER BY fid").fetchall():
        gj = muni_geoms.get(cod)
        if not gj:
            continue
        props = {"fid": fid, "cod": cod, "slug": idx_by_cod[cod]["slug"],
                 "name": idx_by_cod[cod]["name"], "n": n_total, "known": n_known,
                 "noyear": n_no_year, "decade": dec, "ys": ys}
        feats.append('{"type":"Feature","id":%d,"properties":%s,"geometry":%s}' %
                     (fid, json.dumps(props, ensure_ascii=False, separators=(",", ":")), gj))
    (GJ / "municipalities.geojson").write_text(
        '{"type":"FeatureCollection","features":[' + ",".join(feats) + "]}",
        encoding="utf-8")

    # versión simplificada para point-in-polygon en el cliente
    light = []
    for cod in cods:
        mdir = INTERIM / f"{cod:03d}"
        mshp = list(mdir.glob("*_Municipio.shp"))
        if not mshp:
            continue
        gj = con.execute(f"""
            SELECT ST_AsGeoJSON(ST_Transform(
              ST_SimplifyPreserveTopology(ST_Union_Agg(geom), 80), 'OGC:CRS84'))
            FROM ST_Read('{mshp[0].as_posix()}')
        """).fetchone()[0]
        if gj:
            props = json.dumps({"cod": cod, "slug": idx_by_cod[cod]["slug"],
                                "name": idx_by_cod[cod]["name"]},
                               ensure_ascii=False, separators=(",", ":"))
            light.append(f'{{"type":"Feature","properties":{props},"geometry":{gj}}}')
    (OUT_STATIC / "municipalities-light.geojson").write_text(
        '{"type":"FeatureCollection","features":[' + ",".join(light) + "]}",
        encoding="utf-8")

    # ----------------------------------------------------------------- #
    # Índice de municipios + catálogo de campañas
    # ----------------------------------------------------------------- #
    catalog_index.sort(key=lambda m: m["name"])
    (OUT_STATIC / "municipalities.json").write_text(
        json.dumps({"generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "snapshot_year": SNAPSHOT_YEAR,
                    "municipalities": catalog_index},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")

    (OUT_STATIC / "catalog.json").write_text(json.dumps({
        "snapshot_year": SNAPSHOT_YEAR,
        "campaigns": [
            {"year": c.year, "source": c.source, "nominal_year": c.nominal_year,
             "flight_range": c.flight_range, "verified_image": c.verified_image}
            for c in CAMPAIGNS
        ],
        "provenance": {
            "primary": "Open Data Bizkaia — Diputación Foral de Bizkaia (CC BY 4.0)",
            "complementary": "geoEuskadi — Gobierno Vasco (CC BY 4.0)",
        },
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    # ----------------------------------------------------------------- #
    # Evidencia
    # ----------------------------------------------------------------- #
    outputs = sorted((OUT_STATIC / "metrics").glob("*.json"))
    summary = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "municipalities": len(catalog_index),
        "cells_500m": n_cells,
        "total_buildings": sum(m["buildings"] for m in catalog_index),
        "repairs_registered": len(repairs_registry),
        "invalid_after_repair": sum(q["geometry"]["invalid_after_repair"] for q in qa_all),
        "classification_mismatches": sum(q["classification_mismatches_vs_reference_fn"] for q in qa_all),
        "metrics_files": len(outputs),
        "min_valid_year": MIN_VALID_YEAR,
        "snapshot_year": SNAPSHOT_YEAR,
        "outputs_sha256": {p.name: sha256_file(p) for p in
                           [GJ / "cells.geojson", GJ / "municipalities.geojson",
                            OUT_STATIC / "municipalities.json", OUT_STATIC / "catalog.json",
                            OUT_STATIC / "municipalities-light.geojson"]},
    }
    (EVID / "qa-all.json").write_text(json.dumps(qa_all, ensure_ascii=False, indent=1), encoding="utf-8")
    (EVID / "geometry-repairs.json").write_text(json.dumps({
        "generated_at_utc": summary["generated_at_utc"],
        "policy": "DATA_SEMANTICS.md §5.2 — ninguna reparación silenciosa",
        "repairs": repairs_registry}, ensure_ascii=False, indent=1), encoding="utf-8")
    (EVID / "slice-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1),
                                             encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
