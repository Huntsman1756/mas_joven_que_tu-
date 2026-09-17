# ADR-011 — Preview progresivo de ortofoto (first-party, misma campaña)

- **Estado:** aceptado
- **Fecha:** 2026-09-17
- **Verificado:** 2026-09-17 (spike G1-R2, 2×20 reps perfil P2)
- **Modifica:** ADR-004 (condición (d) de «caché de raster propia» ya demostrada)

## Contexto

PERF10 (`t_ortho_visible` = clic «Ver la foto» → primera imagen de ortofoto
visible, p75 ≤ 3000 ms en P2) falla cuando el upstream `geo.bizkaia.eus` entra en
fase degradada: el TTFB de una tesela oscila entre ~0,17 s y ~3 s para la misma
tesela, y ninguna palanca cliente lo controla (preconnect ≈ +0 ms medido,
concurrencia correcta, `/export` imagen única peor). Medido en
`docs/gates/G1-R2-PERF10-SPIKE.md`.

## Decisión

Tras el opt-in explícito («Ver la foto») se añade, **por debajo** de las teselas
oficiales, una `ImageSource` con un preview JPEG de **la misma campaña oficial**,
a baja resolución (~1024 px), georreferenciado al extent real del parque
edificado, servido same-origin desde `data/ortho-previews/{año}.jpg`.

- Generación reproducible: `pipeline/build_ortho_previews.py` (endpoint `/export`
  de cada campaña ODB; WMS GetMap para geoEuskadi 2025). Nada manual.
- Cada preview queda vinculado en `data/ortho-previews/manifest.json` (campaña,
  recurso origen, bbox, CRS, dimensiones, sha256, fecha, licencia CC BY 4.0).
- El preview no es placeholder ni otra fecha: es la propia ortofoto oficial
  remuestreada. Las teselas de alta resolución la refinan al llegar; gana lo que
  se pinte primero.
- Antes del opt-in: 0 requests de imagen ortográfica (P5 se mantiene; el contador
  del harness incluye `ortho-previews/`).
- Cambio de campaña: la source del preview se sustituye junto a la oficial; una
  carga tardía de la campaña anterior no puede pintarse.
- El preview compite por el pool HTTP/1.1 same-origin con el resto de la app:
  el prefetch en `idle` de series de celda (`data/cells/*.json`, ~12 municipios
  visibles) iba en ráfaga y retrasaba la request del preview ~2,5–3 s medidos
  con CDP (dev-tools + harness de sesión caliente). Ese prefetch y las cargas
  perezosas de tooltips pasan por una **cadena serializada** (`queueCellSeries`):
  trabajo de fondo que ya no bloquea peticiones interactivas.

## Motivos

- Elimina la dependencia perceptual del estado instantáneo del ArcGIS público:
  p75 ~1,8 s independiente del upstream (spike: 1.764 / 1.780 ms, max ≤3,1 s).
- Respeta la definición congelada de PERF10: la primera imagen visible sigue
  siendo una ortofoto real de la campaña seleccionada.
- Coste acotado: ~1,5 MB estáticos para las 10 campañas; no es caché completa.

## Consecuencias

- `catalog.json` lleva `preview: {url, bbox}` por campaña; tests fijan la
  consistencia manifest↔catálogo↔ficheros↔extent real.
- El evaluador PERF10 acepta el primer render de `ortho-preview` **o** de tesela
  `ortho` (lo que vea el usuario primero); el diagnóstico
  `t_ortho_all_viewport_tiles_loaded_diag` se conserva sin efecto en el gate.
- Regenerar previews = re-ejecutar el script + commit (manifest fija sha256).
