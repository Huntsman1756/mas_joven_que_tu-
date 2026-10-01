# Publicación de las mejoras de lectura — 01-10-2026

[Web pública](https://huntsman1756.github.io/mas_joven_que_tu-/).
Fuente: `252edcd0b71dce2f420d8f0aa91f7d331106c49b`.
Pages: `bc476872687b89ee68e118fabb6203603bfb9560`.

## Artefacto

Build de checkout dedicado limpio, con BASE_PATH=/mas_joven_que_tu- y los 114
PMTiles runtime existentes. [Huella](published-fingerprint.json): 1322 archivos.
[Publicador](publication.json): índice y árbol remoto coinciden byte por byte.
[Despliegue](pages-deployment.json): PASS. [Sello público](public-identity.json):
HTTP 200 y commit esperado. La comparación no modifica el sello del HTML.
Los 14 controles de [prefijo/Range](pages-prefix.json) pasan. El recorrido
[editorial](editorial.txt) pasa 28 controles, incluido desplegar la síntesis
con teclado y volver a Getxo desde el índice. El intento inicial conserva
sus selectores desactualizados en editorial-first-attempt.txt.

## QA

Los resultados locales y sus límites están en [README.md](README.md).
La [CI 36829620053](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36829620053)
del commit 2601bba pasa app, 49 pruebas de datos, E2E y browser-matrix.
Las fuentes de aplicación, recursos y configuración no cambian entre ese
commit y 252edcd: solo se ajusta la prueba editorial. [Informes](ci-browser/).
El servicio externo real adicional pasa WebKit escritorio y agota el límite
de comparación en iPhone; es caracterización no bloqueante, no un PASS global.

Contra la publicación real: [lectura](public-reading/report.json) 19 PASS,
[navegación](public-navigation/report.json) 14 PASS y
[smoke](public-smoke/) 9/9 PASS. El smoke decodifica 12 muestras de ortofoto:
11 no uniformes; comprueba contenido, no exactitud geográfica. La
[matriz pública](public-matrix/report.json) pasa Chromium, WebKit e iPhone 13;
Firefox agota 15 s al entrar por la URL sin barra final, también en una
repetición sin cambiar umbrales [conservada](public-firefox-recheck/report.json)
y en modo headed. La [URL canónica](firefox-canonical.json) abre dentro del
mismo umbral; el harness pasa a usarla y el [recorrido Firefox completo](public-firefox-canonical/report.json)
pasa sus 16 controles con servicios reales. Ese ajuste solo afecta al QA.

La primera CI de 252edcd registra una notificación de ResizeObserver durante
la entrada del ejemplo en WebKit iPhone horizontal, ausente en la CI anterior
y en la matriz local. Se conserva [el fallo](ci-matrix-first.json), sin
suprimir errores del navegador. El diagnóstico local repite esa entrada
40 veces, sin reproducirlo ([resultado](resize-diagnostic.json)); no demuestra
que esté resuelto en Linux. Una repetición del job sobre el mismo commit se
registra aparte cuando termina. La repetición reproduce el aviso en WebKit
horizontal y lee la ayuda aún cerrada en iPhone SE. Se añaden esperas al estado
abierto/cerrado y a los nombres localizados, sin aumentar límites, y diagnóstico
optativo de las entregas ResizeObserver en CI. El diagnóstico no filtra ni
suprime errores: mantiene la exigencia de cero pageerrors.

La [CI de diagnóstico 36831567563](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36831567563)
en 05183ea completa con PASS los cuatro jobs: app, datos, E2E y browser-matrix.
Pasa los nueve perfiles y 144 controles de la matriz estable, lectura
y navegación. [Estado final](ci-diagnostic.json), [jobs](ci-diagnostic-jobs.json)
y [informes completos](ci-browser-diagnostic/): cero pageerrors y
cero trazas ResizeObserver. Solo cambian herramientas de QA y su workflow frente
al artefacto publicado; las fuentes/recursos/configuración de aplicación son
idénticos. La caracterización externa pasa iPhone 13 y agota 45 s esperando la
foto en WebKit escritorio; no se presenta ese recorrido como PASS. No se declara
resuelto el aviso intermitente por el hecho de que esta corrida esté limpia.

## Material de entrega

Capturas obtenidas directamente de la publicación; identidad en
../../docs/submission/media/capture-provenance.json. Demo silenciosa con
subtítulos, de 76 s, vinculada a la misma fuente por silent-provenance.json.
El paquete vigente es output/pdf/ux-refinement-20261001/paquete-entrega.zip.
Los paquetes anteriores permanecen históricos; no se envía solicitud.
La memoria de cuatro páginas y el resumen de una página se han renderizado e
inspeccionado. [Verificación del ZIP](package-verification.json): 33 hashes y
manifiesto interno coincidentes. El reproductor editorial usa ahora el vídeo
silencioso vigente y identifica la publicación; [QA móvil/escritorio](submission-media-qa.json).

Xuxen aporta revisión asistida de las 17 entradas EU pendientes de la ronda
anterior; los términos técnicos se mantienen. No se declara revisión nativa
EU, NVDA ni Safari en dispositivos físicos. No cambian datos o licencias.
