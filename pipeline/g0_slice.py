"""G0 — vertical slice de datos para la muestra congelada.

Municipios: Bilbao (020), Leioa (054), Murueta (908).

Produce, por municipio:
  data/processed/g0/buildings_<cod>.parquet   (normalizado, geometría en EPSG:4326)
  data/processed/g0/buildings_<cod>.geojson   (para tippecanoe)
  evidence/g0/03-data/metrics_<cod>.json      (contratos C-01..C-12)
  evidence/g0/03-data/qa_<cod>.json           (QA de año y geometría)

Y combinados:
  data/processed/g0/buildings_all.geojson
  data/processed/g0/municipalities.geojson

Uso: python pipeline/g0_slice.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import compute_metrics, classify_year  # noqa: E402

INTERIM = ROOT / "data/interim/catastro"
PROC = ROOT / "data/processed/g0"
EVID = ROOT / "evidence/g0/03-data"

SAMPLE = {20: "bilbao", 54: "leioa", 908: "murueta"}
REPORT_YEARS = [1950, 1970, 1987, 2000, 2015]

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
    CAST(Codigo_Pol AS INTEGER) AS pol, CAST(Codigo_Par AS INTEGER) AS par,
    CAST(Codigo_Sub AS INTEGER) AS sub, CAST(Codigo_Edi AS INTEGER) AS edi,
    TRY_CAST(Ano_Rehabi AS INTEGER) AS ano_rehabi,
    TRY_CAST(Ano_Reform AS INTEGER) AS ano_reform,
    TRY_CAST(Ano_Calcul AS INTEGER) AS ano_calcul,
    geom AS geom25830
  FROM b
),
c AS (
  SELECT
    *,
    CASE
      WHEN year_raw IS NULL OR year_raw = 0 THEN 'UNKNOWN'
      WHEN year_raw < {miny} OR year_raw > {snap} THEN 'SUSPICIOUS'
      ELSE 'VALID'
    END AS year_state,
    ST_IsValid(geom25830) AS geom_valid,
    ST_Area(geom25830) AS area_raw_m2
  FROM n
)
SELECT
  codigo_mun, building_id, year_raw,
  CASE WHEN year_state = 'VALID' THEN year_raw END AS year,
  year_state, uso, alturas, pol, par, sub, edi,
  ano_rehabi, ano_reform, ano_calcul,
  geom_valid,
  CASE WHEN geom_valid THEN area_raw_m2 END AS footprint_area_m2,
  area_raw_m2 AS area_raw_invalid_included_m2,
  ST_Transform(geom25830, 'OGC:CRS84') AS geom
FROM c
"""


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""):
            h.update(ch)
    return h.hexdigest()


