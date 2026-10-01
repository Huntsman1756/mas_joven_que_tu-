# Continuación del 01/10: candidato local corregido y verificado

Las mejoras del 30/09 están incorporadas y esta ronda corrige ambigüedades de
lectura ES/EU, la declaración de fuentes y el QA de cierre. Hay un ZIP local
actualizado, con capturas y vídeo del mismo build. No se ha publicado ni enviado
la solicitud del concurso.

## Qué se ha corregido

- Cobertura y proporción posterior usan frases separadas en ES/EU: conocidos
  sobre todos los edificios actuales frente a posteriores sobre conocidos.
- La leyenda municipal hace explícito el universo de año conocido en los dos
  idiomas. La consulta EU nombra el centro del mapa.
- Los dos archivos normales Source Sans 3 declaran su rango real 200–900,
  sustituyendo cuatro declaraciones duplicadas de los mismos bytes como 600/700.
  Los binarios y la licencia OFL leída no cambian. Las pruebas de glifos también
  pasaron antes: no se atribuye a esta corrección todo el grosor visual observado.
- La matriz verifica pesos 400/600/700 mediante métricas y capturas DOM contra
  una referencia con eje explícito, además de instrucciones visibles frente
  a la barra de modos. Añade diagnóstico de contexto/servidor y opciones de
  transporte documentadas; no eleva los timeouts ni oculta errores.
- El workflow de QA publicado exige identidades completas, contrasta los sellos
  público/local y recoge solo smoke/capturas nuevos. Es un borrador local:
  sintaxis comprobada, sin ejecutar en GitHub Actions.
- PDF, memoria, resumen y documentación de entrega distinguen el candidato local
  de la web publicada. La fecha del pie PDF procede de la captura, no de una
  constante antigua.

## Identidad

Base Git: `52daba93fe62acc090f99d507aa7bffa9cd8513e`.
Build probado y recapturado: `52daba93fe62acc090f99d507aa7bffa9cd8513e+dirty(29)`.
`+dirty(29)` no identifica por sí solo los cambios: [fingerprint.json](fingerprint.json)
registra SHA-256 de fuentes y artefacto. La huella de build es
`a64651952c3afb7c896ac20bad4fdafdf5e23f4ed8ce23dcc12c28414cab0b0d`.
El HTML no se ha falsificado como commit limpio. El publicador exige sello limpio;
este candidato todavía no es un release publicable.

La web consultada sigue en `c353154`, Pages `ad87d73`; la identidad y CI del
30/09 están en [status-20261001.json](../map-guidance-20260930/status-20261001.json).
La CI anterior verde corresponde a `52daba9`, no acredita estos cambios locales.

## Verificación realizada

| Prueba | Resultado y evidencia |
| --- | --- |
| Formato / tipos | PASS; svelte-check: 0 errores, 0 avisos |
| Lint completo | PASS; 0 errores, 5 avisos históricos; lint de la matriz final PASS |
| Tests de aplicación / Node | 283 + 18 PASS |
| Datos | 49 PASS, sin descargar ni alterar un snapshot nuevo |
| Contrato EU y números | verify:eu PASS; [566 claves, 0 diferencias numéricas](locale-numeric-parity.json) |
| Fiabilidad G12 | [7 controles PASS](g12/checks.json), con servicios simulados |
| Interfaz EU G14 | [101 controles PASS](eu-qa/qa/report.json): diez estados, escritorio/móvil, lang, reflujo, variables y ausencia de fugas ES |
| Navegación | [14 PASS](navigation/report.json), 320/390/768/1440 px, teclado, arrastre y pellizco simulado, ES/EU, axe |
| Lectura | [19 PASS](reading/report.json), incluidos cinco capítulos y método |
| Matriz de perfiles | [8 perfiles PASS y Firefox local FAIL](final-matrix/report.json); [Firefox completo PASS con transporte HTTPS de prueba](firefox-https-transport/report.json) |
| Servicios oficiales reales | [WebKit escritorio/iPhone PASS](final-live/report.json); [Firefox PASS con transporte HTTPS del artefacto local](firefox-https-live/report.json) |
| Prefijo de Pages / Range | [14 PASS](pages-prefix/report.json), build local servido bajo el prefijo real, imágenes externas simuladas |
| Web publicada anterior | smoke del 01/10: 9/9 PASS; muestras raster decodificadas y no uniformes; no es QA de publicación del candidato |
| Capturas / demo / ZIP | capturas reales sin stubs; vídeo silencioso 1920×1080, duración observada 76,033 s; 33 archivos del paquete con manifiesto |

