# G7 — Dirección de arte y arquitectura frontend

> Estado: propuesta congelada antes de implementación (2026-09-21).
> Baseline funcional congelado: `6b5edb1` (G6 cerrado, candidato de datos).
> Alcance: **presentación únicamente**. No se tocan modelo de datos,
> semántica, cálculos, registry de campañas ni comportamiento de estados.
> Before: `evidence/g7/before/` (22 capturas, 360/768/1440/1920).

## 0. Diagnóstico (con capturas)

- **Home**: ~⅔ del viewport vacío; formulario sin unidad (anchos
  arbitrarios, CTA pegado al input); cero evidencia visual de que el
  producto es territorio + foto aérea (`w1440-home`).
- **Resultado**: cifra protagonista correcta, pero el municipio vive
  dentro del titular serif y rompe con nombres largos (`d-result-long`);
  cinco párrafos consecutivos sin jerarquía; edit bar desalineada.
- **FOTO**: rail de 37 pills circulares + scrollbar nativo — parece
  componente técnico, no time machine (`w1440-photo`).
- **Historias**: sumario 100 % textual — el bloque menos fotográfico del
  sitio siendo el que más materia visual tiene (`w1440-full`).
- **Cierre**: una línea de fuentes a 0.75 rem. No existe «qué es esto /
  por qué existe / quién lo hizo / para qué concurso».

## 1. Tokens (extensión de `:root`, compatibles con PALETTE)

Tipografía fluida (`clamp`), sans sistema + Georgia serif (sin webfonts:
cero coste de critical path, decisión deliberada):

| token | valor | uso |
|---|---|---|
| `--fs-display` | `clamp(2.4rem,4.6vw,4rem)` | H1 home (~64 px máx) |
| `--fs-h1` | `clamp(1.9rem,3.2vw,2.9rem)` | H1 resultado (~46 px) |
| `--fs-figure` | `clamp(3.6rem,8.5vw,5.5rem)` | gran cifra (~88 px) |
| `--fs-h2` | `clamp(1.45rem,2.3vw,1.9rem)` | secciones |
| `--fs-body` | `1.02rem` | cuerpo |
| `--fs-meta` | `0.82rem` | metadatos |

Color semántico (reusa valores existentes; nada de saturación nueva):

- `--canvas` = `--paper` `#f5f1e8` (marfil) · `--surface` `#fdfbf6`
  (tarjetas elevadas) · `--ink/-2/-3` sin cambios · `--accent` `#c9403b`
  rojo teja · `--carto` `#3f6f8e` (azul cartográfico = `--before`) ·
  `--topo` `#3d7a44` (verde topográfico, metadatos históricos) ·
  `--line` + `--line-strong` `#b8b0a0`.
- Regla: acento = identidad/acción; azul = dato histórico/mapa;
  verde = metadato contextual; nunca los tres en un mismo bloque.

Contenedores: `--w-text: 44rem` (narrativa) · `--w-page: 75rem`
(chrome/contenido) · mapa full-bleed. **Nada mide el ancho del monitor.**

## 2. Arquitectura de superficies

### HOME (`Hero.svelte` + nuevo `HeroVisual.svelte`)

Grid `55/45` ≥1024 px; columna única debajo.

- Izq: eyebrow marca+reto → H1 (≤64 px) → intro → **form grid**
  `[año 10rem | lugar 1fr | CTA auto]`, altura única 52 px, labels
  alineados, `max-width 44rem`, errores bajo su campo → privacidad +
  línea de fuentes.
- Der: `HeroVisual` — díptico **real** `ortho-previews/1956.jpg` |
  `2025.jpg` (mismo bbox oficial, evidencia first-party ya verificada),
  corte vertical con divisor y chips «1956»/«hoy» + caption con fuente.
  `loading="lazy"` (las imágenes están por debajo del fold en móvil).
  Sin stock, sin ilustraciones.

### RESULTADO (`ResultView.svelte`)

- Topbar: marca · `1987 · Leioa` como chip informativo · `Cambiar` ·
  `Compartir`. Editando → formulario centrado `max-width 46rem`, tres
  controles misma altura, errores bajo su campo.
- Headline reestructurado: `Eres mayor que el` (sans pequeño) →
  `47,6 %` (figure) → `de los edificios actuales de {municipio}`
  (subtítulo, NO dentro del titular gigante) → traducción humana →
  denominador/cobertura compactos.
- Fila de hechos (≤4 mini-cards con icono): posteriores a ti · población
  entonces/hoy · campaña más cercana · década dominante. Cards
  `--surface`, borde `--line`, sin dashboard-look.

