"""Tests de los contratos de métricas y de la clasificación de año.

Cubre DATA_SEMANTICS.md §5 y §11 (C-01..C-12).
Ejecutar:  python -m pytest tests/data -q
"""
from __future__ import annotations

import sys
from pathlib import Path

import duckdb
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))

from metrics import CAMPAIGNS, classify_year, compute_metrics, nearest_ortho  # noqa: E402

MINY, SNAP = 1700, 2026


# --------------------------------------------------------------------------- #
# §5 Clasificación de año
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("raw,expected_state,expected_year", [
    (None, "UNKNOWN", None),
    ("", "UNKNOWN", None),
    ("   ", "UNKNOWN", None),
    ("abc", "UNKNOWN", None),
    (0, "UNKNOWN", None),
    ("0", "UNKNOWN", None),
    (1987, "VALID", 1987),
    ("1987", "VALID", 1987),
    (1700, "VALID", 1700),
    (2026, "VALID", 2026),
    (1499, "SUSPICIOUS", None),
    (1500, "SUSPICIOUS", None),
    (1640, "SUSPICIOUS", None),
    (2027, "SUSPICIOUS", None),
    (-1, "SUSPICIOUS", None),
])
def test_classify_year(raw, expected_state, expected_year):
    year, state = classify_year(raw, MINY, SNAP)
    assert state == expected_state
    assert year == expected_year


def test_unknown_is_not_zero():
    year, state = classify_year(0)
    assert state == "UNKNOWN" and year is None
    assert not classify_year(0)[0] == 1900


def test_suspicious_not_silently_repaired():
    for v in (1500, 1640):
        assert classify_year(v)[1] == "SUSPICIOUS"


# --------------------------------------------------------------------------- #
# C-11 ortrofoto más próxima
# --------------------------------------------------------------------------- #
def test_nearest_ortho_1987_is_1989():
    # Registry G6 (37 campañas): |1987-1984| = 3 ; |1987-1989| = 2  -> 1989
    r = nearest_ortho(1987)
    assert r["ortho_campaign_year"] == 1989
    assert r["delta_years"] == 2
    assert r["is_exact"] is False


def test_nearest_ortho_exact():
    r = nearest_ortho(1999)
    assert r["ortho_campaign_year"] == 1999 and r["is_exact"] is True


def test_nearest_ortho_tie_prefers_older():
    # 1997: |1997-1995| = |1997-1999| = 2 -> empate; elige la más antigua (1995)
    r = nearest_ortho(1997)
    assert r["ortho_campaign_year"] == 1995


def test_nearest_ortho_after_last_campaign():
    r = nearest_ortho(2050)
    assert r["ortho_campaign_year"] == 2025


def test_campaign_catalog_has_verified_flags():
    assert any(c.year == 1956 and c.source == "bizkaia" for c in CAMPAIGNS)
    assert any(c.year == 2025 and c.source == "geoeuskadi" for c in CAMPAIGNS)


def test_1956_flight_range_not_fabricated():
    # Ficha ODB: «fecha sin determinar entre 1953 y 1955» (vuelo Catastro 1956).
    # El rango "1956-1957" corresponde al vuelo americano (geoEuskadi), no a esta
    # campaña. Regresión: no reintroducir una fecha de vuelo no verificada.
    c1956 = next(c for c in CAMPAIGNS if c.year == 1956)
    assert c1956.flight_range is None


def test_catalog_json_matches_campaigns():
    import json
    cat = json.loads((ROOT / "app/static/data/catalog.json").read_text(encoding="utf-8"))
    got = {(c["year"], c["source"]): c for c in cat["campaigns"]}
    assert len(got) == len(CAMPAIGNS)
    for c in CAMPAIGNS:
        g = got[(c.year, c.source)]
        assert g["nominal_year"] == c.nominal_year
        assert g["flight_range"] == c.flight_range
        assert g["verified_image"] == c.verified_image


def test_ortho_previews_manifest_consistent():
    """G1-R2: cada campaña del catálogo tiene preview con manifest vinculante."""
    import hashlib
    import json
    man_path = ROOT / "app/static/data/ortho-previews/manifest.json"
    man = json.loads(man_path.read_text(encoding="utf-8"))
    cat = json.loads((ROOT / "app/static/data/catalog.json").read_text(encoding="utf-8"))
    by_year = {p["campaign_year"]: p for p in man["previews"]}
    assert set(by_year) == {c["year"] for c in cat["campaigns"]}
    for c in cat["campaigns"]:
        p = by_year[c["year"]]
        assert c["preview"] is not None
        assert c["preview"]["url"] == p["url"]
        assert c["preview"]["bbox"] == man["bbox_epsg4326"]
        f = man_path.parent / p["file"]
        assert f.exists(), f"falta {p['file']}"
        assert hashlib.sha256(f.read_bytes()).hexdigest() == p["sha256"]


