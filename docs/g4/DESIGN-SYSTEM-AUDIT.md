# G4-R · DESIGN-SYSTEM-AUDIT — deriva acumulada G1→G3

Fuente: análisis estático de 21 ficheros de estilo (`design-tokens.json`).
**54 colores hex distintos · 7 radios · 3 sombras · 20 tamaños de fuente.**

## Tokens intencionales (el sistema que existe de facto)

| Rol | Valor dominante | Consistencia |
|-----|-----------------|--------------|
| Tinta principal | `#1c1a17` (36 usos, 14 ficheros) | sólido |
| Tinta secundaria | `#55534b` (29) / `#6b6b63` (18) / `#605e56` (7) / `#44423c` (7) | **4 grises-tinta casi iguales — deriva** |
| Acento | `#8e2f4c` granate (21) | sólido — es la marca |
| Acento dato | `#c63b4f` (17) | el rojo de «posteriores» |
| Fondo papel | `#fff` / `#f2f0ec` / `#f7f5f1` / `#eeece6` / `#faf9f6` | **5 fondos papel — deriva** |
| Bordes | `#b9b5aa` / `#d6d3cb` / `#ddd9d0` / `#e0ddd4` / `#d9d8d2` / `#e9e6de` / `#e7e6e1` / `#e3e1da` | **8 grises-borde casi iguales — la mayor deriva** |
| Radio | `8px` (14 usos) domina; `6px`(8), `10px`(7), `2px`(5) | aceptable pero no sistematizado |
| Sombra | solo 3 variantes | sano |
| Texto | `0.78rem`(18), `0.85rem`(19), `0.8rem`(18), `0.75rem`(8) | **0.78/0.8/0.85 compiten — deriva tipográfica** |

## Deriva concreta detectada

1. **Grises-tinta ×4** (`#55534b #6b6b63 #605e56 #44423c`): misma función
   «texto secundario» con cuatro valores. Consolidar a 2.
2. **Grises-borde ×8**: cada componente eligió el suyo. Consolidar a 2
   (borde suave / borde fuerte).
3. **Fondos papel ×5**: `#fff #f2f0ec #f7f5f1 #eeece6 #faf9f6` — decidir
   el papel y la alternativa (máx. 2).
4. **Tamaños 0.78/0.8/0.85 rem** en la misma función (metadato): una
   escala de 4–5 pasos (0.75 / 0.85 / 0.95 / 1.05 / título) cubre todo.
5. **CTAs**: 3 estilos para la misma clase de acción —
   `.btn` granate (ortho), `.btn` oscuro (histmap), `.start` negro
   (address), `.invite` bordeado (compare). El sistema de botones es
   **per-componente**, no un sistema.
6. Colores one-off: `#7a4d00 #d9a441 #6b4d13` (ámbar warning ×3
   variantes), `#2e6b34 #4a6741` (verde OK ×2), `#1c5d8f #123c5c`
   (azul ×2 — verificado: es el marcador de identidad/portal en
   `MapView.svelte:1132,1149`; es un segundo acento funcional no
   declarado — añadir como token `--map-pin` o unificar con acento).

## Lo que el sistema ya hace bien (no tocar)

- Dos tintas + un acento + un color-dato: la base cromática es correcta
  y sobria («ficha catastral»).
- Sin gradientes, sin pills de colores, sin sombras múltiples.
- Familia única (Source Sans 3) con fallback de sistema.
- El rojo `#c63b4f` se reserva al dato «posterior a tu año» — color
  funcional, no decorativo. Mantener la regla.

## Recomendación (para G4, sin implementar)

Un único bloque de tokens (CSS custom properties o constantes):

```
--ink: #1c1a17      --ink-2: #55534b   --ink-3: #7c7c74
--paper: #fff       --paper-2: #f2f0ec
--line: #d6d3cb     --line-2: #b9b5aa
--accent: #8e2f4c   --data: #c63b4f    --warn: #7a4d00   --ok: #2e6b34
--r: 8px            --r-sm: 6px
escala: 0.75 / 0.85 / 0.95 / 1.05 / título
CTA: un solo estilo primario + uno secundario (ghost) para todo opt-in
```

Sustituir los 54 colores por ~12 tokens y los 20 tamaños por la escala.
Beneficio directo en G4: la «secuencia editorial» solo funciona si cada
tramo habla el mismo idioma visual — hoy cada módulo acentúa distinto.
