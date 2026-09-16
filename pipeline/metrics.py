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


CAMPAIGNS: tuple[Campaign, ...] = (
    Campaign(1956, "bizkaia", 1956, "1956-1957", True),
    Campaign(1965, "bizkaia", 1965, None, False),
    Campaign(1970, "bizkaia", 1970, None, False),
    Campaign(1975, "bizkaia", 1975, None, False),
    Campaign(1983, "bizkaia", 1983, None, True),
    Campaign(1990, "bizkaia", 1990, None, False),
    Campaign(1995, "bizkaia", 1995, None, False),
    Campaign(1999, "bizkaia", 1999, None, False),
    Campaign(2002, "bizkaia", 2002, None, True),
    Campaign(2025, "geoeuskadi", 2025, "2025-07-09/2025-08-04", True),
)


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
