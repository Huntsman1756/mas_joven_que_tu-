"""Sensibilidad de C-08 (huella posterior) a la construcción de mayor huella, por capítulo.
Uso: python -I evidence/footprint-outliers-20261106/sensitivity.py  (desde la raíz; requiere duckdb+spatial)
Universo y filtro idénticos a C-05/C-08: year_state VALID y geom_valid, centroide dentro del bbox de la celda."""
import json, duckdb
cands = json.load(open('evidence/g2/editorial-desk/candidates.json', encoding='utf-8'))
cands = cands if isinstance(cands, list) else cands.get('candidates', cands)
con = duckdb.connect(); con.sql('install spatial; load spatial')
out = {}
for sid in ['f4036', 'f4233', 'f4738']:  # capítulos de una sola celda: bbox == celda
    c = next(x for x in cands if x['id'] == sid); ref = c['ref_year']; x0, y0, x1, y1 = c['bbox']
    rows = con.sql(f"""select building_id, year, uso, alturas, viviendas, footprint_area_m2
      from read_parquet('data/processed/g1/buildings/*.parquet')
      where year_state='VALID' and geom_valid
        and ST_X(ST_Centroid(geom)) between {x0} and {x1} and ST_Y(ST_Centroid(geom)) between {y0} and {y1}""").fetchall()
    A = sum(r[5] for r in rows); post = [r for r in rows if r[1] > ref]; Ap = sum(r[5] for r in post)
    top = max(rows, key=lambda r: r[5]); A2 = A - top[5]; Ap2 = Ap - (top[5] if top[1] > ref else 0)
    out[sid] = {'ref_year': ref, 'n': len(rows), 'c05': round(len(post) / len(rows), 4), 'c08': round(Ap / A, 4),
                'published': {'c05': c['c05'], 'c08': c['c08']},
                'top': {'building_id': top[0], 'year': top[1], 'uso': top[2], 'alturas': top[3], 'viviendas': top[4],
                        'footprint_m2': round(top[5], 1), 'share_of_footprint': round(top[5] / A, 4)},
                'c08_without_top': round(Ap2 / A2, 4)}
print(json.dumps(out, ensure_ascii=False, indent=1))
