# Orientación del mapa y revisión EU — 30 septiembre 2026

## Cambio

Instrucciones de zoom según la escala, ayuda desplegable para ratón/dedos/teclado,
controles nativos traducidos y vuelta al encuadre municipal. La vuelta conserva
año, municipio y datos. Las acciones comparten fila si caben, con objetivos de
44 px. El límite municipal se hace más ligero. No se cambian métricas, contratos,
geometrías, datasets ni arquitectura estática.

ResizeObserver agrupa trabajo fuera de su entrega y evita resize/moveend cuando
dimensiones y densidad no cambian. El carrusel difiere su actualización al frame
siguiente y cancela trabajo al desmontarse. No se afirma que una ronda de QA
pruebe la ausencia permanente de avisos intermitentes.

## Identidad y CI

**Estado comprobado el 01-10-2026: candidato sin publicar.** La web pública
conserva el sello `c353154c4ff60ba32cc98e350afccb40a5a092a6` y gh-pages
`ad87d731a822872a3d74a554818fd1d785b62927`. El ZIP anterior conserva ese
snapshot. La continuación posterior recaptura y prepara un paquete local
separado, sin publicar: [ronda final del 01/10](../final-review-20261001/RELEASE.md).
[Comprobación inicial de continuación](CONTINUATION-20261001.md).

Fuente del candidato: `52daba93fe62acc090f99d507aa7bffa9cd8513e`.
[CI final](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36774241320):
cuatro jobs success. Formato, tipos (cero errores y warnings), lint (cero errores,
cinco warnings históricos), build, 283 Vitest + 18 Node y 49 tests de datos PASS.
E2E existente PASS. Locale-contract y verify:eu verifican estructura, no idioma.

[Matriz final](ci-browser/competition-ci/report.json): nueve perfiles,
Chromium/Firefox/WebKit; incluye controles traducidos, zoom/reset, ayuda y
conservación de año/municipio. [Navegación](ci-browser/navigation-ci/report.json):
14 PASS, 320/390/768/1440 px, teclado, arrastre y pellizco CDP, ES/EU, reflow,
redimensionado y axe sin violaciones detectadas. [Lectura](ci-browser/reading-ci/report.json):
19 PASS. Son pruebas con servicios externos simulados, no teléfonos físicos.

La [primera CI](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36773223697)
falló en una prueba G12 que buscaba un punto táctil fuera de pantalla tras ampliar
la orientación. Se conserva [log](first-e2e-ci.txt) y
[matriz de ese intento](ci-first-browser/competition-ci/report.json).
La corrección añade el scroll previo que ya tenía el otro contexto de la prueba;
no retira asertos, no filtra pageerrors ni aumenta tiempos de espera.

Integración real final separada: iPhone 13 WebKit PASS; desktop WebKit FAIL en
espera de navegación al método. No se atribuye causa sin evidencia y no se cuenta
como PASS global: [resultado](ci-browser/competition-live-ci/report.json).
El primer intento real falló esperando contenido fotográfico en ambos perfiles.

## Cartografía y EU

CARTO exige API key también para su servicio gratuito, según sus
[condiciones oficiales del 29-09-2026](https://www.carto.com/legal/basemap-terms/).
El proyecto usa geoEuskadi, Bizkaia y PMTiles locales: la captura pública inicial
registró 636 solicitudes y ninguna a CARTO. La CSP tampoco lo permite.
Esto identifica las dependencias actuales; no garantiza disponibilidad futura
de los proveedores oficiales. [Fuentes y alcance](README.md).

LATXA recibió 566 entradas EU en 13 lotes; Xuxen revisó esos lotes, con repetición
de cinco capturas iniciales no válidas. Se aplicaron correcciones manuales y se
rechazaron propuestas que alteraban universos, variables, datos o identificadores.
[Paridad numérica](language/numeric-parity.json): 566 claves, cero discrepancias.
La revisión adicional del delta final no arrancó por timeout del navegador local:
[fallo](eu-final-delta-failed.txt). No se declara aprobada ni se confunde con las
respuestas capturadas de la revisión completa. **Revisión humana EU pendiente**.

## Límites

Emulación Playwright no certifica dispositivos físicos ni Safari instalado en
iOS. Axe no acredita conformidad completa. NVDA, revisión humana EU y teléfonos
físicos siguen pendientes. No se ha enviado solicitud del concurso ni aceptado
declaraciones legales. La revisión de referentes oficiales no garantiza un premio.
