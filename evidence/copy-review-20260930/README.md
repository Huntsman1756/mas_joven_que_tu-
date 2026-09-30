# Segunda pasada de textos y tipografía

La referencia es el build público `52b01bc`, capturado en `before-2/`.
Se inspeccionaron contexto de Mungia y capítulo f4036 a 1440 y 390 px.
La familia ya era Source Sans 3; la diferencia visible venía de tamaños,
colores y una lista sin estilo propio. El porcentaje era de 21,6 px frente
a 15,2 px de frase. Las capturas nuevas se inspeccionan antes de publicar.

Cambios: contexto uniforme de 16 px, interlineado 1,6; porcentajes de 17,6 px
integrados en la frase; nota de geometría visible y sin cursiva; prosa ES más
directa en contexto, cinco capítulos y presentación. Cifras y datos intactos.
Los encabezados de los dos contrastes dejan de mostrar una década que podía
confundirse con la de todos los edificios; el corte se nombra junto a las cifras.
Abanto incluye 2000: ES nombra 2000–2009 y EU solo cambia el corte numérico a
1999, sin nueva traducción automática. Revisión nativa EU pendiente.

`reading-dev-3/report.json`: 19 comprobaciones PASS, cuatro viewports (320,
390, 768, 1440 px), EU a 320, cinco capítulos, método, axe y cero pageerrors.
Es desarrollo, no un build sellado. El runner permanente es
`app/scripts/reading-qa.mjs`; CI usa raster simulado y registra ese alcance.

Se conservan los intentos incompletos: `before/` no activó correctamente el
contexto lazy; `after-dev/` encontró invalidación de chunks al optimizar
dependencias de Vite en el primer arranque. Una navegación nueva tras terminar
esa optimización permitió capturar. `reading-dev/` esperaba un sello inexistente
en desarrollo; `reading-dev-2/` suponía ES tras cambiar a EU. El runner ahora
declara el sello opcional en dev y selecciona ES antes de comprobar su prosa.
Estos intentos no son PASS ni se interpretan como fallos del build publicado.
