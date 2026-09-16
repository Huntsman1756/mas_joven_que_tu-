# data/manifests — esquema

Cada fuente usada por el producto tiene un manifest reproducible en este directorio.
Los manifests **sí** se versionan; los datos crudos (`data/raw/`) no.

## Esquema (`<source_id>.yaml`)

```yaml
source_id:           # identificador estable
source_name:         # nombre legible
publisher:           # quién publica
source_url:          # portal
dataset_url:         # página del dataset
resource_url:        # URL concreta del recurso consumido
retrieved_at:        # ISO 8601, cuándo lo descargamos
published_at:        # ISO 8601 si consta
modified_at:         # ISO 8601 declarado por la fuente
nominal_date:        # fecha nominal (p. ej. año de campaña)
actual_date_or_range:# fecha/rango real si consta (p. ej. vuelo 1956-57)
license:             # licencia del DATO (no del software)
attribution:         # texto de atribución exigido
crs:                 # p. ej. EPSG:25830
format:              # GML, SHP, CSV, WMS, WMTS, WFS, JSON
sha256:              # si hay snapshot descargado
notes:               # observaciones
limitations:         # límites conocidos / incertidumbres
status:              # VERIFIED | PENDING
```

## Reglas

- La licencia es del **dato**; no se hereda de la licencia del software.
- Si la fuente declara licencia a nivel de **recurso** y no de **dataset**, se usa la del
  recurso (es el caso de Open Data Bizkaia).
- `PENDING` = duda abierta; **no** asumir su valor.
- Cualquier métrica derivada debe poder rastrearse hasta un `source_id` de aquí.

Ver `docs/DATA_SOURCES.md` y `docs/METHODOLOGY.md`.
