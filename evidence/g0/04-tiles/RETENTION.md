# G0 — Artefactos pesados: política de retención

Los artefactos derivados que se pueden regenerar con el pipeline **no se versionan**
en Git (regla del gate §22: «No llenar Git con artefactos enormes»). Se registran aquí
con `path`, tamaño y `sha256`.

Regeneración:
- `python pipeline/g0_slice.py` → `data/processed/g0/*.geojson`, `*.parquet`
- `powershell -File scripts/g0_build_tiles.ps1` → `app/static/data/*.pmtiles`

## Versionados (artefacto analítico estable)

| path | bytes | sha256 |
|------|-------|--------|
| `data/processed/g0/buildings_020.parquet` | 2.655.xxx | ver `evidence/g0/03-data/buildings_020.parquet.sha256` |
| `data/processed/g0/buildings_054.parquet` | ~0,56 MB | ver `.../buildings_054.parquet.sha256` |
| `data/processed/g0/buildings_908.parquet` | ~0,04 MB | ver `.../buildings_908.parquet.sha256` |

## NO versionados (regenerables; hashes verificados 2026-09-16)

| path | bytes | sha256 |
|------|-------|--------|
| `app/static/data/buildings.pmtiles` | 3.992.503 | `3c4ab53d6813fc446ae98cfd1eee20b8e18507af17b21db474e5c5f256a7794c` |
| `app/static/data/municipalities.pmtiles` | 3.463 | `bcf12dbc5747fb28b62944fca75d421d9de5770e1546bd14ef00697198673ecb` |
| `data/processed/g0/buildings_all.geojson` | 12.227.010 | `23d41426cec19c9179ffa739d9b5017c4934bd68ca7fe7b8902c14969646ba7f` |
| `data/processed/g0/buildings_020.fc.geojson` | 9.600.958 | `fcf0e47f704740dc9f9c293c7d8480cc469eca9298a4da4222cd1210c5f7998a` |
| `data/processed/g0/buildings_020.geojson` | 8.116.234 | `8ef8e5d9d559435bce3c5f520c8ce8904c59cc8022b0b46d3d6b39b72d620be7` |
| `data/processed/g0/buildings_054.fc.geojson` | 1.930.296 | `9e9d48a0b96a03d02fe13cadbcb0f73045c69984f1075d3d64799772972028e3` |
| `data/processed/g0/buildings_054.geojson` | 1.672.265 | `9ef300948090310cb12ef788c4cb1780b8ab9813d55a3446f82b3c8cdc2a5d58` |
| `data/processed/g0/buildings_908.fc.geojson` | 137.712 | `9f84ca5dd6a028fff0cea9f108aefd671cd195c9ec921612f956eb35e711c6c0` |
| `data/processed/g0/buildings_908.geojson` | 110.396 | `e430e2fe491971b9352b4e69ba4891dfe32e380f41ccb1552b00a00bc5cea5e8` |
| `data/processed/g0/municipalities.geojson` | 115.295 | `afc70ecd38451fb1956bf0cd04874c714dcecf338491f2efa7706b2a56014368` |

> Los `*.parquet` son el artefacto **canónico** (geometría en `OGC:CRS84` = lon/lat) y
> su `sha256` queda registrado en `evidence/g0/03-data/`.
