"""G0 — agregados canónicos por año para el frontend.

Produce, por municipio, un JSON con:
  - constantes del contrato (C-01, C-02, C-03, cobertura, C-06, anomalías);
  - una curva acumulada `cum` (año -> edificios y huella acumulados hasta ese año)
    que permite al frontend LEER C-04..C-08 sin recalcular denominadores.

Salida: app/static/data/metrics_<cod>.json
Uso: python pipeline/g0_aggregates.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import CAMPAIGNS  # noqa: E402

PROC = ROOT / "data/processed/g0"
OUT = ROOT / "app/static/data"
SAMPLE = {20: "Bilbao", 54: "Leioa", 908: "Murueta"}
SNAPSHOT_YEAR = 2026


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    generated = []
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")

    campaigns = [
        {"year": c.year, "source": c.source, "nominal_year": c.nominal_year,
         "flight_range": c.flight_range, "verified_image": c.verified_image}
        for c in CAMPAIGNS
    ]

    for cod, name in SAMPLE.items():
        parquet = (PROC / f"buildings_{cod:03d}.parquet").as_posix()
        con.execute(f"CREATE OR REPLACE VIEW b AS SELECT * FROM read_parquet('{parquet}')")

        const = con.execute("""
            SELECT
              count(*) AS c01,
              count(*) FILTER (WHERE year_state='VALID') AS c02,
              count(*) FILTER (WHERE year_state='UNKNOWN') AS c03_unknown_year_count,
              count(*) FILTER (WHERE year_state='SUSPICIOUS') AS suspicious,
              count(*) FILTER (WHERE NOT geom_valid) AS invalid_geom,
              round(100.0 * count(*) FILTER (WHERE year_state='VALID') / count(*), 2) AS coverage_pct,
              round(sum(footprint_area_m2) FILTER (WHERE year_state='VALID' AND geom_valid), 2) AS c06_footprint_area_known_year,
              min(year) FILTER (WHERE year_state='VALID') AS min_year,
              max(year) FILTER (WHERE year_state='VALID') AS max_year
            FROM b
        """).fetchone()
        cols = ["c01", "c02", "c03_unknown_year_count", "suspicious", "invalid_geom",
                "coverage_pct", "c06_footprint_area_known_year", "min_year", "max_year"]
        constants = dict(zip(cols, const))

        cum = con.execute("""
            SELECT year,
                   count(*) AS cum_buildings,
                   round(sum(footprint_area_m2), 2) AS cum_footprint_area
            FROM b
            WHERE year_state='VALID' AND year IS NOT NULL AND geom_valid
            GROUP BY year ORDER BY year
        """).fetchall()
        # acumulado real (running total)
        running_b = 0
        running_a = 0.0
        curve = []
        for y, n, a in cum:
            running_b += n
            running_a += (a or 0.0)
            curve.append({"y": int(y), "cum_buildings": running_b, "cum_footprint_area": round(running_a, 2)})

        payload = {
            "municipality": {"codigo_mun": cod, "name": name},
            "snapshot_year": SNAPSHOT_YEAR,
            "contracts_version": "DATA_SEMANTICS.md §11",
            "constants": constants,
            "cum": curve,
            "campaigns": campaigns,
        }
        out = OUT / f"metrics_{cod:03d}.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        generated.append({"file": out.name, "bytes": out.stat().st_size,
                          "c02": constants["c02"], "coverage_pct": constants["coverage_pct"],
                          "curve_points": len(curve)})
        print(f"  {cod:>3} {name:<8} c02={constants['c02']:>6} coverage={constants['coverage_pct']}% "
              f"curve={len(curve)} -> {out.name} ({out.stat().st_size/1024:.1f} KB)")

    (ROOT / "evidence/g0/06-frontend/aggregates-generated.json").write_text(
        json.dumps(generated, ensure_ascii=False, indent=1), encoding="utf-8")
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
