# ACCESSIBILITY

Objetivo: **WCAG 2.2 AA** donde sea aplicable. La historia debe contarse igual
sin animación, sin color y sin ratón.

## 1. Requisitos por área

### Teclado
- Toda la funcionalidad accesible por teclado, sin trampas de foco.
- Orden de tabulación lógico: campos → CTA → mapa → controles → histograma → leyenda.
- `Esc` cierra paneles y disclosures.
- El swipe tiene alternativa por teclado (ajuste incremental con flechas).

### Foco
- Indicador de foco visible y de alto contraste en todos los controles.
- El foco nunca queda "detrás" del mapa o del bottom sheet.

### Labels y semántica
- Los campos del hero tienen `<label>` real (no placeholder-only).
- Símbolos y abreviaturas con expansión accesible.
- Jerarquía de encabezados correcta (un `h1` por vista).

### Sliders / control temporal
- `role="slider"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow`,
  `aria-valuetext` («año 1987»).
- Instrucciones de teclado asociadas (`aria-describedby`).
- Cada cambio de valor actualiza el resumen textual (región `aria-live` educada).

### Color
- Contraste mínimo 4.5:1 en texto; 3:1 en componentes y gráficos.
- **El significado no depende solo del color**: `UNKNOWN` lleva patrón y etiqueta.
- Verificar en protanopía/deuteranopía.

### Contenido textual alternativo de las visualizaciones
- Cada visualización esencial tiene un **resumen textual** equivalente:
  - mapa/timeline → «En {place}, de {known} edificios con año conocido, {n} se
    terminaron después de {year}»;
  - histograma → pico de la distribución y cobertura;
  - swipe → descripción de las dos campañas comparadas con fuente y fecha.

### Movimiento
- `prefers-reduced-motion: reduce` ⇒ sin autoplay, sin transiciones animadas;
  los cambios son instantáneos con actualización de texto.

### Táctil
- Áreas táctiles ≥ 44 × 44 px.
- El mapa no debe secuestrar el scroll de la página.
- Bottom sheet operativo con una mano.

### Zoom de texto
- La interfaz debe seguir siendo usable con zoom de texto hasta 200 %.
- Nada de alturas fijas que corten contenido.

### Orientación
- Funcional en portrait y landscape; sin bloquear orientación.

## 2. Pruebas (en `tests/accessibility/`)

- `axe` automatizado sobre hero, resultado, timeline, comparador, cómo lo sabemos.
- Recorrido 100 % por teclado de los flujos principales.
- Smoke con lector de pantalla (NVDA) de: elegir año, elegir lugar, mover timeline,
  abrir metodología.
- Comprobación de contraste y de simulación de daltonismo.
- Verificación de `prefers-reduced-motion`.
- Prueba de zoom de texto 200 % y de portrait/landscape.

## 3. Criterios de aceptación

- [ ] Cero violaciones críticas de `axe` en las vistas principales.
- [ ] Flujo hero → resultado completable solo con teclado.
- [ ] Resumen textual presente para mapa, histograma y comparador.
- [ ] `UNKNOWN` distinguible sin color.
- [ ] Sin animación obligatoria para comprender la historia.

---

# Contrato de accesibilidad de G1 (preregistrado)

> Verificable en `docs/gates/G1.md` §ACCESSIBILITY (8 criterios binarios).

## 4. Umbral de `axe`

**0 violaciones** de las reglas automatizables A/AA en los **6 estados canónicos**:
`INTRO`, `RESULT` (celdas), `EDIFICIO`, `NOT_COVERED`, `SERVICE_ERROR`, `DATA_LOW_COVERAGE`.
Un umbral distinto exigiría justificación **antes** de implementar.

## 5. Journey por teclado

Orden de foco obligatorio: `año` → `lugar` (combobox) → `CTA` → `mapa` → `leyenda` →
`distribución` → `ortofoto` → `compartir`. `Esc` cierra desplegables y la hoja inferior.
Foco visible en todos los controles, sin trampas de foco.

## 6. Búsqueda de lugar

Patrón **`combobox`** conforme a ARIA APG: `aria-expanded`, `aria-controls`,
`aria-activedescendant`, navegación con flechas, `Enter` selecciona, `Esc` cierra, anuncio
del número de resultados.

## 7. Mapa sin depender del canvas

El canvas **no** es la única vía de información:

- **Alternativa textual del mapa** (siempre en el DOM): «En {municipality} hay {total}
  edificios actuales; {known} tienen año conocido y {after} se terminaron después de
  {selected_year}.»
- **Resumen textual de la distribución**: pico por década, cobertura y nota de heaping.
- El **detalle de edificio** vive en una tarjeta fuera del canvas.
- No se intenta hacer enfocables los polígonos individuales: destruiría la experiencia.
  La selección es un extra, no el único camino.

## 8. Anuncios y movimiento

- El cambio de resultado se anuncia por región `aria-live="polite"` con la cifra y el
  denominador nuevos.
- `prefers-reduced-motion: reduce` ⇒ `jumpTo` en lugar de `flyTo`, sin transiciones
  obligatorias; la información es equivalente.

## 9. Texto y táctil

- Zoom de texto 200 % sin recorte ni solapamiento crítico.
- Contraste: texto ≥ 4,5:1; componentes y gráficos ≥ 3:1.
- Objetivos táctiles ≥ 44 × 44 px; sin `hover`-only.

## 10. Lo que no cubre G1

La auditoría completa con lector de pantalla, la revisión de todos los estados no canónicos
y la validación en lectores reales son **G4**. G1 establece el contrato y lo verifica en los
6 estados canónicos.
