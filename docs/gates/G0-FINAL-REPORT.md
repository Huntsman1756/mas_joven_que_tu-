# G0 — INFORME FINAL

> Ejecución del gate preregistrado en `docs/gates/G0.md`.
> **El fichero del gate no se modificó durante la corrida.**

## 1. Baseline P0

| Campo | Valor |
|-------|-------|
| Commit base | `5c68d74ee3b8545d97fedba5984b3344b4a0a347` |
| Rama de trabajo | `g0-viability` |
| Remoto | **ninguno** (no se creó ni se publicó nada) |
| Commits de G0 | 7 (`4fde9c9` … `7f78fbc`) |

## 2. Preregistration hash

| Campo | Valor |
|-------|-------|
| `docs/gates/G0.md` sha256 | `f40804f80839452cab89a167671b7cf586eb4406a1f512d6258c57de25c34e64` |
| Congelado durante la corrida | **sí** |

## 3. Fecha y hora

Inicio: `2026-09-16T05:58:27Z` (UTC). Ver `evidence/g0/00-manifest/run-manifest.json`.

## 4. Entorno (preflight PASS)

git 2.55.0 · Python 3.11.15 · **DuckDB 1.5.5 + spatial + `ST_Read`** · shapely 2.1.2 ·
Node 24.19.0 · npm 11.17.0 · **Docker 29.7.2** · **tippecanoe 2.79.0** (imagen
`mjt-tippecanoe:2.79.0`, digest `sha256:4b995193…cf7acf2`).
GDAL CLI ausente → `WARN` opcional (no bloquea, ADR-005).

## 5. Fuentes

- **Principal (Base 1):** Open Data Bizkaia — `parcelario-catastral-<municipio>`,
  112/112 ZIP descargados, `sha256` por fichero, **CC BY 4.0**.
- **Complementaria:** geoEuskadi (ortofotos 2004–2025, NORA), **CC BY 4.0**.
- Manifest consolidado: `evidence/g0/00-manifest/source-manifest-g0.json`.
- No disponible: **Usansolo (916)** — su dataset no publica ZIP.
- Limitación de entorno: el *datastore* y `/download/` del portal devuelven `Request Rejected`
  (WAF) en esta red; la ingesta fue por `opengis.bizkaia.eus`.

## 6. Muestra (congelada, sin cambio)

Bilbao 020 · Leioa 054 · Murueta 908. El **fallback a Lekeitio 057 no se activó**
(no hubo indisponibilidad técnica de la fuente para Murueta).

## 7. Reconocimiento territorial (descriptivo, no selectivo)

**OBSERVED** — 112 municipios procesados (113 en NORA; Usansolo sin ZIP).
139.447 edificios; 138.501 con año `VALID` (**99,32 %** global).
Cobertura mínima **91,59 %** (Izurtza); p25 98,46 %; mediana **99,44 %**; máxima 100 %.
**Ningún municipio por debajo del 90 %**; 4 por debajo del 95 %.
936 valores `SUSPICIOUS`; 16 geometrías inválidas en 13 municipios; 0 geometrías nulas.

**INTERPRETATION** — Leioa (99,79 %) **no es excepcional**: está en la mediana territorial.
La hipótesis del producto no depende de un municipio afortunado. La heterogeneidad real
está en el *heaping* de años y en el tamaño del parque, no en la cobertura.

## 8. QA por municipio

| Municipio | Edificios | `VALID` | `UNKNOWN` | `SUSPICIOUS` | Cobertura | Geom. inválidas | min–max |
|-----------|-----------|---------|-----------|--------------|-----------|------------------|---------|
| Bilbao 020 | 13.750 | 13.738 | 9 | 3 | 99,91 % | 1 → reparada | 1700–2026 |
| Leioa 054 | 2.390 | 2.385 | 0 | 5 | 99,79 % | 1 → reparada | 1700–2025 |
| Murueta 908 | 254 | 245 | 0 | 9 | 96,46 % | 0 | 1800–2024 |

- Valores `SUSPICIOUS` en Leioa: `1500×3`, `1640×2` → sin tratamiento especial, misma regla
  que cualquier otro registro. **No se borran**.
