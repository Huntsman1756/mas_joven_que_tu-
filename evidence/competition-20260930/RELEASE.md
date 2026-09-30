# Candidato del concurso — 30 septiembre 2026

Registro histórico del candidato `52b01bc`. La segunda pasada de textos y su
publicación se documentan en [copy-review](../copy-review-20260930/RELEASE.md).
Los resultados siguientes corresponden exclusivamente al build indicado aquí.

La mejora editorial y técnica está publicada en
[GitHub Pages](https://huntsman1756.github.io/mas_joven_que_tu-/).
La preparación del paquete no realiza la solicitud del concurso.

## Identidad y publicación

| Elemento | Evidencia |
| --- | --- |
| Fuente compilada | `52b01bc5a404368f8857e757453729c4b1631b51` |
| Commit Pages | `461c103fc0f1bdaa525ca9038ecfe309ff886bd8` |
| Árbol publicado | `06199c708f728eb0a6031ab97a4812fcfddd5cbf` |
| SHA-256 del build | `b5324c2a71f52375c0ab4d4bf4acd36ec8b0dceafba9205f2047d60f84c6c79a` |
| Inventario | 1322 archivos, 80.938.788 bytes; 114 PMTiles (112 edificios, celdas y municipios) |
| CI del candidato | [36745854222](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36745854222), cuatro jobs en verde |
| Despliegue Pages | [36747746537](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36747746537), success |
| Publicador | [publish.json](publish.json): pushed=true, error=null, índice y árbol iguales al build byte a byte |
| Reversión | [rollback-dryrun.json](rollback-dryrun.json): ensayo sin mutación; destino anterior `cab1bd08f7797e8afdc4cce9bcb7320287a34438` |

El frontend procede del artefacto `app-build` de esa CI. Se añadieron únicamente
115 archivos runtime que faltaban, desde el pipeline/static original, sin
sustituir archivos compilados. Las diferencias de CRLF se documentan y se conserva
el preload generado por CI. [build-composition.json](build-composition.json)
registra los SHA-256 de cada archivo original y añadido. No se afirma
reproducibilidad bit a bit de SvelteKit. Los commits posteriores de documentación
y evidencia no cambian la identidad del frontend publicado.

## Mejoras por área

| Área | Cambio y razón |
| --- | --- |
| Producto y concurso | Hallazgo de Mungia junto al mapa; universo local en el encabezado; cifras municipales en contexto plegable. Reduce la confusión entre 70 edificios y todo el municipio. |
| Frontend | Un solo h1; foco y desplazamiento explícitos; portada con ambos encuadres completos y fecha real de vuelo; aviso recuperable si no se puede crear WebGL. Los tres canvas redimensionan fuera de la entrega del ResizeObserver. |
| Backend/datos | Se conserva el pipeline DuckDB/PMTiles y publicación estática. No hay necesidad demostrada de backend, cuentas o IA. No se recalcularon métricas ni geometrías. La fixture de Mungia conserva bytes, hash, manifiesto y QA. |
| Desarrollo | Imports individuales de iconos y MapIntro separado; 303/327 módulos transformados en CI frente a más de 4000 en el barrido anterior. Constraints Python congelan el entorno comprobado. La carga de los 112 snapshots se separa de su validación, sin retirar asertos ni ampliar timeouts. |
| Infraestructura | Build de CI con procedencia, imagen Playwright oficial fijada por digest, publicación verificada con HTTP Range y reversión mediante commit nuevo. Se mantiene GitHub Pages; VPS y dominio adicional no son requisitos de esta arquitectura. |
| QA y entrega | Matriz serial de tres motores y nueve perfiles, axe, datos vectoriales renderizados, teclado, límites, CSV, control negativo de WebGL y servicios reales aparte. Capturas, demo silenciosa y paquete verifican el mismo sello. |

Estas decisiones favorecen comprensión y rigor, dos apartados de 25 puntos de
las bases, sin inventar métricas ni añadir funciones para aparentar innovación.
Las bases oficiales descargadas y el análisis inicial se conservan en
`output/contest-review-20260930/`. Ninguna mejora garantiza un premio.

## Verificación del candidato

| Comprobación | Resultado y alcance |
| --- | --- |
| Formato, tipos, lint y build en CI | PASS. svelte-check: 0 errores y 0 warnings. ESLint: 0 errores, 5 warnings de variables sin uso en scripts históricos; no se suprimieron. [app-ci.log](app-ci.log) |
| Aplicación | 279 pruebas Vitest PASS en la CI del candidato. Los 18 tests de servidor/raster/SEO pasaron en la verificación local previa; no se atribuyen como nueva ejecución a esta CI. |
| Datos | 49 pruebas PASS; callejero fijado PASS; fuente viva caracterizada aparte por CI. |
| E2E existente | Job e2e PASS: conserva los recorridos de regresión con fixtures. [e2e-ci.log](e2e-ci.log) |
| Matriz funcional | 9/9 perfiles, 12 checks cada uno: 108 PASS; cero pageerrors. Servicios externos simulados. [ci-final/report.json](ci-final/report.json) |
| Integración local real | Chromium escritorio y Pixel 5 emulado: 24/24 PASS, sin pageerrors. Fotos y tiles de servicios oficiales, sin stubs. [final-live-chromium/report.json](final-live-chromium/report.json) |
| Cambio de tamaño | 6 tamaños, de 320×568 a 1440×900, pasando por vertical/horizontal: canvas ajustado, sin overflow ni pageerrors. [final-resize/report.json](final-resize/report.json) |
| Web pública | 9/9 PASS; sello exacto; 26 respuestas de ortofoto, 197 KB; 11/12 muestras decodificadas no uniformes. Una muestra uniforme no se declaró contenido válido. [smoke público](../public-smoke/016ed738-c96e-498d-aa63-889b2388f4b9/report.json) |
| Capturas | Servicios reales y build del candidato; portada, hallazgo, móvil y comparación inspeccionados visualmente. [procedencia](../../docs/submission/media/capture-provenance.json) |
| Demo | 76,033 s, 1920×1080, sin stream de audio; subtítulos y montaje con 20 frames reales del modo Evolución. [procedencia](../../docs/submission/media/silent-provenance.json) |
| PDF/ZIP | Memoria de 4 páginas y resumen de 1; cinco páginas renderizadas e inspeccionadas. ZIP de 33 archivos más manifiesto, testzip sin error y SHA-256 por archivo. [package-manifest.json](package-manifest.json) |

Perfiles de la matriz: escritorio Chromium, Firefox y WebKit; Pixel 5 y Galaxy
S9+ con Chromium; iPhone SE, iPhone 13, iPhone 13 horizontal e iPad Mini con
WebKit. Versiones y viewports exactos están en el JSON. Los perfiles emulados
no certifican esos teléfonos ni Safari instalado en iOS. Axe cubre las reglas
WCAG 2 A/AA y 2.1 AA seleccionadas, no una conformidad completa de accesibilidad.

La auditoría npm del 30 de septiembre devuelve cero vulnerabilidades. Cookie
instalado: 0.7.2. Dependabot mantiene una alerta low en la rama por defecto;
no se confunde con el lock y override del candidato.

## Fallos conservados y trabajo humano pendiente

La caracterización WebKit real en CI **falla** en ambos perfiles durante la foto
de 1989. Las peticiones registran HTTP 503 sin Access-Control-Allow-Origin en
geoEuskadi. El recorrido previo de datos locales pasa; no se declara integración
WebKit completa, ni se convierte esta corrida en PASS por estar el job general
en verde. [ci-live-final/report.json](ci-live-final/report.json) conserva URLs,
fallos y capturas. No se deduce de ello un fallo permanente del proveedor: el
recorrido real en Chromium y el smoke público pasaron desde este entorno.

Los intentos anteriores y sus fallos permanecen en esta carpeta, incluidos
el ResizeObserver de iPhone SE y el selector de enlace oculto del método. Las
correcciones se verificaron después; no se reescriben los resultados anteriores.

Maestro del 30 de septiembre no completó instrumentación/estabilidad de los
emuladores API 33/34. Una revisión automática rechazó abrir Chrome con ADB
(`blocked by policy`); no se eludió ni se usó como evidencia de compatibilidad.
Los intentos de Firefox/WebKit en Windows tampoco acreditan compatibilidad;
el PASS de los tres motores corresponde al contenedor Linux de CI.

Antes de presentar: revisión nativa EU, NVDA, Safari/iPhone y Android físicos,
zoom real y observación de personas nuevas. Registrar si comprenden qué mide la
pieza, qué descubren y dónde lo verifican; no reemplazar esas respuestas con
datos sintéticos. Verificar elegibilidad y completar solicitud/declaraciones por
el canal oficial. La demo del paquete es silenciosa; la narración histórica queda
fuera. No se firma ni envía la candidatura desde este trabajo.

El diagnóstico previo de rendimiento conserva 20 repeticiones por perfil y
sus definiciones. No acredita de nuevo los gates G1 ni mide latencia desde CTA.
Una optimización futura debe medir esos presupuestos sin cambiar sus umbrales.
