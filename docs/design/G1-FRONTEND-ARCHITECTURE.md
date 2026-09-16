# G1 — Arquitectura de frontend

> Fase de diseño. **No implementación.** Stack congelado: SvelteKit + TypeScript +
> MapLibre GL JS + PMTiles. Sin backend (ADR-006).

## 1. Principio

Una sola app, **una sola experiencia**, un solo estado temporal. Cada componente con una
responsabilidad y **un** dueño de estado. Sin componentes-dios, sin estado de mapa duplicado,
sin métricas recalculadas en la interfaz.

## 2. Árbol de componentes

```
AppShell                     (layout, i18n, foco, regiones aria)
├─ Hero                       (solo INTRO)
│  ├─ BrandHeader
│  ├─ BirthYearInput
│  ├─ PlaceSearch
│  └─ PrimaryCta
└─ ResultView                 (RESULT y derivados)
   ├─ ResultHeadline          (cifra canónica + año personal)
   ├─ CoverageDisclosure      (C-01/C-02/C-03 + NO_YEAR desglosado)
   ├─ MapView                 (MapLibre, dueño del canvas)
   │  ├─ ScaleController      (niveles y umbrales de zoom)
   │  ├─ LayerLegend          (BEFORE / AFTER / NO_YEAR)
   │  ├─ BuildingTooltip      (C-12 + huella)
   │  └─ OrthoPreview         (opt-in, swipe)
   ├─ DecadeDistribution      (C-09 por décadas + marcador TU AÑO)
   ├─ MethodologyDisclosure   (nivel 3 → nivel 4)
   ├─ LowCoverageNotice       (modificador)
   └─ ShareAction
```

Nombres revisados respecto al borrador del encargo: `ScaleController` es **control de niveles
de escala** y no cambia el universo estadístico; `OrthoPreview` encapsula todo el estado de
ortofoto, incluido `NOT_COVERED`.

## 3. Responsabilidades y contratos

| Componente | Responsabilidad | Entrada | Evento de salida | Estado que **no** posee |
|------------|-----------------|---------|------------------|-------------------------|
| `AppShell` | layout, i18n, foco, `lang`, regiones `main`/`aside` | `children` | — | ninguno de dominio |
| `BirthYearInput` | introducir/validar el año | `selectedYear` | `yearChange` | estadística, mapa |
| `PlaceSearch` | consultar NORA, elegir lugar | `query`, catálogo municipal | `placeChange(municipio, punto?)` | estadística |
| `PrimaryCta` | disparar la transición a `RESULT` | `enabled` | `submit` | — |
| `ResultHeadline` | mostrar el titular con `C-04`/`C-05` y el año | `metrics`, `selectedYear`, `statisticalUnit` | — | cálculo de cuotas |
| `CoverageDisclosure` | publicar `C-01/C-02/C-03` y el desglose de `NO_YEAR` | `metrics` | — | cálculo |
| `MapView` | ciclo de vida del mapa, capas y estilos | `view`, `activeScaleLevel`, `ortho*` | `viewChange`, `buildingSelect` | **universo estadístico** |
| `ScaleController` | decidir nivel y opacidad por zoom | `zoom` | `scaleLevelChange` | estadística |
| `LayerLegend` | leyenda sincronizada | `activeScaleLevel`, `selectedYear` | — | — |
| `BuildingTooltip` | `C-12` + huella + estado del dato | `selectedBuildingId` | — | estadística municipal |
| `OrthoPreview` | carga opt-in, `orthoState`, swipe, fuente y fecha | `orthoCampaign`, punto | `orthoStateChange` | estadística |
| `DecadeDistribution` | `C-09` por décadas + marcador | `metrics`, `selectedYear` | `decadeHover` | `selectedYear` |
| `MethodologyDisclosure` | niveles 3 y 4 | — | — | — |
| `ShareAction` | URL canónica al portapapeles | `urlState` | — | — |

## 4. Propiedad del estado

Un **store** único (`$lib/state`), con tres slices separados:

```ts
// personal
selectedYear: number | null
selectedPlace: Place | null          // { slug, codigoMun, name, point? }
statisticalUnit: Municipality | null // DERIVADO de selectedPlace, nunca del mapa
metrics: MetricsFile | null          // agregados canónicos ya calculados

// map
view: { lat; lon; zoom; bearing; pitch }
activeScaleLevel: 'BIZKAIA' | 'MUNICIPIO' | 'CELDA' | 'EDIFICIO'
selectedBuildingId: string | null

// ortho
orthoCampaign: Campaign | null
orthoState: 'UNKNOWN' | 'AVAILABLE' | 'NOT_COVERED' | 'SERVICE_ERROR'
orthoComparison: boolean
```

