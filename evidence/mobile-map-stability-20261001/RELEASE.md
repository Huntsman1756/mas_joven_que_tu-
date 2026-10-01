# Publicación y QA — 1 octubre 2026

Web: https://huntsman1756.github.io/mas_joven_que_tu-/
Fuente: `469b989082e4ef1b56b0fee82f132e5989cce67d`.
Pages: `8b87b2de1e301cb82e0cee4da8c70fcc6c022084`.
[CI del commit exacto](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36837452928)
y [deploy](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36838589350): correctos.

## Cambios y contraste

Ejemplos persistentes asociados a campos vacíos; síntesis y límites después del
mapa en móvil; menos instrucciones repetidas; contención CSS de layout y tamaño
del lienzo, sin API privada ni filtrado de errores. La cancelación se prueba con
respuestas NORA sintéticas explícitas, sin certificar una dirección real.

En 390 × 844, el comienzo del lienzo pasa de 851,14 a 677,72 px (ES) y de
833,88 a 660,45 px (EU), frente al build publicado anterior `252edcd`:
unos 173 px más cerca. Criterios previos en PRODUCT.md; cifras y universo siguen
visibles. Datos, fuentes y denominadores no cambian. Posición no prueba comprensión.

## Verificación

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Svelte / lint | 0 errores; Svelte 0 avisos, lint 5 previos | check.txt, lint.txt |
| Tests / EU | 283 Vitest + 18 Node; 2 tests EU | tests.txt, eu.txt |
| CI exacto | cuatro jobs correctos | ci-run.json |
| Matriz Linux headed | 9 perfiles, 144 checks, cero pageerrors | ci/competition-ci.json |
| Regresión móvil Linux headed | ES/EU en tres motores + 40 aperturas WebKit sin errores | ci/mobile-map-ci.json |
| Lectura / navegación CI | 19 + 14 checks | ci/reading-ci.json, ci/navigation-ci.json |
| Prefijo / editorial | 14 + 28 checks | pages-prefix.json, editorial-qa.txt |
| Publicación | 1324 blobs y huella verificados antes y después del commit | publication.json |
| Web pública Windows | Chromium, WebKit, iPhone 13 emulado: 16 checks cada uno | public-matrix/report.json |
| Web pública Firefox Linux headed | 16 checks sin errores | public-firefox-linux-headed/report.json |
| Lectura / navegación públicas | 19 + 14 checks sin errores | reading-public/, navigation-public/ |
| Imágenes reales | 9 checks; 12 muestras decodificadas, 10 no uniformes | public-smoke.json |
| Capturas / demo | sello comprobado; 7 capturas, 20 frames, 76,044 s sin audio | docs/submission/media/*provenance.json |
| Paquete | 33 archivos más MANIFEST, hashes verificados; PDFs 4 + 1 páginas inspeccionadas | package-verification.json, pdf/ |

La sonda de imagen no certifica geografía. CI con fixtures mide la aplicación;
los recorridos públicos usan servicios reales. La captura móvil espera contenido
vectorial. Este ajuste posterior solo afecta la herramienta de entrega, no el
build servido. `local-published-fingerprint.json` verifica su copia local exacta.

## Fallos conservados y límites

La caracterización externa no bloqueante del CI pasa WebKit escritorio y falla
iPhone 13 en fotografía, con solicitudes geoEuskadi rechazadas por control de acceso.
No se reproduce en WebKit/iPhone público de Windows; no certifica ese entorno Linux
ni un iPhone físico. Informe completo: ci/competition-live-ci.json.

Firefox Windows público agotó 15 s tanto headless como headed. El diagnóstico
observó la respuesta del catálogo unos 23 s después de pedirla; no demuestra la causa.
Informes y HAR: firefox-network.*, public-matrix/ y public-firefox-headed/.
No se aumenta el umbral ni se presentan esos intentos como pasados. Firefox Windows
local y Firefox Linux en CI sí pasan. El recorrido público completo se verifica en
Linux headed como alternativa de plataforma explícita; Linux headless no dibujó
contenido y se conserva como fallo. No hay certificación pública de Firefox Windows.

ResizeObserver supera la regresión fijada, sin prometer ausencia universal de
incidencias. Se conservan ensayos fallidos; no se usaron subagentes ni revisión
independiente. Revisión nativa EU, móviles físicos y observación humana pendientes.
Protocolo: docs/UX_OBSERVATION.md, sin sesiones inventadas. Preparar los archivos
no realiza la solicitud administrativa del concurso.

Paquete: output/pdf/mobile-map-stability-20261001/paquete-entrega.zip.
Rollback: republicar el build anterior `252edcd` con el procedimiento verificado;
no hay migraciones de datos ni almacenamiento de usuario nuevo.
