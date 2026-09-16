# G0 — Artefactos pesados: política de retención

Los artefactos derivados que se pueden regenerar con el pipeline **no se versionan**
en Git (regla del gate §22: «No llenar Git con artefactos enormes»). Se registran aquí
con `path`, tamaño y `sha256`.

Regeneración (orden):
1. `python pipeline/g0_recon.py` (opcional; descarga + reconocimiento)
2. `python pipeline/g0_slice.py` → `data/processed/g0/*`
3. `python pipeline/g0_aggregates.py` → `app/static/data/metrics_*.json`
4. `powershell -File scripts/g0_build_tiles.ps1` → `app/static/data/*.pmtiles`

## Versionados (artefacto analítico estable)

| path | nota |
|------|------|
| `data/processed/g0/buildings_0{20,54,908}.parquet` | canónico; geometría `OGC:CRS84`; `sha256` en `evidence/g0/03-data/*.parquet.sha256` |
| `app/static/data/metrics_0{20,54,908}.json` | agregados canónicos por año (pequeños) |

## NO versionados (regenerables)

Verificados 2026-09-16.

| path | bytes | sha256 |
|------|-------|--------|
| `app/static/data/buildings.pmtiles` | 3.993.187 | `c30e4e75b876afed7178f6199a9f9dfcedbfbdd1687a805570bdb1a75d9fc360` |
| `app/static/data/cells.pmtiles` | 40.447 | `91b7fb84d29e4fcaf21b24e68a7451f8dc4ad674300cd93abc197b305d5dd2de` |
| `app/static/data/municipalities.pmtiles` | 3.463 | `bcf12dbc5747fb28b62944fca75d421d9de5770e1546bd14ef00697198673ecb` |
| `data/processed/g0/buildings_all.geojson` | 12.227.602 | `607b45875686e920332c6901a731fb37a446daffdc68cc628d5d869f532ea3a7` |
| `data/processed/g0/cells_all.geojson` | 79.944 | `791beae4c44f358950510344bcc3d9f6983358cf2c39e68700caf7530451d62d` |
| `data/processed/g0/municipalities.geojson` | 115.295 | `afc70ecd38451fb1956bf0cd04874c714dcecf338491f2efa7706b2a56014368` |
| `data/processed/g0/buildings_020.fc.geojson` | 9.422.538 | `49a4165070aa15af75b4c24d7625ba7196414cd64f53e0e3f38d571aaa652b56` |
| `data/processed/g0/buildings_054.fc.geojson` | 1.899.358 | `f627bf7ec4183c741e285808632a66058dcad0a1ca3811f2533349198725b394` |
| `data/processed/g0/buildings_908.fc.geojson` | 134.536 | `914f3887724d4035ac7877792072311772932d4d18daff0f61a8b5ef6512ac61` |

> `data/raw/catastro/*.zip` (112 ficheros) y `data/interim/catastro/**` no se versionan;
> los `sha256` de descarga están en `evidence/g0/02-recon/recon-bizkaia.json`.

## Requisito de despliegue

`*.pmtiles` **exige HTTP Range** (`Accept-Ranges: bytes`, respuestas `206`). Un servidor
sin Range hace fallar el source `pmtiles://` en el navegador (hallazgo de G0).