El primer lote de checks se detuvo por tratamiento de stderr de npm en
PowerShell. El siguiente lint tuvo un arranque de imports bloqueado y fue
cancelado; el lint completo posterior terminó correctamente. Los logs parciales
no se presentan como pruebas completas. No se ha repetido toda la suite E2E
histórica: G12, G14, matriz, navegación y lectura cubren esta modificación.

### Diferencia de transporte de Firefox

Firefox 155 abrió y verificó la publicación anterior, pero agotó 15 s navegando
al build por localhost en varias repeticiones. Persistió con 127.0.0.1, puerto
fijo, headed y sin hoja de fuentes. El contexto vacío y el servidor respondieron.
Los intentos se conservan en `firefox-recheck`, `firefox-headed-recheck`,
`firefox-diagnostic`, `firefox-loopback`, `firefox-without-fonts` y
`firefox-fixed-port`. No se afirma una causa definitiva.

El fallback `--https-fixture` intercepta en el navegador las peticiones a un
origen HTTPS de prueba y las entrega desde el servidor local con los mismos
bytes, estados, cabeceras y Range. No modifica la web pública. La prueba estándar
simula servicios externos; la prueba `--live` deja esos servicios reales.
Esta diferencia aparece en `artifactTransport` del informe. Así se verifica
Firefox sin convertir los fallos de HTTP local en PASS ni atribuir esta prueba
a una publicación. El control público falló al buscar un botón nuevo que la
versión publicada aún no incorpora: tampoco se cuenta como PASS completo.

## Revisión visual y referencias

Recorrido revisado en capturas actuales:

1. Portada: pregunta, formulario, ejemplo y fechas de imágenes reconocibles.
2. Ejemplo Mungia: cifras y ámbito junto al mapa; contexto municipal separado.
3. Resultado personal: porcentaje, universo y cobertura a la vista.
4. Evolución / foto / cortina: controles, campañas y teclado operativos.
5. Método ES/EU: fuente, contratos, límites y descarga localizados.
6. Móvil y horizontal: reflujo sin desbordamiento en los controles probados.

Capturas de estos pasos: `final-matrix/`, `final-live/`,
`firefox-https-transport/` y `eu-qa/qa/`. Las imágenes externas simuladas de la
matriz no sirven como prueba de contenido fotográfico: para eso se conservan
las capturas reales y el smoke.

Referencias oficiales contrastadas en documentación el 01/10:
[ayuda de geo.admin.ch](https://www.geo.admin.ch/en/map-viewer-help),
[parámetros de su visor](https://docs.geo.admin.ch/map-viewer/url-parameters.html),
[visualizadores PNOA del IGN](https://pnoa.ign.es/web/portal/pnoa-imagen/visualizadores-y-servicios-web)
y [terminología de población de Eustat](https://www.eustat.eus/estadisticas/tema_159/opt_2/tipo_3/ti_biztanleria/temas.html).
Sirven para contrastar ayuda contextual, comparación, tiempo y fuentes; no se
ha hecho una auditoría visual nueva de esos productos ni copiado su código.
Los patrones útiles ya existían en el proyecto; no justifican añadir modos.

## Archivos y límites de cierre

Nuevo ZIP: `output/pdf/candidate-20261001/paquete-entrega.zip`; manifiesto local
sin publicación acreditada. PDF: memoria de cuatro páginas y resumen de una.
Se conservan el ZIP publicado anterior y un snapshot audiovisual desde HEAD
en `output/submission-snapshot-20260930/`. Las evidencias EU/G12 que los scripts
escribieron sobre rutas históricas se copiaron a esta ronda y se restauraron
los archivos históricos modificados que estaban limpios al comenzar.

La revisión de copy es editorial y estructural, no certificación nativa EU.
Playwright no certifica teléfonos físicos ni Safari iOS instalado. Axe no
acredita conformidad completa. NVDA, revisión EU humana y observación de personas
nuevas permanecen abiertas. La solicitud oficial no se ha enviado.

Para publicar: versionar el candidato y obtener un build con sello limpio,
mantener los datos runtime, verificarlo y autorizar el cambio de la web pública;
después ejecutar el workflow con SHA de fuente/Pages reales y recapturar el
paquete con la identidad publicada. No usar la CI de `52daba9` como sustituto.

Reversión de esta ronda: cambios de diccionarios, CSS de fuentes, matriz y pie
PDF, con sus notas en PRODUCT/UX_COPY y documentos de entrega; conservar las
evidencias históricas y el snapshot anterior. No hay migración de datos.
