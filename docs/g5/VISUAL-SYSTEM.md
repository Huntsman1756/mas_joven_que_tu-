# G5 · SISTEMA VISUAL

> Objetivo (feedback 2/3/10): paleta más viva, menos cajas, más
> tipografía editorial y aire. Que no parezca un dashboard ni un
> grid generado. Todos los colores cumplen WCAG AA en su uso
> previsto (texto sobre fondo ≥4.5:1; ≥3:1 para texto grande y
> elementos de UI).

## Paleta

| Token | Valor | Uso |
|-------|-------|-----|
| `--paper` | `#f5f1e8` | fondo editorial cálido (página) |
| `--paper-2` | `#efe9dc` | banda de controles sobre el mapa |
| `--ink` | `#191817` | texto principal, ejes, acción primaria |
| `--ink-2` | `#4a463f` | texto secundario |
| `--ink-3` | `#6e6a60` | notas, fuentes (≥ AA sobre paper) |
| `--accent` | `#c9403b` | «después de tu año», CTA, marca editorial |
| `--accent-deep` | `#8e2f2c` | titulares de marca, fin de rampa |
| `--before` | `#3f6f8e` | «ya existía» (azul claro vivo) |
| `--after` | `#c9403b` | «después de tu año» (= accent) |
| `--after-both` | `#2f2c28` | DOS AÑOS: posterior a ambos |
| `--noyear` | `#e2ded4` | relleno «sin año» |
| `--noyear-stroke` | `#7c7868` | borde/hatch «sin año» (segundo canal) |
| `--line` | `#d8d2c4` | separadores (más cálido que antes) |
| `--warn-bg` | `#fbf0d8` | avisos |
| `--warn-line` | `#b07a1e` | borde de aviso (AA como texto `#6b4d13`) |
| `--focus` | `#191817` | outline de foco |
| Rampa cuota | `#f3ede2 → #eec9b8 → #dd9385 → #c9403b → #8e2f2c` | share 0→1 (más caliente y contrastada que la anterior) |

Justificación: la paleta anterior (`#f2f0ec` + `#8fa3b8` + `#c63b4f`)
era correcta pero apagada. La nueva calienta el papel, sube la
saturación del azul «antes» y hace el carmesí más terroso/profundo —
lectura editorial, no clínica.

## Tipografía

- Display/titulares: la familia serif de sistema (`Georgia`,
  `'Iowan Old Style'`, `serif`) en h1/hero/cifra principal — aire
  editorial sin añadir fuentes web al critical path.
- Texto/UI: `Source Sans 3` (ya empaquetada) — sin cambios.
- Cifra principal: `font-variant-numeric: tabular-nums`, tamaño
  `clamp(3rem, 9vw, 5.5rem)` — el dato ES el titular.
- Jerarquía por peso/espacio, no por cajas.

## Geometría de superficie

- `border-radius` permitido solo en: controles, inputs, leyenda de
  mapa, tooltips, píldoras de estado — nunca en contenedores de
  sección de contenido (GV1: ≤2 en RESULT medido por sonda).
- Secciones separadas por espacio + una línea fina `--line` o por
  kicker tipográfico; nada de tarjetas anidadas ni sombras de
  «panel».
- La «hoja» `.sheet` de G4 desaparece: la lectura fluye sobre papel.

## Mapa

- Fondo del lienzo = `--paper` (el mapa se integra, no es una app
  empotrada).
- Celdas: relleno por cuota SIN borde de rejilla visible a zoom
  medio (los bordes solo aparecen por interacción/selección o como
  guía sutil muy tenue); municipios mantienen su línea.
- «Sin año» = hatch diagonal (segundo canal no-cromático, GA2).
- Leyenda: una sola, flotante abajo-izquierda, compacta; incluye
  la rampa con «menos/más» y la nota de universo.

## Movimiento

- Respeta `prefers-reduced-motion` (scroll instantáneo, sin
  animaciones de Play: los controles paso-a-paso ya existen).
- Sin autoplay en ningún modo.
