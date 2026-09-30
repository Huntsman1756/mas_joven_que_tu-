# Segunda pasada editorial — 30 septiembre 2026

## Cambio visible

Contexto municipal: Source Sans 3, 16 px, interlineado 1,6 y color uniforme
en párrafos, lista de planeamiento y advertencia. Las fuentes conservan una
jerarquía secundaria. Porcentajes: 17,6 px frente a los 21,6 px anteriores,
integrados en la frase. La condición de año conocido y geometría válida sigue
visible, en texto de 14 px sin cursiva.

Se revisaron los cinco capítulos, la presentación y el contexto. Se simplificó
la prosa ES y se eliminaron las décadas ambiguas de dos encabezados. Abanto
nombra el intervalo 2000–2009; en EU solo se corrige el corte numérico a 1999
y esos dos encabezados. No hay traducciones automáticas nuevas. Las cifras,
universos, datos, geometrías y arquitectura permanecen iguales.

PRODUCT.md y UX_COPY.md recogen a la vez la decisión y los criterios de lectura.

## Identidad

Fuente del build: `c353154c4ff60ba32cc98e350afccb40a5a092a6`.
[CI del candidato](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36761374182).
El artefacto app-build se complementa con 115 archivos runtime originales,
sin sustituir ningún archivo compilado: [composición](build-composition.json).
La huella exacta está en [fingerprint.json](fingerprint.json).
Los commits posteriores de documentación no cambian este frontend.

Publicado en [GitHub Pages](https://huntsman1756.github.io/mas_joven_que_tu-/):
commit `ad87d731a822872a3d74a554818fd1d785b62927`, árbol
`48a7779f234d712eed43865638e15af605ee45e1`. Build SHA-256
`7f93e97c959c463fb3163a8c410d8aced7aa9a27e0e3cf28c280e2477b9666e8`,
1322 archivos y 114 PMTiles. [publish.json](publish.json) acredita índice y
árbol iguales byte a byte al build. [Despliegue Pages](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36763644923): success.

## Verificación

- Formato, tipos, lint y build: PASS; svelte-check 0 errores y 0 warnings.
  ESLint mantiene 5 warnings históricos, sin errores: [log](app-ci.txt).
- 279 pruebas Vitest y 18 de servidor/raster/metadatos PASS en esa CI.
- 49 pruebas de datos PASS, sin cambios de datos.
- E2E existente PASS: [log](e2e-ci.txt), incluidos los dos contrastes y su nota
  visible de elegibilidad. No se retiraron asertos, filtros ni pageerrors.
- Lectura en build completo: 19 PASS, cero pageerrors, 320/390/768/1440 px,
  EU a 320 px, cinco capítulos y método: [report](reading-final/report.json).
  Se inspeccionaron las capturas de contexto y capítulo en móvil.
- Primera matriz CI: ocho perfiles PASS; iPhone SE emulado falló por un aviso
  ResizeObserver en la fase de abrir el ejemplo. Se conserva íntegro el
  [resultado fallido](ci-matrix-attempt1/report.json); no se clasifica como PASS.
  La repetición usa el mismo SHA, imagen, scripts, criterios y servicios simulados.
- Repetición CI: cuatro jobs success; nueve perfiles / 108 checks PASS,
  cero pageerrors: [matriz](ci-matrix/report.json). Lectura CI: 19 PASS:
  [report](ci-reading/report.json). No se modificó el build para repetir.
- Integración real separada: iPhone 13 WebKit PASS; escritorio WebKit FAIL
  por timeout de navegación al método, sin pageerrors. No se atribuye una causa
  al proveedor sin evidencia: [report](ci-live/report.json). Es una comprobación
  de caracterización no bloqueante en CI y no se cuenta como PASS global.
- Web pública: 19 checks de lectura PASS con el sello exacto:
  [report](reading-public/report.json). Smoke 9/9 PASS, 26 respuestas aéreas,
  11/12 muestras decodificadas no uniformes; una uniforme no se cuenta como
  evidencia de contenido: [report](../public-smoke/a790ea41-d145-4b32-bc3d-be8ec869a844/report.json).
- Capturas y demo con el mismo sello; escenas desktop, móvil y cortina
  inspeccionadas. Video 76,033 s, 1920×1080, sin audio. PDFs regenerados:
  memoria 4 páginas y resumen 1; las cinco páginas renderizadas e inspeccionadas.
  ZIP de 33 archivos más manifiesto: testzip y SHA-256 por archivo verificados.
  [Manifiesto](package-manifest.json).

La inspección de diseño siguió captura inicial, comparación de estilo calculado,
revisión de los cinco capítulos, ajuste conjunto de copy/jerarquía y revisión
visual de las capturas finales. Los intentos anteriores están documentados en
[README.md](README.md), con su alcance de desarrollo y sus fallos.

## Límites

Perfiles Playwright son emulación; no certifican teléfonos físicos ni Safari
instalado en iOS. Axe no acredita conformidad completa. Revisión humana EU,
NVDA y dispositivos físicos siguen pendientes. El aviso intermitente de
ResizeObserver del primer intento permanece registrado aunque una repetición
pase. No se afirma haber corregido ese comportamiento del mapa en esta tarea.

La preparación del paquete no envía la solicitud ni acepta declaraciones legales.
