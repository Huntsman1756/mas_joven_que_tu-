import duckdb
con = duckdb.connect()
src = "data/processed/g1/buildings/*.parquet"
cols = con.execute(f"DESCRIBE SELECT * FROM '{src}'").fetchall()
print('COLS:', [c[0] for c in cols])
print(con.execute(f"""
SELECT count(*) AS n,
  sum(CASE WHEN viviendas IS NULL THEN 1 ELSE 0 END) AS viv_null,
  sum(CASE WHEN viviendas = 0 THEN 1 ELSE 0 END) AS viv_zero,
  sum(CASE WHEN viviendas > 0 THEN 1 ELSE 0 END) AS viv_pos,
  max(viviendas) AS viv_max, sum(viviendas) AS viv_total,
  round(avg(viviendas),3) AS viv_mean
FROM '{src}'""").fetchdf().to_string())
print(con.execute(f"""
SELECT uso, count(*) n, sum(CASE WHEN viviendas>0 THEN 1 ELSE 0 END) con_viv, sum(viviendas) viv
FROM '{src}' GROUP BY uso ORDER BY n DESC LIMIT 12""").fetchdf().to_string())
print(con.execute(f"""
SELECT year_state, count(*) n,
  sum(CASE WHEN viviendas IS NULL THEN 1 ELSE 0 END) viv_null,
  sum(CASE WHEN viviendas = 0 THEN 1 ELSE 0 END) viv_zero,
  sum(CASE WHEN viviendas > 0 THEN 1 ELSE 0 END) viv_pos,
  sum(viviendas) viv
FROM '{src}' GROUP BY year_state""").fetchdf().to_string())
# coherencia municipal: % edificios con viv>0 por municipio (min/max)
print(con.execute(f"""
SELECT min(round(100.0*con_viv/n,1)) min_pct, max(round(100.0*con_viv/n,1)) max_pct,
       round(avg(100.0*con_viv/n),1) avg_pct
FROM (SELECT muni, count(*) n, sum(CASE WHEN viviendas>0 THEN 1 ELSE 0 END) con_viv
      FROM '{src}' GROUP BY muni)""").fetchdf().to_string())
PYEOF_MARKER = None