def test_ortho_preview_bbox_is_buildings_extent():
    """Georreferenciación mecánica: bbox del preview == extent real (EPSG:4326)."""
    import duckdb
    from metrics import ORTHO_PREVIEW_BBOX_4326
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    x0, y0, x1, y1 = con.execute(
        "SELECT min(st_xmin(geom)), min(st_ymin(geom)), max(st_xmax(geom)), "
        "max(st_ymax(geom)) FROM 'data/processed/g1/buildings/*.parquet'"
    ).fetchone()
    assert list(ORTHO_PREVIEW_BBOX_4326) == [x0, y0, x1, y1]


# --------------------------------------------------------------------------- #
# C-01..C-08 sobre datos sintéticos conocidos
# --------------------------------------------------------------------------- #
@pytest.fixture()
def con():
    c = duckdb.connect()
    c.execute("INSTALL spatial; LOAD spatial;")
    rows = [
        # building_id, year, year_state, footprint, geom_valid
        ("A", 1900, "VALID", 100.0, True),
        ("B", 1987, "VALID", 200.0, True),
        ("C", 1995, "VALID", 300.0, True),
        ("D", None, "UNKNOWN", 400.0, True),
        ("E", None, "SUSPICIOUS", 500.0, True),
        ("F", 2000, "VALID", 600.0, False),   # geometría inválida -> fuera de huella
    ]
    c.execute("CREATE TABLE buildings (building_id VARCHAR, year INTEGER, year_state VARCHAR, footprint_area_m2 DOUBLE, geom_valid BOOLEAN)")
    c.executemany("INSERT INTO buildings VALUES (?,?,?,?,?)", rows)
    return c


def test_c01_c02_c03(con):
    m = compute_metrics(con, "buildings", 1987)
    assert m["c01_current_building_count"] == 6
    assert m["c02_known_construction_year_count"] == 4
    assert m["c03_unknown_year_count"] == 2
    assert m["coverage_pct"] == round(100 * 4 / 6, 2)


def test_c04_c05_denominator_is_known(con):
    m = compute_metrics(con, "buildings", 1987)
    # > 1987 y VALID: C(1995), F(2000) -> 2
    assert m["c04_post_selected_year_building_count"] == 2
    # denominador = known (4), NO total (6)
    assert m["c05_post_selected_year_share"] == 50.0
    assert m["c05_post_selected_year_share"] != round(100 * 2 / 6, 2)


def test_c06_c07_c08_footprint_known_and_valid(con):
    m = compute_metrics(con, "buildings", 1987)
    # C-06: VALID y geom válida: A+B+C = 600 ; F excluida (geom inválida)
    assert m["c06_current_footprint_area_known_year"] == 600.0
    # C-07: > 1987, VALID, geom válida: C(300) ; F excluida
    assert m["c07_post_selected_year_footprint_area"] == 300.0
    assert m["c08_post_selected_year_footprint_share"] == 50.0
    assert m["invalid_geom_count"] == 1


def test_before_plus_after_equals_known(con):
    m = compute_metrics(con, "buildings", 1987)
    assert m["before_selected_year_building_count"] + m["c04_post_selected_year_building_count"] == \
        m["c02_known_construction_year_count"]


def test_c09_c10_distribution():
    con = duckdb.connect()
    con.execute("CREATE TABLE buildings (building_id VARCHAR, year INTEGER, year_state VARCHAR, footprint_area_m2 DOUBLE, geom_valid BOOLEAN)")
    con.executemany("INSERT INTO buildings VALUES (?,?,?,?,?)", [
        ("A", 1971, "VALID", 1.0, True),
        ("B", 1975, "VALID", 1.0, True),
        ("C", 1982, "VALID", 1.0, True),
    ])
    m = compute_metrics(con, "buildings", 1980)
    assert m["c10_dominant_decade"] == 1970
    assert m["c09_year_distribution"] == [{"year": 1971, "n": 1}, {"year": 1975, "n": 1}, {"year": 1982, "n": 1}]


def test_unknown_policy_excludes_from_both_terms():
    con = duckdb.connect()
    con.execute("CREATE TABLE buildings (building_id VARCHAR, year INTEGER, year_state VARCHAR, footprint_area_m2 DOUBLE, geom_valid BOOLEAN)")
    con.executemany("INSERT INTO buildings VALUES (?,?,?,?,?)", [
        ("A", None, "UNKNOWN", 999.0, True),
        ("B", None, "SUSPICIOUS", 999.0, True),
    ])
    m = compute_metrics(con, "buildings", 1987)
    assert m["c02_known_construction_year_count"] == 0
    assert m["c05_post_selected_year_share"] is None   # sin denominador -> no se inventa 0
    assert m["c07_post_selected_year_footprint_area"] is None
