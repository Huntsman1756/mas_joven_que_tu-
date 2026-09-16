"""G1-R (D3 / I-9) — determinismo de `dominant_decade`.

`arg_max(decade, n)` no define qué argumento gana en empate (1.353 celdas
observadas con empate en la adjudicación) → `cells.geojson` no era
reproducible. El contrato C-10 (DATA_SEMANTICS.md) se fija como:
moda por conteo; **en empate gana la década más temprana** — la misma
semántica que `_dominant_decade` de metrics.py.

Estos tests ejecutan el SQL real (`SQL_DOMINANT_DECADE` en pipeline/metrics.py)
sobre datos con empates, en distinto orden de inserción.
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

import duckdb
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))

from metrics import SQL_DOMINANT_DECADE, _dominant_decade  # noqa: E402


def _run_dom(con: duckdb.DuckDBPyConnection, keys: str, rows: list[tuple]) -> dict:
    cols = keys.split(",")
    con.execute(
        f"CREATE OR REPLACE TABLE dec_t ({', '.join(c.strip() + ' INTEGER' for c in cols)}, decade INTEGER, n INTEGER)"
    )
    con.executemany(f"INSERT INTO dec_t VALUES ({','.join(['?'] * (len(cols) + 2))})", rows)
    out = con.execute(SQL_DOMINANT_DECADE.format(keys=keys, src="dec_t")).fetchall()
    return {tuple(r[: len(cols)]): r[-1] for r in out}


@pytest.fixture()
def con():
    c = duckdb.connect()
    yield c
    c.close()


def test_tie_prefers_earliest_decade(con):
    # celda con empate 1980==1990 → gana 1980 (década más temprana)
    rows = [(1, 0, 0, 1980, 5), (1, 0, 0, 1990, 5), (1, 0, 0, 1970, 2)]
    dom = _run_dom(con, "codigo_mun, cell_x, cell_y", rows)
    assert dom[(1, 0, 0)] == 1980


def test_three_way_tie_prefers_earliest(con):
    rows = [(7, 3, 4, 2000, 3), (7, 3, 4, 1950, 3), (7, 3, 4, 1970, 3)]
    dom = _run_dom(con, "codigo_mun, cell_x, cell_y", rows)
    assert dom[(7, 3, 4)] == 1950


def test_clear_mode_unaffected(con):
    rows = [(2, 1, 1, 1960, 1), (2, 1, 1, 1990, 9), (2, 1, 1, 2000, 2)]
    dom = _run_dom(con, "codigo_mun, cell_x, cell_y", rows)
    assert dom[(2, 1, 1)] == 1990


def test_shuffle_order_invariant(con):
    # mismo input lógico en distinto orden → mismo resultado, N barajados
    base = [
        (1, 0, 0, 1980, 5), (1, 0, 0, 1990, 5), (1, 0, 0, 1970, 2),
        (2, 1, 1, 1960, 1), (2, 1, 1, 1990, 9), (2, 1, 1, 2000, 2),
        (3, 2, 2, 1950, 4), (3, 2, 2, 1970, 4), (3, 2, 2, 1990, 4),
    ]
    expected = {(1, 0, 0): 1980, (2, 1, 1): 1990, (3, 2, 2): 1950}
    rng = random.Random(42)
    for _ in range(20):
        rows = base[:]
        rng.shuffle(rows)
        assert _run_dom(con, "codigo_mun, cell_x, cell_y", rows) == expected


def test_municipality_partition_shuffle_invariant(con):
    # munis: partición por 1 clave (mismo patrón que g1_buildings.py)
    base = [(8, 1910, 7), (8, 1930, 7), (9, 2000, 3), (9, 1980, 6)]
    rng = random.Random(7)
    for _ in range(20):
        rows = base[:]
        rng.shuffle(rows)
        dom = _run_dom(con, "codigo_mun", rows)
        assert dom[(8,)] == 1910 and dom[(9,)] == 1980


def test_sql_matches_python_contract(con):
    # el SQL del pipeline debe coincidir con _dominant_decade (metrics.py, C-10).
    # `dec` es la tabla YA agregada por década: una fila por (celda, década).
    rng = random.Random(99)
    acc: dict[int, int] = {}
    for dec in range(1900, 2030, 10):
        acc[dec] = rng.randint(1, 4)
    dist_rows = [(5, 0, 0, dec, n) for dec, n in acc.items()]
    sql = _run_dom(con, "codigo_mun, cell_x, cell_y", dist_rows)
    py = _dominant_decade([{"year": d, "n": n} for d, n in acc.items()])
    assert sql[(5, 0, 0)] == py
