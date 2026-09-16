"""Comprueba que DuckDB Spatial y ST_Read funcionan realmente.

No basta con `import duckdb`: hay que cargar la extension `spatial` y verificar que
`ST_Read` esta disponible (GDAL embebido). Si se pasa una ruta SHP/GML, ademas la lee.

Uso:
    python scripts/check_duckdb_spatial.py [ruta.shp|ruta.gml]
Salida (exit code):
    0  OK
    1  fallo
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        import duckdb
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL duckdb no importable: {exc}")
        return 1

    try:
        con = duckdb.connect()
        con.execute("INSTALL spatial;")
        con.execute("LOAD spatial;")
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL extension spatial: {exc}")
        return 1

    try:
        con.execute("SELECT ST_AsText(ST_Point(0, 0))").fetchone()
        has_read = con.execute(
            "SELECT count(*) FROM duckdb_functions() WHERE lower(function_name) = 'st_read'"
        ).fetchone()[0]
        if not has_read:
            raise RuntimeError("ST_Read no aparece en duckdb_functions()")
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL ST_Read no disponible: {exc}")
        return 1

    print(f"duckdb {duckdb.__version__} + spatial + ST_Read OK")

    if len(sys.argv) > 1:
        path = sys.argv[1]
        try:
            n = con.execute(f"SELECT count(*) FROM ST_Read('{path}')").fetchone()[0]
            print(f"ST_Read('{path}') -> {n} filas")
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL ST_Read('{path}'): {exc}")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
