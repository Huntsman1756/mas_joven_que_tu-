# G3-C — Mapa histórico 1923–1925

Estado: **PREREGISTRADO** (congelado antes de implementación). Baseline:
G3-B `36fa5cc` en `g3b-planning-context`. Rama: `g3c-historical-map`.

Objetivo: integrar la cartografía histórica oficial 1:25.000 (1923–1925) de
Open Data Bizkaia como **cuarta superficie de evidencia temporal**, sin
confundirla con ortofotografía.

Fuera de scope: módulos de contexto (ruido, movilidad, montes — son G3-D),
rutas nuevas, deltas de snapshot, prosa editorial final de historias.

---

## 1. Fuente (congelada)

Dataset ODB `hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas`
(Diputación Foral de Bizkaia). Recursos verificados en G3-X:

- **WMTS** `ORTO_EJ_CARTO_1925` — TileMatrixSet `default028mm` en **EPSG:25830**
  (19 niveles, tesela 512 px JPEG). Inutilizable directo en MapLibre (3857).
- **ArcGIS REST `export`** sobre el mismo MapServer — reproyección
  server-side a `imageSR=3857` verificada con contenido
  (`evidence/g3/g3x/export_3857_bilbao.jpg`, `export_3857_detail.jpg`;
  Deusto/ría legible a nivel edificio, ~0,3–0,5 s por petición 512²).
- **WMS INSPIRE** `KartografiaHistorikoa_CartografiaHistorica_25000` —
  `layers=0` devuelve **índice toponímico de hojas, no la cartografía**;
  solo tiene capas 0/1 sin la serie histórica → no sirve para el producto.
- **ZIP** opengis (descarga de hojas) — queda como fallback documentado, no
  se usa en runtime.

**Decisión congelada**: superficie = **raster opt-in servido por
`MapServer/export` con `bboxSR=imageSR=3857`**, patrón `{bbox-epsg-3857}`
de MapLibre. Es un **MAPA, nunca ortofoto**: no entra en el catálogo de
campañas fotográficas ni hereda su UI.

Semántica: nominal 1923–1925 **por hoja**, no fecha exacta por píxel.
El copy nunca lo presenta como instantánea exacta.

## 2. UX

Tres superficies temporales de evidencia visual:

```
MAPA HISTÓRICO 1923–25        (este gate)
FOTOGRAFÍA AÉREA 1956 …       (G1, vigente)
MAPA / CATASTRO ACTUAL        (base)
```

- Opt-in explícito: **0 peticiones** de mapa histórico antes de acción del
  usuario (mismo contrato P5 que ortofotos).
- Misma cámara/extent geográfico que la escena actual al activarlo.
- Comportamiento progresivo/fallback explícito: si el servicio falla,
  estado `unavailable` con texto, nunca espacio en blanco silencioso.
- No se inserta «1925» en la lista de campañas de ortofoto.
- DOS AÑOS: el mapa histórico es **superficie de evidencia**, no un tercer
  ancla estadística — no interactúa con `play_year`/`compare`.

## 3. CRS (regla congelada)

- Fuente: `EPSG:25830`. Visualización: `EPSG:3857`.
- La reproyección se delega al servidor (`imageSR=3857`) — **prohibido**
  asumir matrices de tesela Web Mercator para un servicio nativo 25830.
- Verificación determinista: una petición de calibración documentada
  (`evidence/g3/g3x/export_3857_detail.jpg`) fija el punto de control.

## 4. MI EDIFICIO

Desde un edificio/lugar resuelto, el usuario puede saltar al **mismo punto**
en el mapa histórico (mismo centro, zoom adecuado).

Prohibido inferir existencia/inexistencia del edificio actual a partir del
mapa salvo que la fuente lo soporte explícitamente. Copy seguro: «la
cartografía 1923–25 representa…», nunca «tu edificio no estaba aquí».

## 5. Copy contract

Permitido:

- «Mapa histórico 1923–1925»
- «La cartografía 1:25.000 representa…»
- «Nominal por hoja: cada hoja tiene su propia fecha de levantamiento.»

Prohibido:

- «Así era exactamente…», «Aquí no había…», «Tu edificio no existía…»
- Cualquier terminología de fotografía aérea («foto», «vuelo», «campaña de
  ortofoto») aplicada a esta superficie.

## 6. Criterios de aceptación

- **GC1.** Gate preregistrado + commit antes de implementar.
- **GC2.** Manifest de fuente: URL servicio, dataset CKAN, retrieved_at,
  licencia, CRS, snapshot id, evidencia de contenido.
- **GC3.** 0 requests históricos antes del opt-in (medido en sonda de red).
- **GC4.** Activación muestra el mismo centro/extent; salto desde MI
  EDIFICIO centra el punto resuelto.
- **GC5.** Fallo del servicio → estado `unavailable` textual; la
  experiencia principal no se rompe.
- **GC6.** Copy contract cumplido (copylint + revisión).
- **GC7.** a11y: equivalente textual (fuente, fecha, qué es), teclado,
  320 px, 400 %, reduced-motion; la evidencia no vive solo en imagen.
- **GC8.** Perf: primer uso / uso repetido / heap medidos; sin descarga
  global de Bizkaia.
- **GC9.** No regresión: G3-B, G3-A, G2-A, G2-B, G1 (perf), check, lint,
  format, tests, build; Chromium + Firefox + WebKit.
- **GC10.** Reporte `evidence/g3/g3c/REPORT.md` con matriz A–J y veredicto.

STOP tras el reporte. G3-D (módulos de contexto) es fase aparte.
