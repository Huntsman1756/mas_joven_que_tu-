"""Contratos de métricas — implementación canónica (DATA_SEMANTICS.md §11).

Reglas:
  - Una sola implementación de cada contrato. El frontend consume agregados; NO recalcula.
  - `Ano_Constr` es la métrica temporal primaria. `Ano_Calcul` está prohibido.
  - `UNKNOWN != 0`. `VALID | UNKNOWN | SUSPICIOUS | INVALID`.
  - C-05 y C-08 usan denominador de AÑO CONOCIDO (C-02 / C-06), nunca C-01.

Los contratos se expresan en SQL sobre una relación `buildings` con columnas:
    building_id, year_raw, year, year_state, footprint_area_m2, geom_valid, uso, alturas
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

MIN_VALID_YEAR = 1700
SNAPSHOT_YEAR = 2026


# --------------------------------------------------------------------------- #
# Clasificación de año (§5)
# --------------------------------------------------------------------------- #
def classify_year(value: Any, min_valid_year: int = MIN_VALID_YEAR,
                  snapshot_year: int = SNAPSHOT_YEAR) -> tuple[int | None, str]:
    """Devuelve (year | None, state). UNKNOWN != 0."""
    if value is None:
        return None, "UNKNOWN"
    if isinstance(value, str):
        s = value.strip()
        if s == "":
            return None, "UNKNOWN"
        try:
            value = int(float(s))
        except ValueError:
            return None, "UNKNOWN"
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None, "UNKNOWN"
    if value == 0:
        return None, "UNKNOWN"
    if value < min_valid_year or value > snapshot_year:
        return None, "SUSPICIOUS"
    return value, "VALID"


# --------------------------------------------------------------------------- #
# Campañas de ortofoto (C-11)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Campaign:
    year: int
    source: str            # 'bizkaia' | 'geoeuskadi'
    nominal_year: int
    flight_range: str | None = None
    verified_image: bool = False
    # Nombre real de la capa raster cuando difiere del patrón por defecto
    # (ORTO_BFA_{year} en Bizkaia, ORTO_{year} en geoEuskadi). G6: épocas
    # pluri-anuales como ORTO_1984_85 u ORTO_1945_46_AMERICANO.
    layer: str | None = None


CAMPAIGNS: tuple[Campaign, ...] = (
    # Vuelo americano 1945-46 (geoEuskadi): evidencia aérea más antigua con
    # cobertura provincial. Distinto del vuelo americano 1956-57.
    Campaign(1945, "geoeuskadi", 1945, "1945–1946 (vuelo americano)", True,
             "ORTO_1945_46_AMERICANO"),
    # 1956: ficha ODB — vuelo para Catastro 1956, fecha «sin determinar entre
    # 1953 y 1955». No es el vuelo americano 1956-57 (ORTO_1956_57_AMERICANO).
    Campaign(1956, "bizkaia", 1956, None, True),
    # Rangos de vuelo Bizkaia según descripción oficial del dataset
    # (DATA_SOURCES.md §2.4); 1970 sigue PENDING en la ficha → null.
    Campaign(1965, "bizkaia", 1965, "1963/1965", False),
    Campaign(1970, "bizkaia", 1970, None, False),
    Campaign(1975, "bizkaia", 1975, "1975-05", False),
    # Relleno geoEuskadi entre campañas Bizkaia (G6, sondas evidence/g6).
    Campaign(1977, "geoeuskadi", 1977, "1977–1978", True,
             "ORTO_INTERMINISTERIAL_1977_78"),
    Campaign(1983, "bizkaia", 1983, "1983-06", True),
    Campaign(1984, "geoeuskadi", 1984, "1984–1985", True, "ORTO_1984_85"),
    Campaign(1989, "geoeuskadi", 1989, None, True),
    Campaign(1990, "bizkaia", 1990, "1990-05", False),
    Campaign(1991, "geoeuskadi", 1991, None, True),
    Campaign(1995, "bizkaia", 1995, "1995-06", False),
    Campaign(1999, "bizkaia", 1999, "1999-06", False),
    Campaign(2001, "geoeuskadi", 2001, None, True),
    Campaign(2002, "bizkaia", 2002, "2002-03", True),
    # Serie anual geoEuskadi 2004-2024 (sondas: todos con contenido en
    # punto urbano y rural). 1956_57_AMERICANO y los dobles 1995/2002 de
    # geoEuskadi quedan fuera: ya hay campaña canónica Bizkaia para esos años.
    *[Campaign(y, "geoeuskadi", y, None, True) for y in range(2004, 2025)],
    Campaign(2025, "geoeuskadi", 2025, "2025-07-09/2025-08-04", True),
)

# Previews first-party (G1-R2): bbox = extent real del parque edificado en
# EPSG:4326 (lon0, lat0, lon1, lat1). El generador pipeline/build_ortho_previews.py
# lo recalcula desde el parquet y el manifest lo fija; el test de catálogo
# verifica que ambos coinciden.
ORTHO_PREVIEW_BBOX_4326 = (-3.4478364335747607, 42.9821549945039,
                           -2.4162319078328007, 43.45537334104961)


def nearest_ortho(selected_year: int, campaigns: tuple[Campaign, ...] = CAMPAIGNS) -> dict:
    """C-11: campaña que minimiza |campaign_year - selected_year|. Empate -> la más antigua."""
    best = min(campaigns, key=lambda c: (abs(c.year - selected_year), c.year))
    return {
        "selected_year": selected_year,
        "ortho_campaign_year": best.year,
        "ortho_source": best.source,
        "ortho_flight_range": best.flight_range,
        "delta_years": abs(best.year - selected_year),
        "is_exact": best.year == selected_year,
    }


# --------------------------------------------------------------------------- #
# Contratos en SQL (C-01 .. C-10)
# --------------------------------------------------------------------------- #
SQL_METRICS = """
WITH b AS (
  SELECT * FROM {table}
),
base AS (
  SELECT
    building_id,
    year,
    year_state,
    footprint_area_m2,
    (geom_valid) AS geom_valid
  FROM b
),
agg AS (
  SELECT
    count(*)                                                          AS c01_current_building_count,
    count(*) FILTER (WHERE year_state = 'VALID')                      AS c02_known_construction_year_count,
    count(*) FILTER (WHERE year_state = 'UNKNOWN')                    AS unknown_year_count,
    count(*) FILTER (WHERE year_state = 'SUSPICIOUS')                 AS suspicious_year_count,
    count(*) FILTER (WHERE year_state = 'INVALID')                    AS invalid_year_count,
    count(*) FILTER (WHERE year_state = 'VALID' AND year > {year})    AS c04_post_selected_year_building_count,
    count(*) FILTER (WHERE year_state = 'VALID' AND year <= {year})   AS before_selected_year_building_count,
    sum(footprint_area_m2) FILTER (WHERE year_state = 'VALID' AND geom_valid)                       AS c06_current_footprint_area_known_year,
    sum(footprint_area_m2) FILTER (WHERE year_state = 'VALID' AND geom_valid AND year > {year})     AS c07_post_selected_year_footprint_area,
    count(*) FILTER (WHERE NOT geom_valid)                            AS invalid_geom_count,
    min(year) FILTER (WHERE year_state = 'VALID')                     AS min_year,
    max(year) FILTER (WHERE year_state = 'VALID')                     AS max_year
  FROM base
)
SELECT
  *,
  c01_current_building_count - c02_known_construction_year_count AS c03_unknown_year_count,
  CASE WHEN c01_current_building_count > 0
       THEN round(100.0 * c02_known_construction_year_count / c01_current_building_count, 2) END AS coverage_pct,
  CASE WHEN c02_known_construction_year_count > 0
       THEN round(100.0 * c04_post_selected_year_building_count / c02_known_construction_year_count, 2) END AS c05_post_selected_year_share,
  CASE WHEN c06_current_footprint_area_known_year > 0
       THEN round(100.0 * c07_post_selected_year_footprint_area / c06_current_footprint_area_known_year, 2) END AS c08_post_selected_year_footprint_share