Reglas:

- `statisticalUnit` es **derivado** de `selectedPlace` y **de solo lectura** para el mapa.
- `metrics` se **carga** (JSON), no se calcula. `MapView` y `DecadeDistribution` lo consumen.
- `selectedYear` solo lo escriben `BirthYearInput` y el arranque desde URL.
- Ningún componente hijo escribe en un slice que no le corresponde.

## 5. Prohibiciones arquitectónicas

1. **Sin recálculo de métricas en el frontend.** Ni denominadores, ni cuotas, ni cobertura.
   El único cálculo permitido es la **proyección** de un agregado canónico (p. ej. elegir el
   valor de `cum` para el año elegido), tal y como ya hacía el slice G0.
2. **Sin estado de mapa duplicado.** Un solo `MapView`; el swipe usa el mismo mapa (capa
   izquierda/derecha), no un segundo mapa con su propia cámara.
3. **Sin componente-dios.** `MapView` no contiene copy de metodología ni estadística municipal.
4. **Sin lógica de dominio en la UI.** El estado de ortofoto lo produce `OrthoPreview` a partir
   de una **sonda** verificada, no de un `catch` genérico.
5. **Sin dependencias nuevas** que no estén en `OSS_REUSE.md`; cualquier añadido exige ADR.

## 6. Entrega de datos

### 6.1 Artefactos

| Artefacto | Contenido | Zoom | Se carga |
|-----------|-----------|------|----------|
| `municipalities.pmtiles` | 112 polígonos municipales | 0–10 | siempre |
| `cells.pmtiles` | celdas de 500 m de toda Bizkaia con agregados por década | 8–13 | siempre |
| `buildings/{codigo_mun}.pmtiles` | edificios del municipio | 13–16 | **bajo demanda** |
| `metrics/{slug}.json` | agregados canónicos (C-01…C-10) por municipio | — | al elegir lugar |
| `catalog.json` | catálogo de campañas de ortofoto con fechas reales | — | siempre |

- **PMTiles por municipio** para los edificios: el cliente pide por HTTP Range solo las
  teselas visibles, y solo del municipio elegido.
- El **directorio** de un PMTiles se lee al primer acceso; es pequeño frente al fichero.

### 6.2 Evidencia de coste (spike `docs/design/spikes/g1_budget_basis.py`)

| Medición | Valor |
|----------|-------|
| Assets de build (raw / gzip) | 1.339.816 B / **364.587 B** |
| `cells.pmtiles`, encuadre z12 en Bilbao | **7.547 B** (8 teselas) |
| `buildings.pmtiles`, encuadre z14 en Bilbao | **464.599 B** (14 teselas, 11,6 % del fichero) |

> El primer resultado se sirve con **celdas**; los edificios llegan al acercar. Es la razón
> por la que la progresión multiescala es también una decisión de rendimiento.

### 6.3 Requisito de despliegue

PMTiles **exige HTTP Range** (`Accept-Ranges: bytes`, `206 Partial Content`). Sin él, el
source `pmtiles://` falla. Contrato completo en `docs/gates/G1.md` §DEPLOYMENT.

## 7. Rutas

```
/                      INTRO (hero)
/?year=&place=&lat=&lon=&z=   RESULT (misma ruta, estado por URL)
/como-lo-sabemos       nivel 4 (documento, puede prerenderizarse)
```

Una sola ruta de aplicación: evita duplicar el estado entre `/` y `/explorar` y hace que
compartir un enlace reproduzca exactamente el mismo resultado.

## 8. i18n

- `es` es el idioma de trabajo; `eu` queda **estructurado** (claves extraídas) pero **no** se
  publica traducción automática como copy final (`UX_COPY.md` §11).
- Todo el copy vive en un diccionario por claves; **ningún** literal en componentes.
- El contenido de la interfaz se redacta en G1; la revisión lingüística del euskera es de G5.

## 9. Rendimiento y accesibilidad como restricciones de diseño

- `MapView` no se monta hasta que hay `statisticalUnit` (hero sin MapLibre).
- La ortofoto se carga solo por acción explícita.
- Todo dato que solo existe en el canvas tiene **alternativa textual** en el panel
  (`ACCESSIBILITY.md`, contrato G1 §ACCESSIBILITY).
