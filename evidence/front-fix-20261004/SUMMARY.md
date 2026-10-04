# QA de los arreglos de front — 04-10-2026

Candidato: `a97e424` (commit «fix: keep map controls and attribution visible over the
swipe comparator»). Hallazgos de partida: `evidence/front-review-20261004/SUMMARY.md`.
Publicado en GitHub Pages: `gh-pages` `f3d936d` (tree `87d11e2`), informe
`evidence/red-team-2026/release/publish-20261004-0929.json`.

## Antes de publicar (build local, fixtures)

| Comprobación | Resultado |
|---|---|
| svelte-check | 0 errores, 0 avisos (406 ficheros) |
| eslint / prettier | OK |
| Vitest | 286/286 (incluye 3 tests nuevos de `resolveSwipeBefore`) |
| node --test (servidor, raster, SEO, deploy-check) | 23/23 |
| `rt_pages_prefix` | 14/14 |
| Sonda de solapes (`probe/`) | zoom, escala y atribución sin nada encima en móvil y escritorio, en 50 % y «Solo 19xx»; aviso «Desliza» y atribución sin intersección |
| Atribución en flujo (`_probe_swipe_source.mjs`) | visible en Galaxy S9+ (Chromium) e iPhone SE (WebKit) con ambas campañas; overlay oculto ≤700 px |
| `competition-matrix` (9 perfiles) | 7 PASS a la primera; desktop-webkit PASS al repetir; desktop-firefox FAIL (ver abajo) |
| `reading-qa`, `map-navigation-qa` | PASS |
| `mobile-map-qa` | chromium PASS; webkit PASS (corrida aparte); firefox no completa |
| CI GitHub run 37182545066 | app, data-tests, e2e y **browser-matrix (Chromium/Firefox/WebKit en Linux)**: success |

## Después de publicar (Pages en vivo, sello `a97e424`)

| Comprobación | Resultado |
|---|---|
| `deploy-check --profile=pages` | 6/6 |
| `smoke_public` (servicios reales) | 9/9; ortofoto real decodificada no uniforme |
| `prod_smoke` (sin stubs) | pass |
| `map-navigation-qa`, `reading-qa` | PASS, build `a97e424`, 0 errores |
| `competition-matrix --public` | 8/9 PASS; desktop-firefox FAIL (entorno local) |

## Incidencias del arnés corregidas

- `fixtures.mjs` calculaba la ruta del PMTiles quitando `data/` del inicio del path:
  bajo la subruta de Pages todos los PMTiles daban 404 y la matriz `--public` fallaba
  en los 9 perfiles (`pages/matrix/`). Corregido; `pages/matrix-fixed/` es la corrida válida.
- `deploy-check` pedía el Range con gzip. GitHub Pages responde entonces con un rango
  del fichero comprimido entero (total 1639058, ETag débil). Los navegadores envían
  `Accept-Encoding: identity` con Range (estándar Fetch), y así Pages devuelve los
  127 bytes con firma. El check imita ahora al navegador y registra el caso gzip como
  dato. La revalidación del HTML solo se exige en el perfil VPS (Pages fija max-age=600).

## No verificado

- **Firefox en esta máquina**: abrir `about:blank` tarda ~11 s y las cargas agotan
  15 s con cualquier servidor; ya ocurría el 01-10. Cubierto por el job browser-matrix
  del CI (Linux), no por una corrida local.
- **Android nativo (Maestro/Chrome en AVD)**: bloqueado por el entorno. Pixel8_API33 y
  Pixel_API35 entran en ANR de Pixel Launcher/System UI y reinicios del system_server
  (logcat: watchdog de keystore, adbd reiniciado) con el host al 8 % de CPU y 28 GB
  libres; las imágenes están en F:, que hoy responde muy lento. Maestro: 3/3 flows
  fallidos sin llegar a abrir Chrome (`android/`). No es un resultado sobre la app.
- iPhone/Android físicos, NVDA y Safari real siguen pendientes como antes.
