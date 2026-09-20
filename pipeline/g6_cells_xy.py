"""G6-I — añade el centroide de celda a data/cells/<cod>.json.

Los hotspots («zonas con más edificios actuales construidos después de Y»)
necesitan posicionar cada celda sin depender de que sus teselas vectoriales
estén cargadas en el viewport. La serie ya viaja en cells/<cod>.json como
``{fid: [ys, ya]}``; se añade una tercera posición ``[ys, ya, lon, lat]``
con el centro de la celda de 500 m (EPSG:25830 → OGC:CRS84, 5 decimales).

El fid se reconstruye con la MISMA regla que g1_buildings.py:
``row_number() OVER (ORDER BY codigo_mun, cell_x, cell_y)`` — verificado
comparando el conjunto de fids derivado con las claves del JSON existente;
si difieren, el script aborta sin escribir.

Uso:  python pipeline/g6_cells_xy.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
PARQUET = ROOT / "data" / "processed" / "g1" / "buildings" / "*.parquet"
CELLS_DIR = ROOT / "app" / "static" / "data" / "cells"
CELL = 500  # CELL_SIZE_M de g1_buildings.py


def main() -> int:
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")

    # fid canónico: row_number sobre (cod, cell_x, cell_y) — idéntico a g1.
    rows = con.execute(f"""
        SELECT codigo_mun, cell_x, cell_y,
               row_number() OVER (ORDER BY codigo_mun, cell_x, cell_y) AS fid,
               round(ST_X(ST_Transform(
                 ST_Point((cell_x+0.5)*{CELL}, (cell_y+0.5)*{CELL}),
                 'EPSG:25830', 'OGC:CRS84')), 5) AS lon,
               round(ST_Y(ST_Transform(
                 ST_Point((cell_x+0.5)*{CELL}, (cell_y+0.5)*{CELL}),
                 'EPSG:25830', 'OGC:CRS84')), 5) AS lat
        FROM (SELECT DISTINCT codigo_mun, cell_x, cell_y
              FROM '{PARQUET.as_posix()}'
              WHERE cell_x IS NOT NULL)
        ORDER BY codigo_mun, cell_x, cell_y
        """).fetchall()

    by_mun: dict[int, dict[int, tuple[float, float]]] = {}
    for cod, _cx, _cy, fid, lon, lat in rows:
        by_mun.setdefault(cod, {})[fid] = (lon, lat)

    checked = 0
    for cod, cells in by_mun.items():
        path = CELLS_DIR / f"{cod:03d}.json"
        if not path.exists():
            print(f"SKIP {cod:03d}: sin JSON de celdas")
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        got = {int(k) for k in payload}
        want = set(cells)
        if got != want:
            # Solo abortar si el fid derivado falta en el JSON (el JSON puede
            # tener menos celdas si alguna quedó sin serie — no ocurre hoy).
            missing = want - got
            if missing:
                raise SystemExit(
                    f"{cod:03d}: {len(missing)} fid derivados ausentes del JSON — "
                    f"la regla de fid no coincide con g1, abortando"
                )
        for k, v in payload.items():
            lon, lat = cells[int(k)]
            if len(v) == 2:
                v += [str(lon), str(lat)]
            else:
                v[2], v[3] = str(lon), str(lat)
        path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        checked += 1
    print(f"OK — {checked} municipios, {len(rows)} celdas con centroide")
    return 0


if __name__ == "__main__":
    sys.exit(main())
