# Publicación del 01-10-2026

Las mejoras de navegación/EU del 30/09 y las correcciones ES/EU y de fuentes
del 01/10 están publicadas en
[GitHub Pages](https://huntsman1756.github.io/mas_joven_que_tu-/).
La autorización de subida procede de la petición del usuario de esta sesión.
No se ha enviado la solicitud del concurso ni fusionado la rama main.

## Identidad y construcción

- Fuente publicada: `f0f8458e87c030e8dc3b4f7353074372deb97c2e`.
- Pages: `981410a8951caf5d9539549fbdc05ae4494f648e`.
- Build: 1322 archivos; SHA-256
  `01055b795f61bbd9` es el prefijo de la huella completa en [fingerprint.json](fingerprint.json).
- [Publicador](publication.json): push confirmado; índice y árbol de Pages
  coinciden byte a byte con el build. [Despliegue](pages-deployment.json): PASS.
- [HTML público](public-identity.json): HTTP 200 y sello exacto de la fuente.

Build generado con `BASE_PATH=/mas_joven_que_tu-` desde un checkout dedicado.
Se copiaron los 114 PMTiles runtime existentes, ignorados por Git, sin cambiar
datos ni semántica. El árbol estaba limpio al construir; el HTML conserva el
sello real. [Log](build.txt) y [14 controles de prefijo/Range](pages-prefix.json).
El primer intento con node_modules enlazado no pasó gen-engine-preload; se
descartó y se instalaron las dependencias fijadas en el checkout para reconstruir.
El artefacto local anterior se conserva en `.tmp/previous-build-20261001/`.

## Verificación

[CI 36824133616](https://github.com/Huntsman1756/mas_joven_que_tu-/actions/runs/36824133616)
en `6e01301`: app, datos, E2E y browser-matrix PASS. `git diff f0f8458 6e01301`
no presenta diferencias en fuentes/configuración de aplicación, herramientas
de build ni workflows; ese commit añade documentación y evidencias.
La matriz con servicios simulados pasa los nueve perfiles Chromium/Firefox/WebKit
y móviles emulados. Lectura: 19 PASS; navegación: 14 PASS.
Informes en [ci-browser](ci-browser/), estado completo en [ci.json](ci.json).

El control informativo de servicios reales en CI tuvo un FAIL de WebKit escritorio
en photo-content (45 s), con respuestas 503 del proveedor; iPhone PASS.
Está preservado en `ci-browser/competition-live-ci.json`: el verde del job
no convierte ese control continue-on-error en PASS.

Comprobaciones directas sobre la publicación, sin stubs:

- [Navegación](navigation/report.json): 14/14 PASS, ES/EU, teclado, gestos simulados,
  reflujo 320/390/768/1440 y axe.
- [Lectura](reading/report.json): 19/19 PASS, capítulos y método.
- [Smoke](../public-smoke/3e0aff24-b4e3-4b45-bee5-b1768aba7209/report.json): 9/9 PASS;
  muestras raster descargadas, decodificadas y comprobadas, no solo HTTP 200.
- [Matriz pública](public-browsers/report.json): Firefox, WebKit escritorio e
  iPhone PASS; Chromium agotó 15 s en la navegación inicial. Se conserva el
  intento; [la repetición de Chromium](chromium-recheck/report.json) pasa todos
  los controles sobre el mismo release, sin elevar timeouts ni cambiar código.

[CI de la herramienta de captura](capture-tool-ci.json) en `308c9dc`: los cuatro
jobs PASS. Ese cambio permite capturar la URL pública y exige que su sello
coincida con el build local. No modifica la interfaz publicada.
El workflow manual release-qa está versionado pero no ejecutado: todavía no
está registrado en la rama por defecto. Los controles equivalentes se han
ejecutado localmente contra la publicación; no se atribuyen a Actions.

## Entrega y límites

`docs/submission/media/capture-provenance.json` acredita capturas directas de la
publicación, con servicios reales. La demo silenciosa se ha regenerado desde
esas imágenes. El paquete `output/pdf/published-20261001/paquete-entrega.zip`
contiene 33 archivos y un manifiesto con ambos commits y hashes. Memoria: cuatro
páginas; resumen: una. Se revisaron visualmente portada, cierre y resumen.
Los ZIP anteriores y las evidencias de fallos se mantienen como históricos.

Pendientes humanos: revisión lingüística nativa EU, NVDA, teléfonos físicos/Safari
instalado, observación de usuarios y solicitud administrativa. Playwright y axe
no acreditan esos controles ni certifican conformidad completa. La disponibilidad
de servicios externos puede variar. No hay nueva fuente, licencia ni indicador.

Reversión: el Pages anterior es `ad87d731a822872a3d74a554818fd1d785b62927`;
conservarlo como referencia y volver a publicar su artefacto mediante el
procedimiento validado, sin reescribir la historia remota.