FROM agg
"""

SQL_YEAR_DISTRIBUTION = """
SELECT year, count(*) AS n
FROM {table}
WHERE year_state = 'VALID'
GROUP BY 1 ORDER BY 1
"""

SQL_UNKNOWN_BY_STATE = """
SELECT year_state, count(*) AS n FROM {table} GROUP BY 1 ORDER BY 1
"""


def compute_metrics(con, table: str, year: int) -> dict:
    """C-01..C-10 (+ cobertura) para un ámbito dado. C-11/C-12 son auxiliares."""
    row = con.execute(SQL_METRICS.format(table=table, year=int(year))).fetchone()
    cols = [d[0] for d in con.description]
    m = dict(zip(cols, row))
    m["selected_year"] = year
    m["c09_year_distribution"] = [
        {"year": y, "n": n} for y, n in con.execute(SQL_YEAR_DISTRIBUTION.format(table=table)).fetchall()
    ]
    m["year_states"] = dict(con.execute(SQL_UNKNOWN_BY_STATE.format(table=table)).fetchall())
    m["c10_dominant_decade"] = _dominant_decade(m["c09_year_distribution"])
    m["c11_ortho"] = nearest_ortho(year)
    for k in ("c06_current_footprint_area_known_year", "c07_post_selected_year_footprint_area"):
        v = m.get(k)
        m[k] = round(v, 2) if v is not None else None
    return m


# C-10 `dominant_decade`: moda por conteo; en empate gana la DÉCADA MÁS TEMPRANA
# (misma semántica que _dominant_decade). `arg_max(decade, n)` de DuckDB no
# define el argumento ganador en empate → salida no reproducible (D3, 1.353
# celdas con empate). El window function impone orden total: n DESC, decade ASC.
SQL_DOMINANT_DECADE = """
  SELECT {keys}, decade AS dominant_decade FROM (
    SELECT *, row_number() OVER (
      PARTITION BY {keys} ORDER BY n DESC, decade ASC
    ) AS rn FROM {src}
  ) WHERE rn = 1
"""


def _dominant_decade(dist: list[dict]) -> int | None:
    if not dist:
        return None
    acc: dict[int, int] = {}
    for d in dist:
        dec = (d["year"] // 10) * 10
        acc[dec] = acc.get(dec, 0) + d["n"]
    return max(sorted(acc), key=lambda k: acc[k])


@dataclass
class ContractSummary:
    """Resumen legible del contrato, para depuración y tests."""
    municipality: str
    selected_year: int
    values: dict = field(default_factory=dict)