def build_municipality(con, cod: int, slug: str) -> dict:
    shp = next((INTERIM / f"{cod:03d}").glob("*_Edificio.shp"))
    con.execute(NORM_SQL.format(shp=shp.as_posix(), miny=1700, snap=2026))

    total = con.execute("SELECT count(*) FROM buildings").fetchone()[0]
    # integridad de la clasificación frente a la función pura de referencia
    rows = con.execute("SELECT year_raw, year_state FROM buildings").fetchall()
    mismatches = sum(1 for y, st in rows if classify_year(y)[1] != st)

    parquet = PROC / f"buildings_{cod:03d}.parquet"
    con.execute(f"COPY buildings TO '{parquet.as_posix()}' (FORMAT PARQUET)")

    gj = PROC / f"buildings_{cod:03d}.geojson"
    con.execute(f"""
      COPY (
        SELECT building_id, codigo_mun, year, year_state, uso, alturas,
               round(footprint_area_m2, 2) AS area_m2,
               ST_AsGeoJSON(geom) AS geojson
        FROM buildings
      ) TO '{gj.as_posix()}' (FORMAT CSV)
    """)
    # tippecanoe consume FeatureCollection: lo construimos con jq-like python
    write_featurecollection(con, cod, PROC / f"buildings_{cod:03d}.fc.geojson")

    metrics = {str(y): compute_metrics(con, "buildings", y) for y in REPORT_YEARS}
    metrics["_sample"] = {"codigo_mun": cod, "slug": slug, "total_rows": total}

    qa = {
        "codigo_mun": cod,
        "municipio": slug,
        "total_buildings": total,
        "classification_mismatches_vs_reference_fn": mismatches,
        "year_states": dict(con.execute(
            "SELECT year_state, count(*) FROM buildings GROUP BY 1 ORDER BY 1").fetchall()),
        "min_year": con.execute("SELECT min(year) FROM buildings").fetchone()[0],
        "max_year": con.execute("SELECT max(year) FROM buildings").fetchone()[0],
        "suspicious_values": dict(con.execute("""
            SELECT CAST(year_raw AS VARCHAR), count(*) FROM buildings
            WHERE year_state = 'SUSPICIOUS' GROUP BY 1 ORDER BY 2 DESC, 1""").fetchall()),
        "heaping_mod10": dict(con.execute("""
            SELECT CAST(year % 10 AS VARCHAR), count(*) FROM buildings
            WHERE year_state='VALID' GROUP BY 1 ORDER BY 1""").fetchall()),
        "geometry": {
            "invalid_geom": con.execute("SELECT count(*) FROM buildings WHERE NOT geom_valid").fetchone()[0],
            "null_geom": con.execute("SELECT count(*) FROM buildings WHERE geom IS NULL").fetchone()[0],
            "area_min_m2": con.execute("SELECT round(min(footprint_area_m2),2) FROM buildings").fetchone()[0],
            "area_p50_m2": con.execute("SELECT round(quantile_cont(footprint_area_m2,0.5),2) FROM buildings").fetchone()[0],
            "area_p95_m2": con.execute("SELECT round(quantile_cont(footprint_area_m2,0.95),2) FROM buildings").fetchone()[0],
            "area_max_m2": con.execute("SELECT round(max(footprint_area_m2),2) FROM buildings").fetchone()[0],
        },
        "aux_fields": {
            "ano_rehabi_nonzero": con.execute("SELECT count(*) FROM buildings WHERE COALESCE(ano_rehabi,0) <> 0").fetchone()[0],
            "ano_reform_nonzero": con.execute("SELECT count(*) FROM buildings WHERE COALESCE(ano_reform,0) <> 0").fetchone()[0],
            "ano_calcul_nonzero": con.execute("SELECT count(*) FROM buildings WHERE COALESCE(ano_calcul,0) <> 0").fetchone()[0],
            "ano_calcul_forbidden_as_metric": True,
        },
        "bbox_crs84": con.execute(
            "SELECT min(ST_XMin(geom)), min(ST_YMin(geom)), max(ST_XMax(geom)), max(ST_YMax(geom)) FROM buildings").fetchone(),
    }
    (EVID / f"metrics_{cod:03d}.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=1), encoding="utf-8")
    (EVID / f"qa_{cod:03d}.json").write_text(json.dumps(qa, ensure_ascii=False, indent=1), encoding="utf-8")
    (EVID / f"buildings_{cod:03d}.parquet.sha256").write_text(
        sha256_file(parquet) + f"  buildings_{cod:03d}.parquet\n", encoding="utf-8")
    return qa


def write_featurecollection(con, cod: int, out: Path) -> None:
    feats = con.execute("""
        SELECT building_id, codigo_mun, year, year_state, uso, alturas, footprint_area_m2,
               ST_AsGeoJSON(geom) AS gj
        FROM buildings WHERE geom IS NOT NULL
    """).fetchall()
    parts = []
    for bid, mun, year, state, uso, alt, area, gj in feats:
        props = {"id": bid, "mun": mun, "state": state}
        if year is not None:
            props["year"] = int(year)
        if uso:
            props["uso"] = uso
        if alt is not None:
            props["alturas"] = int(alt)
        if area is not None:
            props["area_m2"] = round(float(area), 2)
        parts.append('{"type":"Feature","properties":%s,"geometry":%s}' %
                     (json.dumps(props, ensure_ascii=False), gj))
    out.write_text('{"type":"FeatureCollection","features":[' + ",".join(parts) + "]}", encoding="utf-8")


def build_municipalities(con) -> None:
    parts = []
    for cod in SAMPLE:
        shp = next((INTERIM / f"{cod:03d}").glob("*_Municipio.shp"))
        rows = con.execute(f"""
            SELECT CAST(Codigo_Mun AS INTEGER) AS cod, Descripcio AS nombre,
                   ST_AsGeoJSON(ST_Transform(geom,'OGC:CRS84')) AS gj
            FROM ST_Read('{shp.as_posix()}')
        """).fetchall()
        for codigo, nombre, gj in rows:
            parts.append('{"type":"Feature","properties":{"cod":%d,"name":%s},"geometry":%s}' %
                         (codigo, json.dumps(nombre, ensure_ascii=False), gj))
    (PROC / "municipalities.geojson").write_text(
        '{"type":"FeatureCollection","features":[' + ",".join(parts) + "]}", encoding="utf-8")


def build_combined() -> None:
    feats = []
    for cod in SAMPLE:
        p = PROC / f"buildings_{cod:03d}.fc.geojson"
        t = json.loads(p.read_text(encoding="utf-8"))
        feats.extend(t["features"])
    out = PROC / "buildings_all.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False),
                   encoding="utf-8")


def main() -> int:
    PROC.mkdir(parents=True, exist_ok=True)
    EVID.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    summary = {}
    for cod, slug in SAMPLE.items():
        qa = build_municipality(con, cod, slug)
        summary[str(cod)] = {k: qa[k] for k in
                             ["municipio", "total_buildings", "year_states", "min_year", "max_year",
                              "classification_mismatches_vs_reference_fn", "geometry"]}
        print(f"  {cod:>3} {slug:<9} total={qa['total_buildings']:>6} states={qa['year_states']} "
              f"invalid_geom={qa['geometry']['invalid_geom']}")
    build_municipalities(con)
    build_combined()
    (EVID / "slice-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