- `Ano_Calcul` ≠ 0: 9 en Leioa — **prohibido como métrica** (ADR-007).
- **Reparaciones registradas** (`geometry-repairs.json`): 2, ambas con `ST_MakeValid`,
  geometría original identificada por `md5`, áreas antes/después y validación posterior.
  **0 geometrías inválidas tras reparación**.
- Heaping 0/5: Bilbao 37,8 % · Leioa 29,0 % · Murueta 43,7 %.

## 9. Contratos de métricas

**OBSERVED** — 28 tests unitarios verdes (`tests/data`). Clasificación del pipeline == función
de referencia: **0 discrepancias** en los 16.394 edificios de la muestra.
C-05 (Leioa 1987) = **47,59 %** con denominador de año conocido (2.385), no del total.
El frontend **lee** agregados precalculados; no recalcula denominadores.

## 10. PMTiles

| Layer | Fichero | Bytes | Zoom | sha256 (12) |
|-------|---------|-------|------|-------------|
| `buildings` | `buildings.pmtiles` | 3.993.187 | 0–16 | `c30e4e75b876` |
| `cells` | `cells.pmtiles` | 40.447 | 8–13 | `91b7fb84d29e` |
| `municipalities` | `municipalities.pmtiles` | 3.463 | 0–9 | `bcf12dbc5747` |

`UNKNOWN` viaja con valor propio (`state='UNKNOWN'`), verificado decodificando una tesela z14.
211 celdas de 500 m con década dominante (multiescala).

## 11. Ortofotos

**OBSERVED** — 42 comprobaciones en vivo: **41 IMAGE_OK**. Bizkaia 1956–2002 (teselas
cacheadas) y geoEuskadi `ORTO_2005…ORTO_2025` (WMS `EPSG:3857`) devuelven **imagen real**.
Modos de fallo probados: `layers` inexistente → **HTTP 200 + XML ServiceExceptionReport**;
bbox en CRS inválido → **HTTP 200 + imagen blanca**.
Latencia (caracterización): 112 ms mediana geoEuskadi, 140 ms Bizkaia.

**INTERPRETATION** — La cobertura es **por campaña**: la campaña 1975 devuelve `404` en
parte de Bilbao y en Murueta. El producto debe caer a la campaña adyacente con aviso.

## 12. Personalización end-to-end

Selección de municipio y año; búsqueda de lugar vía **NORA** (4 casos: éxito, sin
resultado, consulta corta, error de red); filtro anterior/posterior/`UNKNOWN`
(color + **trama discontinua**, no solo color); estadística canónica con denominador y
cobertura; ortofoto más cercana **con desfase declarado**; comparación con `ORTO_2025`
mediante `maplibre-gl-swipe`.

**OBSERVED** — `next_ortho(1987) = 1990` (Δ=3), no 1983 (Δ=4). El ejemplo del encargo era
ilustrativo; manda el contrato C-11.

## 13. Frontend desktop / móvil

**OBSERVED** — 4 capturas, todas **no blancas** (22.437–61.686 colores únicos):
desktop Leioa 1987, móvil Leioa 1987, desktop Bilbao 1975, desktop Murueta 1956.
Navegador: PMTiles servido con **206 Partial Content**; **189–203 teselas de ortofoto, todas 200**;
**0 errores de consola** (salvo el aborto deliberado en la prueba de error de red).
Atribución de ambas fuentes visible.

**Hallazgo:** PMTiles **exige HTTP Range**. Un servidor sin `Accept-Ranges` rompe el source
`pmtiles://` en el navegador.

## 14. Accessibility smoke

4/4 controles con `<label>` real; slider con `aria-valuetext`; teclado cambia el año
(1987→1988 con `ArrowRight`); foco visible (`outline: auto 1px`); **axe-core: 0 violaciones**;
`prefers-reduced-motion: reduce` respeta (sin animación de cámara, mapa y titular operativos).
No sustituye al gate completo de G4.

## 15. Performance — CHARACTERIZATION ONLY

**Sin juicio.** `perf-characterization.json`.

