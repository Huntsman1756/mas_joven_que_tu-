# Revisión de front por código + sonda — 04-10-2026

Build local `BASE_PATH=''`, servidor del proyecto, fixtures CI (rásteres falsos).
Sonda: `app/scripts/_probe_swipe_overlay.mjs` (elementFromPoint + capturas), datos en
`probe.json`. Limitación: `elementFromPoint` ignora capas `pointer-events: none`, así
que la ocultación visual por el panel «antes» se confirma con captura, no con hits.

| # | Hallazgo | Causa en código | Evidencia |
|---|---|---|---|
| 1 | Antes/ahora: el panel «antes» tapa la atribución y el zoom de MapLibre a la izquierda de la cortina; con «Solo 19xx» desaparecen del todo | `SwipeCompare.svelte` `.swipe { z-index: 5 }` sobre los controles MapLibre (z 2) | `galaxy-s9-solo-antes.png` |
| 1b | En ≤700 px no hay atribución visible de la campaña «antes» | `.src { display: none }` en ≤700 px; el comentario dice que vive «en la ficha del modo», pero `SwipeControls` no la muestra; el mapa «antes» tiene `attributionControl: false` | grep `swipe.src` solo en SwipeCompare |
| 1c | «Solo 19xx»: el chip derecho sigue diciendo «Actualidad · 2025» aunque todo el lienzo es 19xx | `.chip.right` no depende de `pct` | `galaxy-s9-solo-antes.png` |
| 2 | «Solo 19xx»: el asa de la cortina intercepta los clics de «+» del zoom | `.handle` 44 px, `pointer-events: auto`, clamp a `100% - 22px` | probe: zoomIn → `div.handle` (móvil y escritorio) |
| 3 | Aviso «Desliza para comparar» se solapa con la atribución en móvil | `.hint` bottom 3.1rem vs controles `2.9rem + 0.7rem` | probe galaxy: hint [82,497,156,28] ∩ attrib [107,483,203,24] |
| 4 | Escritorio/tablet: la barra de escala queda tapada (leyenda en «Por antigüedad», presets en swipe) | `.legend` abajo-izquierda z 10; escala MapLibre `bottom-left` | probe desktop: scale → `div.legend` / `button` |
| 5 | Enlaces terciarios del capítulo sangrados ~15 px al bajar de línea | `.act.ter` conserva `padding 0.9rem` (área táctil) | código |
| 6 | Móvil: «· » al principio del subtítulo de cabecera | `.brand span { display: block }` con el `·` dentro del span | código |

Descartado: el CTA gris desactivado tiene contraste ~5,4:1 (AA); es decisión de diseño.
