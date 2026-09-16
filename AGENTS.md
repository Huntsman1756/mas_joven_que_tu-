# AGENTS.md — reglas de trabajo del proyecto

Este repositorio se construye *evidence-first*. Las reglas siguientes son
obligatorias para cualquier agente o persona que trabaje aquí.

## Principios

1. **Nunca asumas que un endpoint funciona: pruébalo.** Guarda la evidencia.
2. **Una respuesta «correcta» no prueba contenido correcto.** HTTP 200 + `image/jpeg`
   puede ser una imagen en blanco; un WMS puede devolver 200 con XML de error. Verifica
   el contenido, no solo el código de estado.
3. **Nunca asumas una licencia: léela.** Software ≠ datos.
4. **Nunca asumas la semántica de un campo: documéntala** en `docs/DATA_SEMANTICS.md`.
5. **Nunca copies código sin licencia compatible.** Ver `docs/OSS_REUSE.md` y
   `docs/COMPETITION.md` §3 (Base 18 del Decreto Foral 73/2026: responsabilidad exclusiva
   sobre material de terceros).
6. Prefiere OSS existente antes que implementar desde cero.
7. No añadas dependencias por popularidad, ni IA, ni backend sin necesidad demostrada.
8. No escondas incertidumbre. No fabriques precisión. No mezcles observación y derivación.
9. Usa estados explícitos: `OBSERVED`, `DERIVED`, `UNKNOWN`, `NOT_APPLICABLE`.
10. Toda métrica derivada debe rastrearse hasta su fuente y respetar su **contrato**
    (`DATA_SEMANTICS.md` §11: universo, numerador, denominador). Pipeline y frontend no
    pueden usar denominadores distintos.
11. No hacer feature creep. Las fases están preregistradas: no ejecutar G1+ sin cerrar G0.
12. No mover los goalposts: un umbral usado para decidir un gate no se fija después de
    ver el resultado.

## Reglas semánticas no negociables

- La métrica primaria es `Ano_Constr` (año de construcción). **No** `Ano_Rehabi`
  ni `Ano_Reform`. `Ano_Calcul` está **prohibido** como métrica hasta documentarlo.
- `UNKNOWN != 0`. Un año 0 o vacío es *desconocido*, nunca 1900 ni "antiguo".
- Los valores de año se clasifican `VALID | UNKNOWN | SUSPICIOUS | INVALID`
  (`DATA_SEMANTICS.md` §5). Nunca se borran ni corrigen en silencio.
- Toda reparación de geometría (`ST_MakeValid`) conserva original, transformación, motivo
  y resultado.
- El universo de datos es **el parque de edificios existente hoy**
  (`CURRENT_BUILDING_STOCK != HISTORICAL_BUILDING_STOCK`). Prohibido presentarlo como
  reconstrucción histórica.
- Área calculada desde polígono = **huella en planta** (`footprint_area`), nunca
  "superficie construida".
- Las ortofotos son evidencia visual. Prohibido derivar métricas históricas con
  computer vision.
- El año nominal de una campaña de ortofoto puede diferir de la fecha real del vuelo:
  hay que mostrarlo.
- El planeamiento actual no reconstruye el uso histórico del suelo.
- Los datos de **Open Data Bizkaia** son la **fuente principal** (Base 1 del Decreto
  Foral 73/2026); otras fuentes solo **complementan**.

## Flujo de trabajo

- Cambios de datos → actualizar `data/manifests/` y `data/qa/`.
- Cambios de arquitectura relevantes → crear ADR en `docs/adrs/`.
- Cambios de producto → actualizar `docs/PRODUCT.md` y `docs/UX_COPY.md` a la vez.
- Cada gate debe producir un artefacto visible, no solo pipeline.

## Comandos

```powershell
# comprobar herramientas antes de una fase (no instala nada)
powershell -File scripts\preflight.ps1 -Phase g0

# datos (pipeline G1: 112 municipios → parquet, geojson, metrics, QA)
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r pipeline\requirements.txt
python scripts\check_duckdb_spatial.py
python pipeline\g1_buildings.py                 # completo (~10 min, descarga Catastro)
python pipeline\g1_buildings.py 020 054 908     # subset para smoke test

# tiles (tippecanoe 2.79.0 en contenedor fijado; ADR-003)
bash scripts/g1_build_tiles.sh                  # bash recomendado en Windows/MSYS
# o desde PowerShell: powershell -File scripts\g1_build_tiles.ps1

# app (SvelteKit estático)
cd app
npm install
npm run dev          # desarrollo
npm run check        # svelte-check (tipos + a11y)
npm run lint         # eslint
npm run test         # vitest: dominio + copy-lint
npm run build        # build estático en app/build
npm run serve        # servidor estático con HTTP Range (PMTiles lo exige)

# verificación completa de fase
powershell -File scripts\verify.ps1

# tests de datos
python -m pytest tests/data -q
```

## Verificación antes de cerrar una tarea

- [ ] Los datos que afirmo existen y los he descargado o consultado.
- [ ] Si afirmo que una imagen/tile/WMS «funciona», he comprobado que **tiene contenido**.
- [ ] La licencia de cada fuente usada está documentada (y es del **dato**, no del software).
- [ ] Las métricas tienen contrato (universo, numerador, denominador).
- [ ] No hay afirmaciones prohibidas en copy ni en comentarios.
- [ ] Ninguna corrección de dato o geometría quedó sin trazar.
- [ ] `docs/` no se contradice entre sí.
- [ ] Si la tarea toca material de terceros, se revisó la Base 18 del decreto.

## Convenciones

- Idioma de trabajo del copy: **es**. Estructura i18n preparada para **eu**
  (sin traducciones automáticas como copy final).
- Coordenadas y CRS: Catastro en `EPSG:25830`; visualización en `EPSG:3857` (Web Mercator).
- Comentarios en código: solo cuando aporten. No comentarios decorativos.