| Valor | Desktop 1440×900 | Móvil 390×844 (dsf 3) |
|-------|------------------|------------------------|
| DOM listo | 20 ms | 19 ms |
| Canvas presente | 91–184 ms | 157–172 ms |
| Primera tesela de ortofoto | 212–324 ms | 231–297 ms |
| Cambio de año (2 frames) | 9–10 ms | 16–18 ms |
| JS heap | 11,4–13,9 MB | 9,5–11,5 MB |
| Transfer total | ≈1,36 MB | ≈1,36 MB |
| JS de build (sin comprimir) | 1.214.081 B | — |

Los **presupuestos numéricos se preregistran para G1** a partir de estos valores.

## 16. Anomalías

936 valores `SUSPICIOUS` y 16 geometrías inválidas documentados y trazados; 2 reparaciones
registradas. Ninguna corrección silenciosa. `UNKNOWN != 0` respetado en pipeline y producto.

## 17. Evidence manifest

```
evidence/g0/
  00-manifest/   run-manifest.json · source-manifest-g0.json
  01-preflight/  preflight-g0.txt
  02-recon/      RECON-SUMMARY.md · datasets.json · recon-bizkaia.{csv,json} · recon-qa-summary.json
  03-data/       qa_*.json · metrics_*.json · geometry-repairs.json · slice-summary.json · *.parquet.sha256 · pytest-data.txt
  04-tiles/      RETENTION.md · tiles-hashes.json · buildings.log · municipalities.log · cells.log
  05-orthos/     ORTHOS-SUMMARY.md · orthos-live.json
  06-frontend/   FRONTEND-SUMMARY.md · browser-evidence.json · a11y-smoke.json · aggregates-generated.json
  07-perf/       perf-characterization.json
  08-screenshots/ *.png · screenshot-analysis.json · screenshots.json
```

Artefactos pesados fuera de Git con `path`/`size`/`sha256` y política de retención:
`evidence/g0/04-tiles/RETENTION.md`.

## 18. Evaluación criterio a criterio

> Cada condición se relee **literalmente** de `docs/gates/G0.md`. No se añadieron criterios.

### DATA (§4)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | Descarga reproducible del ZIP por municipio | `g0_discover.py` + `g0_recon.py`, 112/112, `sha256` en `recon-bizkaia.json` | **CUMPLE** |
| 2 | Normalización de los 3 municipios | `g0_slice.py`, 16.394 edificios | **CUMPLE** |
| 3 | `Ano_Constr` utilizable; `UNKNOWN` separado | `qa_*.json`; Bilbao 9 `UNKNOWN` | **CUMPLE** |
| 4 | Política de anomalías aplicada | `VALID/UNKNOWN/SUSPICIOUS/INVALID`, 0 discrepancias vs función de referencia | **CUMPLE** |
| 5 | `ST_IsValid` revisado; inválidas por `ST_MakeValid` **con registro** | `geometry-repairs.json` (2, con `md5` original, operación, área antes/después, validación) | **CUMPLE** |
| 6 | Cobertura medida por municipio | 99,91 / 99,79 / 96,46 % | **CUMPLE** |
| 7 | Agregados por municipio y por celda/década, deterministas | C-09/C-10 + 211 celdas de 500 m (`cells.pmtiles`) | **CUMPLE** |
| 8 | `footprint_area_m2` en `EPSG:25830` sobre geometría válida | `g0_slice.py` (área en 25830; salida en `OGC:CRS84`) | **CUMPLE** |
| 9 | Reconocimiento de los 113 municipios archivado | 112/113; Usansolo sin ZIP documentado | **CUMPLE** |

### TILES (§5)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | tippecanoe por la vía congelada | Docker 2.79.0, imagen verificada | **CUMPLE** |
| 2 | PMTiles del ámbito de la muestra | 3 layers | **CUMPLE** |
| 3 | Zooms múltiples | buildings 0–16; cells 8–13; municipalities 0–9 | **CUMPLE** |
| 4 | `UNKNOWN` con valor propio | tesela z14 decodificada: `state` incluye `UNKNOWN` | **CUMPLE** |
| 5 | Medición caracterizada (sin juicio) | `perf-characterization.json` | **CUMPLE** |

