# Wireframes G1 — «Tu Bizkaia»

Documentos **estáticos** de diseño. No son la aplicación, no se importan desde `app/`.
Copy real aproximado (sin lorem ipsum). Viewports de referencia tomados de la evidencia G0.

| Fichero | Viewport | Estado | Qué fija |
|---------|----------|--------|----------|
| [`desktop-hero.svg`](desktop-hero.svg) | 1440×900 | `INTRO` | jerarquía del hero, dos campos, un CTA, privacidad, **sin MapLibre** |
| [`desktop-result.svg`](desktop-result.svg) | 1440×900 | `RESULT` (celdas) | titular, denominador + cobertura, mapa full-bleed, leyenda, distribución por décadas, teaser de ortofoto |
| [`desktop-building.svg`](desktop-building.svg) | 1440×900 | `EDIFICIO` | edificios individuales, clases visuales, `NO_YEAR` con trama, detalle accesible fuera del canvas |
| [`mobile-hero.svg`](mobile-hero.svg) | 390×844 | `INTRO` | una columna, objetivos táctiles, un CTA |
| [`mobile-result.svg`](mobile-result.svg) | 390×844 | `RESULT` | mapa + **bottom sheet** con la distribución y el teaser de ortofoto |
| [`mobile-detail.svg`](mobile-detail.svg) | 390×844 | `NOT_COVERED` + edificio | los tres estados de ortofoto y el detalle de edificio en hoja inferior |

## Principios aplicados en los wireframes

1. **El mapa es protagonista del resultado, no de la entrada.** El hero no monta MapLibre.
2. **Titular, denominador y cobertura forman una unidad**: nunca se separan.
3. **Una sola visualización temporal**, por décadas, con el marcador del año exacto.
4. **El zoom no cambia la cifra.** Los wireframes lo anotan explícitamente en el mapa.
5. **`NO_YEAR` se dibuja con trama**, no con color, y su desglose numérico está siempre arriba.
6. **La ortofoto es opt-in** y sus estados se distinguen (`AVAILABLE` / `NOT_COVERED` / `SERVICE_ERROR`).
7. **Móvil primero de verdad**: hoja inferior, objetivos ≥ 44 px, sin panel lateral fijo.

## Cómo revisarlos

Abrir los `.svg` en un navegador. Cada uno incluye anotaciones numeradas y dimensiones.
Un `.svg` no es un mockup de alta fidelidad: es la **estructura de información** y el **copy**
lo que se revisa aquí. El sistema visual definitivo vive en `VISUAL_SYSTEM.md`.
