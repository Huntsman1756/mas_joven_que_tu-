"""G1 design spike (NO productivo, read-only) — elección de la métrica primaria de celda.

Compara, sobre las celdas de 500 m de la muestra G0:
  A) cuota de EDIFICIOS construidos después de Y  (count share)
  B) cuota de HUELLA construida después de Y      (footprint share)

Mide divergencia, estabilidad con n pequeño y efecto de la industria.

Salida por consola. No escribe en data/ ni en app/.
"""
from __future__ import annotations

import statistics
from pathlib import Path

import duckdb

PROC = Path("data/processed/g0")
SAMPLE = {20: "Bilbao", 54: "Leioa", 908: "Murueta"}
CELL = 500
Y = 1987


def main() -> None:
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    frames = " UNION ALL ".join(
        f"SELECT * FROM read_parquet('{(PROC / f'buildings_{c:03d}.parquet').as_posix()}')" for c in SAMPLE
    )
    con.execute(f"CREATE VIEW b AS {frames}")
    con.execute(f"""
        CREATE TABLE cells AS
        SELECT
          codigo_mun, cell_x AS cx, cell_y AS cy,
          count(*) AS n,
          count(*) FILTER (WHERE year IS NOT NULL) AS n_known,
          count(*) FILTER (WHERE year IS NOT NULL AND year > {Y}) AS n_after,
          sum(footprint_area_m2) FILTER (WHERE year IS NOT NULL) AS a_known,
          sum(footprint_area_m2) FILTER (WHERE year IS NOT NULL AND year > {Y}) AS a_after,
          sum(footprint_area_m2) AS a_all,
          avg(footprint_area_m2) AS area_per_building,
          count(*) FILTER (WHERE uso IN ('I', 'Y')) AS n_industrial
        FROM b GROUP BY 1, 2, 3
    """)

    rows = con.execute("""
        SELECT codigo_mun, n, n_known, n_after, a_known, a_after, area_per_building, n_industrial,
               CASE WHEN n_known > 0 THEN 100.0 * n_after / n_known END AS count_share,
               CASE WHEN a_known > 0 THEN 100.0 * a_after / a_known END AS area_share
        FROM cells
    """).fetchall()
    cols = [d[0] for d in con.description]
    cells = [dict(zip(cols, r)) for r in rows]
    valid = [c for c in cells if c["count_share"] is not None and c["area_share"] is not None]

    print(f"celdas totales: {len(cells)} · con año conocido: {len(valid)}")
    diffs = [abs(c["count_share"] - c["area_share"]) for c in valid]
    print(f"|count_share - area_share| -> media={statistics.mean(diffs):.1f} pts  "
          f"mediana={statistics.median(diffs):.1f}  p90={sorted(diffs)[int(.9*len(diffs))]:.1f}  "
          f"max={max(diffs):.1f}")
    for t in (10, 20, 30):
        n = sum(1 for d in diffs if d > t)
        print(f"  celdas con divergencia > {t} pts: {n} ({100*n/len(valid):.1f} %)")

    # Concordancia de "celda mayoritariamente nueva" (share > 50)
    agree = sum(1 for c in valid if (c["count_share"] > 50) == (c["area_share"] > 50))
    print(f"concordancia clase (>50 % después de {Y}): {agree}/{len(valid)} ({100*agree/len(valid):.1f} %)")

    # Estabilidad con n pequeño
    for lo, hi in ((1, 4), (5, 14), (15, 39), (40, 10**9)):
        sub = [c for c in valid if lo <= c["n_known"] <= hi]
        if not sub:
            continue
        d = [abs(c["count_share"] - c["area_share"]) for c in sub]
        print(f"  n_known {lo:>3}-{hi if hi < 10**9 else 'inf':>3}: {len(sub):>4} celdas · "
              f"divergencia media {statistics.mean(d):>5.1f} pts")

    # Efecto de la industria
    ind = [c for c in valid if c["n_industrial"] >= 3]
    non = [c for c in valid if c["n_industrial"] == 0]
    if ind and non:
        print(f"  celdas con >=3 edificios industriales: {len(ind)} · divergencia media "
              f"{statistics.mean([abs(c['count_share']-c['area_share']) for c in ind]):.1f} pts")
        print(f"  celdas sin industria:                  {len(non)} · divergencia media "
              f"{statistics.mean([abs(c['count_share']-c['area_share']) for c in non]):.1f} pts")

    print("\nExtremos (mayor divergencia):")
    for c in sorted(valid, key=lambda c: -abs(c["count_share"] - c["area_share"]))[:6]:
        print(f"  mun={c['codigo_mun']:>3} n={c['n']:>4} ind={c['n_industrial']:>3} "
              f"m2/edif={c['area_per_building']:>8.0f}  count={c['count_share']:>5.1f} %  "
              f"huella={c['area_share']:>5.1f} %")

    print("\nAreas por edificio (contexto):")
    apb = [c["area_per_building"] for c in valid if c["area_per_building"]]
    print(f"  m2/edificio por celda: min={min(apb):.0f} p50={statistics.median(apb):.0f} "
          f"p90={sorted(apb)[int(.9*len(apb))]:.0f} max={max(apb):.0f}")


if __name__ == "__main__":
    main()