### ORTHOS (§6)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | Bizkaia 1956 / 1983 / 1999–2002 | `orthos-live.json` | **CUMPLE** |
| 2 | geoEuskadi `ORTO_2025` con imagen real | 22.402–36.734 colores únicos | **CUMPLE** |
| 3 | Detección de error WMS HTTP 200 + XML | `SERVICE_EXCEPTION` reproducido | **CUMPLE** |
| 4 | `Cache-Control: private` documentado | `ORTHOS-SUMMARY.md` | **CUMPLE** |
| 5 | Mismo punto/zoom; swipe sincronizado | `SwipeControl` sobre un único mapa | **CUMPLE** |
| 6 | Fuente y fecha real de vuelo visibles | copy + atribución (`2025-07-09/2025-08-04`) | **CUMPLE** |
| 7 | Comportamiento ante fallo del servicio | teselas abortadas → aviso visible, estadística y leyenda operativas, aviso se limpia al recuperar (`browser-evidence.json`) | **CUMPLE** |

### PERSONALIZATION (§7)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | Selector de año funcional | slider 1700–2026 | **CUMPLE** |
| 2 | Selector de lugar vía **NORA** | 4 casos probados en navegador | **CUMPLE** |
| 3 | Filtro `BEFORE`/`AFTER`/`UNKNOWN` distinto | color + trama; leyenda | **CUMPLE** |
| 4 | Estadística con denominador explícito | C-05 + cobertura siempre visible | **CUMPLE** |
| 5 | Ortofoto más cercana con desfase | `2025`/`1990` + Δ y fuente | **CUMPLE** |

### PROVENANCE (§8)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | Manifests completos | `source-manifest-g0.json` + `data/manifests/` | **CUMPLE** |
| 2 | Licencias CC BY 4.0 | recurso + pie de geoEuskadi | **CUMPLE** |
| 3 | Fechas de snapshot | `retrieved_at` / `modified_at` | **CUMPLE** |
| 4 | `sha256` de los ZIP | 112/112 | **CUMPLE** |
| 5 | Principal vs complementaria etiquetada | Base 1 en el manifest | **CUMPLE** |

### UX (§9)

| # | Criterio | Evidencia | Resultado |
|---|----------|-----------|-----------|
| 1 | Prueba desktop | captura 1440×900 | **CUMPLE** |
| 2 | Prueba móvil | captura 390×844 | **CUMPLE** |
| 3 | Sin spinner infinito ante fallo | aviso + degradación elegante | **CUMPLE** |
| 4 | Un único control temporal visible | un slider; dos años solo en la comparación explícita | **CUMPLE** |

### Integridad del gate (§0)

| Criterio | Resultado |
|----------|-----------|
| HEAD inicial == `5c68d74` | **CUMPLE** |
| `G0.md` no modificado durante la corrida | **CUMPLE** |
| Muestra no alterada tras ver los resultados | **CUMPLE** |
| Fallback no activado por datos «feos» | **CUMPLE** |
| Rendimiento no decide el gate | **CUMPLE** |
| Sin `amend` / `squash` / `force push` / remoto | **CUMPLE** |

## 19. Issues encontrados

1. **PMTiles exige HTTP Range.** Requisito de despliegue (no un defecto del producto).
2. **Cobertura de ortofoto por campaña:** 1975 devuelve 404 en zonas de Bilbao y en Murueta.
3. **`EPSG:4326` en DuckDB spatial emite (lat,lon).** Provocó GeoJSON y tiles vacíos; se
   corrigió a `OGC:CRS84`. Riesgo de regresión → cubierto por verificación de bbox.
4. **`ST_IsValidReason` no existe** en DuckDB spatial 1.5.5: el motivo se registra de forma
   genérica; queda la geometría original identificada por `md5`.
5. **WAF** bloquea el datastore del portal en esta red (ingesta por ZIP).
6. **`nearest_ortho(1987)=1990`**, no 1983: el ejemplo del encargo era ilustrativo.
7. **Fuente de límites municipales** sigue sin dataset dedicado (se usó la capa `Municipio`
   del propio ZIP del Catastro).

## 20. Veredicto

```
G0_PASS
```

Los 9 criterios DATA, los 5 TILES, los 7 ORTHOS, los 5 PERSONALIZATION, los 5 PROVENANCE y
los 4 UX se cumplen. No se introdujeron criterios nuevos ni se movieron umbrales.

No se inicia G1.