### ViewSwitch (IA)

Mismas intenciones, copy ciudadano:
- grupo «El dato» → `Mapa` · `En el tiempo`
- grupo «Ver cómo era» → `Fotos aéreas` · `Mapa 1923–25` · `1956 / hoy`

### Rail de épocas → timeline (`PhotoPanel.svelte`)

Línea horizontal continua sobre la imagen (o bajo ella), ticks por
campaña: **major** (BFA + especiales geoEuskadi) con etiqueta;
**minor** (serie anual 2004–2025) como ticks cortos con etiqueta solo
en hover/focus/selección. Año seleccionado grande fuera del rail.
Máquina intacta: sigue siendo un `role="group"` de botones con roving
tabindex; visualmente dejan de ser pills.

### Historias (`StoriesSection.svelte` + thumbnails reales)

Pipeline `pipeline/g7_story_thumbs.py`: para cada historia, JPEG 640×400
de la campaña `air.c1` centrado en `camera` (mismo mecanismo probado que
`build_ortho_previews.py`: BFA export / geoEuskadi WMS GetMap, verificación
de contenido no monocromo, sha256 + manifest). → `static/data/story-thumbs/`.

Desktop: primera historia destacada (imagen 3/2 grande) + 4 en grid 2×2
con miniatura; móvil: cards verticales. Cada card: imagen + lugar ·
periodo + titular + «Ver en el mapa →`.

### Cierre de página

- `Sobre este proyecto` (texto corto: pregunta, por qué, datos públicos
  oficiales, «Premios al Reto de Periodismo de Datos 2026» — nombre
  verificado en `docs/COMPETITION.md`/decreto, categoría visualización).
- `Datos utilizados` — filas/cards: organismo · qué aporta · cobertura ·
  enlace oficial. Sin logos inventados.
- Footer real: marca · proyecto · metodología (`/como-lo-sabemos`) ·
  fuentes · licencias · repo · concurso · año.
- `/como-lo-sabemos` amplía: pasos del cálculo + `Limitaciones` +
  bloque concurso + tabla de fuentes.

### Iconos

`@lucide/svelte@^1.43.0` (ISC, tree-shaken por icono — el paquete
`lucide-svelte` está deprecated upstream). Uso: hechos del resultado,
fuentes, footer, CTAs secundarios. Jamás delante de cada línea de texto.

## 3. No-go explícitos

- No se cambian `STORIES`, `CAMPAIGNS`, métricas, ni copy contractual.
- No se cargan las 37 ortofotos ni se precargan imágenes: todo lazy.
- No se toca el canvas MapLibre ni las sondas.
- Se conservan PERF4 contracts, axe, NV-*/MOB-* (los esperados de las
  tablas congeladas se actualizarán SOLO si un nombre accesible cambia —
  se documentará en el commit).
- Sin animaciones decorativas; `prefers-reduced-motion` intacto.

## 4. Verificación

`g7_shots.mjs after` (mismas 22 vistas) + `check/lint/test/build` +
`g2b_views` + `g5_swipe` + `perf4_lazy` + `perf4_critical_path` +
axe por modo + revisión humana de capturas.

## 5. As built (post-implementación)

Implementado según la propuesta, con estos ajustes resueltos en captura:

- El hero usa wrapper `.copy` + `HeroVisual` hermano (el `grid-row:1/-1`
  implícito repartía filas y dejaba el CTA bajo el fold); móvil usa
  `display:contents` + `order` para intercalar el visual entre intro y
  formulario.
- La timeline es posición real por año (`left: %`), no flex de pills:
  `min-width = span·15px` en contenedor con scroll sin scrollbar;
  etiqueta permanente solo si ≥3 años de la anterior etiquetada
  (`labeled` derivado); «tu año» etiquetado sobre la línea en acento.
- El díptico usa los previews provinciales existentes (la zona negra es
  territorio fuera de cobertura de la campaña — honesto, no recortado).
- Topbar resultado en ≤700 px: el chip de contexto baja a su fila;
  nunca estrangula los botones.
- `facts.pop` muestra el **año observado** del padrón
  (`population.period`), no el año del usuario.

Verificación post-G7: `check` 0 errores · `lint` limpio · `test`
140/140 · `build` OK · `g2b_views` 27/27 PASS (incl. axe) · `g5_swipe`
PASS (1956 explícito) · `perf4_lazy` + `perf4_critical_path` PASS.
After: `evidence/g7/after*` (22 vistas × 3 tandas).
