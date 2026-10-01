# Lectura móvil y estabilidad — 1 octubre 2026

Estado final, publicación y fallos conservados: [RELEASE.md](RELEASE.md).
Los cambios mantienen datos, cifras, fuentes y denominadores.

La portada muestra ejemplos persistentes junto a campos vacíos en ES/EU.
En móvil, cifras y universo preceden al mapa; síntesis y límites van después.
La contención del lienzo conserva los mínimos y el resize existente.

`baseline-position.json` compara el build publicado anterior `252edcd`
con el candidato en 390 × 844: el mapa queda unos 173 px más cerca.
`ci/` contiene los informes del commit exacto; `public-*` conserva también
los intentos fallidos y la alternativa Firefox Linux headed.

Los ensayos Linux fallidos se mantienen: no validan Firefox headless.
`linux-before.json` reproduce ResizeObserver en un artefacto local anterior;
`linux-css-control.json` es un ensayo inyectado, no prueba del CSS compilado.
`layout-linux-settled/` pasa WebKit headless local, incluidas 40 aperturas.
La verificación headed de CI usa el digest fijado del contenedor.

La prueba G13 usa respuestas NORA sintéticas solo para la cancelación.
No certifica una dirección real. No se filtran errores de página.
La observación humana está preparada en `docs/UX_OBSERVATION.md`, sin sesiones
ni resultados inventados. «Adibidez» se reutiliza del diccionario existente;
no equivale a revisión nativa de euskera ni QA con móviles físicos.
