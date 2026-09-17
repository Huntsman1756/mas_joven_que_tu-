import duckdb
con = duckdb.connect()
src = "data/processed/g1/buildings/*.parquet"
# Hipótesis: uso='V' & viv=0 = unifamiliar implícita → área pequeña, alturas bajas
print(con.execute(f"""
SELECT CASE WHEN viviendas>0 THEN 'viv>0' ELSE 'viv=0' END grp,
  count(*) n,
  round(median(footprint_area_m2),1) med_area,
  round(median(alturas),1) med_alturas,
  round(avg(alturas),2) avg_alt
FROM '{src}' WHERE uso='V' GROUP BY grp""").fetchdf().to_string())
# cuántos V con viv=0 son unifamiliar-plausible (alturas<=2 y area<300)
print(con.execute(f"""
SELECT count(*) n_v_viv0,
  sum(CASE WHEN alturas<=2 AND footprint_area_m2<300 THEN 1 ELSE 0 END) unifam_plausible,
  sum(CASE WHEN alturas>=4 THEN 1 ELSE 0 END) altos_viv0
FROM '{src}' WHERE uso='V' AND viviendas=0""").fetchdf().to_string())
# coherencia municipal
print(con.execute(f"""
SELECT min(round(100.0*con_viv/n,1)) min_pct, max(round(100.0*con_viv/n,1)) max_pct,
  round(median(100.0*con_viv/n),1) med_pct, count(*) munis
FROM (SELECT codigo_mun, count(*) n, sum(CASE WHEN viviendas>0 THEN 1 ELSE 0 END) con_viv
      FROM '{src}' GROUP BY codigo_mun)""").fetchdf().to_string())
# Si unifamiliar=1 implícita: estimación de viviendas totales vs Eustat (~600k en Bizkaia)
print(con.execute(f"""
SELECT sum(viviendas) viv_declaradas,
  sum(CASE WHEN uso='V' AND viviendas=0 AND alturas<=2 AND footprint_area_m2<300 THEN 1 ELSE 0 END) unifam_implicitas,
  sum(viviendas) + sum(CASE WHEN uso='V' AND viviendas=0 AND alturas<=2 AND footprint_area_m2<300 THEN 1 ELSE 0 END) total_est
FROM '{src}'""").fetchdf().to_string())
# share "posteriores a ti" por viviendas sería calculable? año por edificio con viv
print(con.execute(f"""
SELECT CASE WHEN year>=1987 THEN 'post-1987' ELSE 'pre-1987' END grp,
  count(*) edificios, sum(viviendas) viv,
  sum(CASE WHEN uso='V' AND viviendas=0 AND alturas<=2 AND footprint_area_m2<300 THEN 1 ELSE 0 END) unifam
FROM '{src}' WHERE year_state='VALID' GROUP BY grp""").fetchdf().to_string())
