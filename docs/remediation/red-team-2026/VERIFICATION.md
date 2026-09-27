# FASE B — Verificación del candidato

Fecha: **2026-09-27**. Entorno: Windows (win32), Node **24.19.0** / npm
**11.17.0** (CI usa Node 20), Python **3.11.15** (`duckdb` 1.5.5,
`requests` 2.34.2, `shapely` 2.1.2), Playwright **1.63.0** (Chromium),
Docker 29.8.0 (tippecanoe 2.79.0 en contenedor fijado, no reconstruido en
esta fase). Sin BASE_PATH salvo donde se indica.

Todas las suites E2E se ejecutaron con `CI_STUBS=1` (mismo empaquetado de
stubs que en CI) y en el orden del workflow.

## 0. Estado remoto comprobado en vivo (2026-09-27)

| Qué | Resultado |
|-----|-----------|
| Producción `https://huntsman1756.github.io/mas_joven_que_tu-/` | HTTP 200; el HTML publicado **sigue con el `og:title` antiguo** («70 años construyendo Bizkaia») → no se ha publicado nada durante la FASE B |
| `origin/gh-pages` | `df842fb` (deploy «from 1848c74», 25 sep) — igual que en la baseline de la auditoría |
| Último run de CI (API) | **36216032651** sobre `54e3519` → `conclusion=failure` (el mismo fallo `g18_now_follows` de la auditoría); el anterior (`fb3242e`) también falló |
| Rama local | `g11-visual-renewal` **7 commits por delante** de `origin` sin push; la remediación FASE B va además sin commitear |
| Implicación | El candidato solo puede validar su CI **después** del push; además, sin el fix de `g14_eu_qa` (selector MOB-R2) el push de esos 7 commits introduce un fallo **nuevo** de QA EU en CI |

## 1. Comprobaciones estáticas y unitarias

| Comando | Resultado |
|---------|-----------|
| `npm run check` (svelte-check) | **0 errores**, 2 warnings preexistentes (`AddressSearch`, `CompareYear`) |
| `npm run lint` (eslint) | **0 errores**, 5 warnings preexistentes en `app/scripts` |
| `npm run format:check` (prettier) | **PASS** |
| `npm run test` (vitest + servidor) | **25 archivos / 275 tests** + **15** tests de servidor → PASS |
| `python -m pytest tests/data -q` | **49 PASS** (45 previos + 4 nuevos RT-22) |
| `npm run verify:eu` (contrato ES/EU) | 2/2 PASS (paridad **531/531** claves y tokens) |
| `npm ci` | 227 paquetes instalados desde el lock, **0 vulnerabilidades** |
| `powershell -File scripts\verify.ps1` | **TODO OK** (check + eslint + format + tests + build + pytest + artefactos 112/112 + Range 206) |
| YAML de `.github/workflows/ci.yml` | parsea; 3 jobs (`data-tests`, `app`, `e2e`) |

## 2. Suites E2E (orden de CI, `CI_STUBS=1`, sobre el build candidato)

| Suite | Resultado |
|-------|-----------|
| `g5_swipe.mjs` | `pass: true` |
| `g10_hardening.mjs` | 59 checks · **0 fallos** |
| `g12_reliability.mjs` | 7/7 checks |
| `g13_ux.mjs` | **G13 PASS** |
| `g14_eu_qa.mjs` | **101/101 PASS** (antes: 97 con 1 fallo — selector obsoleto MOB-R2 corregido) |
| `g8_viewer.mjs` | **todo PASS** (5 modos, menú móvil, deep links, back/forward, axe) |
| `g2b_views.mjs` | **todo PASS** (escenas, red sin opt-in, F4, contraste C-05/C-08, back/forward, axe) |
| `g18_timeplayer.mjs` | **44 checks · 0 fallos** (RT-13: aserto de pausa **y** aserto en vivo `g18_now_follows_live` + progreso) |
| `perf4_deeplink_race.mjs` | `pass: true` (deep links, carreras, `lazy_chunk_failure` recuperado) |

### 2b. Motores independientes (RT-15; no sustituye a los retests físicos)

| Comprobación | Resultado |
|--------------|-----------|
| `launch_browser_smoke.mjs` (journey completo) | **PASS en chromium, firefox y webkit** — incluye la activación de la ortofoto por el CTA nuevo (RT-03): `ortho_state = "AVAILABLE (sin estado pendiente)"` en los tres |
| `launch_browser_smoke.mjs --reflow` (320×844) | `hscroll: false`, titular visible, canvas presente |
| `launch_browser_smoke.mjs --zoom400` | titular visible, sin recorte |
| `BROWSER=firefox node scripts/g2b_views.mjs` | **todo PASS** (29 checks: escenas, orto, contraste, axe, back/forward) → `evidence/g2/g2b-views/g2b-views-firefox.json` |
| `BROWSER=webkit node scripts/g2b_views.mjs` | **todo PASS** → `g2b-views-webkit.json` |

Motores: Playwright Firefox 155 y WebKit 26.6 (builds de Playwright, no los
instalados del usuario). No es Safari físico ni Firefox del escritorio.
Nota: `launch_browser_smoke.mjs` esperaba un `.photo .state` permanente tras
la activación — con RT-03 ese estado desaparece cuando la imagen queda
disponible; el paso se ajustó a leer el estado que haya (harness, no
producto).

## 3. Sondeos específicos de la FASE B

| Script | Resultado | Evidencia |
|--------|-----------|-----------|
| `scripts/redteam_verify.mjs` | **60/60 PASS** — RT-03 (8 rutas + opt-in), RT-04 (Karrantza) + **RT-04b universo `c02=0`** (11 checks con fixture local: titular sin conclusión temporal, sin línea de cifra, resumen accesible, comparación sin reparto, histograma y cálculo explícitos, sin NaN/undefined), RT-05, RT-06 (incl. índice por `f4036`), RT-18 (población y plurales) | `evidence/red-team-2026/verify.json` + capturas `rt03-*`, `rt04*-*`, `rt05-*`, `rt06-*`, `rt18-*` |
| `scripts/rt_golden_cases.mjs` | **17/17 PASS** — Bilbao/1922, Getxo/1952, Mungia/1979, Arakaldo/1987, Karrantza/2025 (ES) + Karrantza EU a 320 px + singular de cálculo y de partición | `golden-cases.json` + `golden-*.png` |
| `scripts/rt16_engine_retry.mjs` | **7/7 PASS** — fallo del chunk → estado visible, 0 unhandled rejection, recarga recupera con el estado conservado | `rt16-engine-retry.json`, `rt16-engine-retry.png` |
| `scripts/rt12_hero_bytes.mjs` | Medido en 3 viewports (tabla §4) | `rt12-hero.json` |
| `scripts/rt_pages_prefix.mjs` | **14/14 PASS** ×2 (build relativo = convención de producción y build con `BASE_PATH=/mas_joven_que_tu-`) | `pages-prefix.json`, `pages-prefix-basepath.json`, `pages-prefix.png` |
| Simulación bash del paso de recogida de CI (RT-17) | Solo se copia el fichero del run; la evidencia previa queda fuera; estructura `--parents` correcta (exit 0) | reproducible con `find -newer` + `cp --parents` |
| `g1_buildings.py --catalog-only` (RT-08) | Regenera `app/static/data/catalog.json` **idéntico** (sin diff) | consola: «catalog.json regenerado» |
| `scripts/_mob_r1_shots.mjs` (retest local MOB-R1/R2) | **21/21 asertos, 0 errores** — composición móvil emulada (chip de campañas, sheet, editor «Cambiar», R2 above-the-fold). **No sustituye al iPhone físico** | `evidence/mobile-physical/mobr1-local/mobr1-local.json` |
| **Reconstrucción en entorno aislado** (RT-08) | Copia de 243,5 MB (`app/` sin `node_modules`/`build`, `pipeline/`, `tests/`, `scripts/`, `data/processed+manifests+qa`, `docs/`) en `F:\Temp\runtime\opencode\mjt-isolated` — **fuera del repositorio y sin `.git`**: `npm ci` (227 paquetes, 0 vulns) → check 0 errores → format PASS → lint 0 errores → **vitest 259 + servidor 15** → `npm run build` OK → **pytest 49**. El sello del build queda `mjt:build="unknown"` (comportamiento documentado para tarball sin `.git`) | reproducible repitiendo los comandos del README en una copia limpia |

## 4. Antes/después de los problemas visibles

| Problema | Antes (auditoría) | Después (candidato) |
|----------|-------------------|---------------------|
| Fotos aéreas sin estado (RT-03) | `docs/red-team/EVIDENCE/04-fotos.png`, `16-mobile-photo-390.png` — lienzo vacío con «1945» | `evidence/red-team-2026/rt03-tab-pending.png` («La imagen aún no está activada…» + «Ver la campaña de 1989») → `rt03-tab-active.png` tras activar; 0 peticiones antes del opt-in |
| «0 % exacto» (RT-04) | `EVIDENCE/12-karrantza-2025.png` y `karrantza-2025-dom.txt:16` — «La cifra exacta: 0 %» | `rt04-karrantza-after.png` — «La cifra: **<0,1 %**», «1 de 3.528…», cobertura 99,7 % |
| Unidad del contraste (RT-05) | `EVIDENCE/14-story-mungia.png` — «1,9» sin unidad | `rt05-mungia-contrast.png` — «85,7 %» / «1,9 %» |
| Hallazgo poco visible (RT-06) | `EVIDENCE/02-bilbao-1922.png` — el contraste quedaba en el capítulo | `rt06-finding.png` — franja «UN HALLAZGO» en el primer panel con CTA; `rt06-story.png` tras entrar; índice abre por Mungia |
| Población duplicada (RT-18) | `EVIDENCE/karrantza-2025-dom.txt:130` — «registró 2.741 … registraba 2.741» | `rt18-population.png` — una sola aparición (check `rt18_padron_not_duplicated`) |
| Hero pesado (RT-12) | 1.309.435 B descargados siempre (auditoría `first-visit-performance.json`) | 272.473 B (−79 %) en desktop/móvil DPR1-2; 1.012.738 B (−23 %) en desktop Retina |
| Claim social (RT-21) | `og-card.png`/OG con «70 años construyendo Bizkaia» | subtítulo vigente en OG y tarjeta («La edad de los edificios de Bizkaia…» tras la etapa editorial) |
| Motor caído (RT-16) | lienzo vacío + unhandled rejection | `.maperror` con aviso y «Recargar la página»; recarga verificada |

## 5. Golden cases (números del candidato = números de la auditoría)

| Caso | Recuento | Cuota |
|------|----------|-------|
| Bilbao 1922 | 11.780 de 13.738 | 85,7 % |
| Getxo 1952 | 4.927 de 6.211 | 79,3 % |
| Mungia 1979 | 2.679 de 4.472 | 59,9 % |
| Arakaldo 1987 | 28 de 109 | 25,7 % |
| Karrantza 2025 | 1 de 3.528 | **<0,1 %** (nunca «0 %») |

Además: nombre largo Karrantza Harana/Valle de Carranza en EU a 320 px sin
overflow horizontal y con convención de porcentaje vasca (`% <0,1`).

## 6. Subpath de GitHub Pages (RT-01)

- El HTML servido lleva `<meta name="mjt:build" content="0a2c7f6…+dirty(n)">`
  (sello escrito en cada build).
- `build/` servido bajo `/mas_joven_que_tu-/` (proxy equivalente al mapeo de
  Pages): home y `como-lo-sabemos` 200, entry chunk 200, `data/*.json` 200,
  **Range `bytes=0-99` sobre `cells.pmtiles` → 206 con 100 bytes y
  `application/octet-stream`**, arranque en Chromium con titular + canvas +
  **0 respuestas ≥400** y las 13–18 peticiones de datos bajo el prefijo.
- Repetido con `BASE_PATH=/mas_joven_que_tu-` → mismos 14/14.

## 7. Cobertura de la lista de verificación del encargo

| Elemento pedido | Evidencia |
|-----------------|-----------|
| check, lint, format:check, tests, build | §1 (+ `verify.ps1` TODO OK) |
| tests de datos | §1 (`pytest` 49) |
| E2E afectados + suite de release | §2 (9 suites CI) + §2b (firefox/webkit) |
| build con el BASE_PATH real de Pages | §6 (ambas convenciones, 14/14 ×2) |
| HTTP Range y contenido PMTiles | §6 (206 + 100 bytes + octet-stream; canvas con PMTiles en el subpath) |
| Golden cases (Bilbao/Getxo/Mungia/Arakaldo/Karrantza) | §5 |
| Nombre largo ES/EU | §5 (EU 320 px sin overflow) + `g2b` (ES desktop) |
| unknown / denominador cero / sin cobertura / error | `g10_11_null_not_zero`, detalle de cobertura con `unknown/suspicious`; denominador cero **no es alcanzable** en la UI (ninguno de los 112 municipios tiene `c02 = 0`) — cubierto por `fmtPctEdge(0)` y el guard `{#if h.known > 0}`; `g2b photo_not_covered_state` y `photo_service_error_state` PASS |
| Cinco modos y rutas de entrada | `g8_viewer` (todo PASS) + `redteam_verify` §RT-03 (8 rutas) |
| Deep links, reload, back/forward | `g8 v6_*`, `g2b s3_*`, `perf4_deeplink_race` |
| Teclado, foco, sliders, sheets, reduced motion | `g18` (42: teclado + RM), `g5` (slider/teclado swipe), `g8` (menú con teclado), `g10` (foco), `_mob_r1_shots` (sheets, 21/21) |
| Zoom/reflow/espaciado de texto | `--reflow` 320 px y `--zoom400` (§2b); espaciado de texto (text-spacing) **no probado** — queda en «Límites» |
| Móvil emulado | `g14` contexto 390 isMobile/hasTouch, `g5` w390, `_mob_r1_shots` (21/21). **Sin dispositivo real disponible en esta sesión** (sin ADB conectado) |
| Fallo/reconexión de raster, NORA y motor | `g2b` (NOT_COVERED / SERVICE_ERROR con stubs), `g10_01_error_visible` (NORA caído con stub), `rt16_engine_retry` (bloqueo real del chunk del motor) |
| Chaos sin sobrecargar proveedores | stubs locales (`CI_STUBS=1`), bloqueo por `page.route` y fixtures — nunca sabotear servicios públicos |

## 8. Límites de esta verificación (no son PASS)

- **No** se certifica WCAG AA: axe en varias suite no encuentra violaciones,
  pero hay contrastes sin resolver y no cubre todo estado ni el canvas.
- **No** hay PASS físico: Safari iOS/macOS, Firefox real y NVDA siguen
  pendientes (RT-02); la emulación no los sustituye.
- **No** hay revisión nativa de EU: la paridad de claves y el layout no
  certifican la traducción (RT-10).
- Las mediciones de rendimiento de la auditoría siguen siendo muestras no
  calibradas: aquí solo se midió el **byte** del hero (antes/después
  comparable) — nada de CWV aprobado.
- El intento de bloqueo de raster de la auditoría **no** fue un PASS de caos
  (sigue siendo un contraejemplo). El caos de motor de esta fase sí está
  instrumentado (`rt16_engine_retry.mjs`) y se repite con un solo comando.
- `g4_scene_stories.mjs` (fuera de CI) devuelve `pass:false` por motivos
  **preexistentes** (selector móvil de la era G8 y presupuesto de acciones
  con el chrome actual); sus criterios de orden sí se corrigieron. La
  cobertura equivalente está en `g8_viewer` y `g2b_views` (ambos en verde).
- **Espaciado de texto (WCAG 1.4.12)**: probado en FASE B.1 **por inyección**
  de las sobrescrituras (`--textspacing`, PASS con aserto de aplicación) —
  eso simula la condición, no acredita el modo nativo del navegador.
- **Zoom real del navegador (1.4.4)**: **PENDIENTE** (la herramienta
  disponible no expone el nivel de zoom del UA). Lo ejecutado es `--csszoom400`
  (**zoom CSS**, declarado como tal, no vale como sustituto).
- **Sin dispositivo real disponible**: no había ADB/emulador sano en esta
  sesión (ver §9 y §11); los retests físicos siguen en `RELEASE.md` §4.

## 8b. Integridad de evidencia (FASE B.1)

- **Firma por corrida**: cada ejecución escribe su propio fichero con fecha,
  motor+versión, stubs/servicios, sello del build y resultados
  (`launch-run-<utc>*.json`, `verify.json`, `fingerprint.json`,
  `release-rehearsal/*.json`, `g18-fault-frozen-label/*`). **No se mezclan
  resultados de corridas distintas bajo una fecha única**: `launch-smoke.json`
  es un índice de corridas, cada entrada con su `utc`.
- **Identidad del candidato con tree sucio**: `fingerprint.json` —
  regenerada al final de la etapa editorial (tras el fix de
  **REGISTRO HISTÓRICO — el candidato ya se publicó.** Última huella del
  artefacto publicado: ver tabla en MATRIX.md (`build_sha256 =
  a04189981d914396…`, sello `4b1b0c8`, publishable_stamp true). La corrida
  registrada aquí abajo corresponde a la etapa editorial:
  última corrida (build con los cambios de Evolución incluidos):
  `source_sha256 = a7adb9f76931a8a4…` (1545 ficheros — las fuentes ya
  contenían los cambios del otro agente al huellarlos) y
  `build_sha256 = 455dc67ebfa561a3…` (1322 ficheros — artefacto nuevo,
  sello `0a2c7f6…+dirty(219)`) → **no publicable**. Las huellas
  identifican las fuentes y el artefacto actuales; la correspondencia
  fuente→build sigue dependiendo del proceso registrado, no de la huella
  en sí.
  (Registro B.1: `658b6ed9…` / `8af53429…` — cambian las fuentes de scripts
  en B.2 y el artefacto se re-emitió; además `build_sha256` ahora ancla las
  rutas en la raíz del artefacto.) El SHA de HEAD por sí solo **no**
  identifica el código probado; el recuento de ficheros modificados tampoco.
- **Build no determinista a nivel byte**: reconstrucciones sucesivas cambian
  `_app/version.json` y los nombres de chunk (SvelteKit), no el código. Por
  eso el `build_sha256` identifica **un** artefacto concreto y la huella de
  **fuentes** es la que vincula todas las corridas entre sí.
- **stubs vs servicios reales, separados**: las suites con `CI_STUBS=1`
  (g5…perf4, redteam_verify, golden) prueban comportamiento de la app;
  `launch_browser_smoke.mjs` (journey/reflow/textspacing/csszoom) corre con
  **SERVICIOS REALES** y así se etiqueta en su procedencia.
- **Evidencia histórica**: las suites reescriben sus artefactos en
  `evidence/g*`; las versiones anteriores siguen en sus commits (no se ha
  hecho commit). `docs/red-team/` intacto.

## 9. Corridas de FASE B.1 (además de §1–§7)

| Corrida | Motor / entorno | Servicios | Resultado | Evidencia |
|---------|-----------------|-----------|-----------|-----------|
| `scripts/release_rehearsal.ps1` (publicación + rollback + 4 controles negativos) | PowerShell 5.1 + git 2.55 en repo temporal local | ninguno (git local) | **34/34 PASS** | `release-rehearsal/rehearsal.json`, `rehearsal-run.log`, `publish-B.json`, `rollback-C.json`, `REHEARSAL.md` |
| `node scripts/launch_browser_smoke.mjs` (journey) | Playwright Chromium 153.0.8010.12 · Firefox 155.0 · WebKit 26.6 | **REALES** | Corrida conjunta: **chromium 17/17 PASS**, **webkit 17/17 PASS**, **firefox KO transitorio** (agotó 20 s en `.hero h1`; captura `smoke-firefox-fail.png` conservada). Reejecución de Firefox → **17/17 PASS**. Ambas corridas en el índice | `launch-run-*.json`, `launch-smoke.json` (índice con fecha por corrida), `smoke-*.png` |
| `node scripts/launch_smoke_faults.mjs` (4 fallos locales + normal) | Chromium 153 | reales + inyección local | **FAULT CONTROLS PASS**: `cta_missing`→`fotos_cta_activacion_visible` exit1; `place_noop`→`cambio_lugar_estado_getxo` exit1; `raster_blocked`→`fotos_cobertura_sonda` exit1; `metrics_blocked`→`resultado_headline` exit1; normal posterior **exit0** | `launch-faults.json` |
| `--reflow` (320×844) | Chromium 153 | reales | PASS (6 checks: sin scroll horizontal en documento ni fuera del mapa, titular, menú operable → modo=photo, mapa) | `launch-run-…Z.json`, `reflow-320.png` (revisada) |
| `--textspacing` (WCAG 1.4.12 inyectado) | Chromium 153 | reales | PASS (5 checks incl. aserto de aplicación observable `34.7px → 44.2px`) | `launch-run-…Z.json`, `textspacing.png` (revisada) |
| `--csszoom400` (CSS zoom, NO zoom de navegador) | Chromium 153 | reales | PASS (4 checks: caja del titular, control visible+operable, panel envuelve; desbordamiento registrado como esperado del CSS zoom) | `launch-run-…Z.json`, `csszoom-400.png` (revisada) |
| `node scripts/g18_fault_frozen_label.mjs` (control negativo RT-13) | Chromium 153 (vía g18) | stubs CI | **PASS**: con rótulo congelado → `g18_now_follows_live=false` y exit=1; normal posterior → 44/0 y exit=0 | `g18-fault-frozen-label/report.json` + `checks.json` de cada corrida |
| `powershell -File scripts/verify.ps1` (gate final) | PowerShell 5.1 | — | **TODO OK** (check 0 errores/2 warnings · eslint 0/5 · prettier PASS · 275+15 tests · build · pytest 49 · artefactos 112/112 · Range 206) | consola + `fingerprint.json` (post-build) |
| Intento de emulador Android (AVD `Pixel8_API33`, uiautomator2) | ANDROID_EMULATOR | local (`10.0.2.2:4500`) | **BLOCKED_EXTERNAL**: ANR recurrente de SystemUI y Chrome (2 intentos; el segundo sin dispositivo tras 480 s). Ningún gate cerrado | `android-emulator-anr.png` |

## 10. Controles negativos (qué fallo, qué aserto, qué exit code)

| Fallo inyectado (SOLO local) | Aserto que lo detectó | exit | Corrida normal posterior |
|------------------------------|----------------------|------|--------------------------|
| CTA de activación de FOTOS oculto (CSS) | `fotos_cta_activacion_visible` | 1 | exit 0 |
| `app.commitSearch` → no-op (el lugar no se aplica) | `cambio_lugar_estado_getxo` | 1 | exit 0 |
| Teselas de ortofoto abortadas (intercepción) | `fotos_cobertura_sonda` | 1 | exit 0 |
| JSON de métricas abortado (el resultado nunca aparece) | `resultado_headline` | 1 | exit 0 |
| Rótulo de año congelado durante reproducción | `g18_now_follows_live` | 1 | exit 0 (44/0) |
| Build sellado con otro SHA | `publish …/exit_no_cero` + motivo `/SHA candidato/` | 1 | n/a (control del ensayo) |
| Worktree = raíz del repo | motivo `/raíz del repositorio/` | 1 | n/a |
| Build incompleto | motivo `/build incompleto/` | 1 | n/a |
| Remoto divergente antes del rollback | motivo `/no coincide con el remoto/` (origen sin cambios) | 1 | n/a |

Todos los fallos son **del harness o de la red local**: ninguno se inyecta en
producción ni en el código del producto.

## 11. Matriz de entornos (sin equivalencias falsas)

| Entorno | Qué se ejecutó | Estado |
|---------|----------------|--------|
| **PLAYWRIGHT_ENGINE** Chromium 153.0.8010.12 | las 9 suites de CI, FASE B/B.1, golden, journey, modos | VERIFICADO_LOCAL |
| **PLAYWRIGHT_ENGINE** Firefox 155.0 | journey completo + `g2b_views` (29 checks) | VERIFICADO_LOCAL |
| **PLAYWRIGHT_ENGINE** WebKit 26.6 | journey completo + `g2b_views` | VERIFICADO_LOCAL — **NO es Safari físico** |
| **DESKTOP_BROWSER** Chrome/Edge/Firefox instalados | no ejecutados como binarios propios (`g2b` usa `channel: chrome/msedge` si existen; esta sesión no lo registró) | PENDIENTE — protocolo en `RELEASE.md` §4 |
| **ANDROID_EMULATOR** AVD Pixel8_API33 | intento fallido (ANR) | BLOCKED_EXTERNAL |
| **ANDROID_PHYSICAL** | ninguno conectado | PENDIENTE (RT-02) |
| **IOS_SIMULATOR / IOS_PHYSICAL** | ninguno disponible en Windows | PENDIENTE (MOB-05b, RT-02) |
| **Maestro** (CLI/MCP) | CLI no invocado en esta sesión (solo `~/.maestro/deps` de la sesión previa v2.10.0); flujo existente `evidence/android-studio/maestro/smoke_prod.yaml` sin ejecutar | PENDIENTE — instalar/invocar requiere autorización de descarga |
| **NVDA / lector de pantalla** | ninguno | REQUIRES_HUMAN (NV-18/19) |
| **Revisión nativa EU** | solo paridad/layout/leaks | REQUIRES_NATIVE_EU_REVIEW |
| **GitHub Pages (producción)** | solo lectura (HTML/CI en vivo) | PUBLICADO: nada; VERIFICADO_EN_PRODUCCIÓN: nada |

## 12. Corridas de FASE B.2 (cierre de los cuatro pendientes)

| Corrida | Entorno | Resultado | Evidencia |
|---------|---------|-----------|-----------|
| `node scripts/launch_smoke_faults.mjs` (batería completa) | Chromium 153, servicios reales | **FAULT CONTROLS PASS**: self-test del juez 12/12; `cta_missing`→`fotos_cta_activacion_visible` (exit 1, informe fresco); `place_noop`→`cambio_lugar_estado_getxo` (exit 1); `raster_blocked`→`fotos_cobertura_sonda` (exit 1); `metrics_blocked`→`resultado_headline` (exit 1); normal posterior exit 0 con los 15 obligatorios | `evidence/red-team-2026/launch-faults-20260927T173920Z.json` + `launch-run-*` por corrida |
| `powershell -File scripts/release_rehearsal.ps1` (sin `-Root`: dir único) | PowerShell 5.1 + git 2.55, repo temporal con origen local | **REHEARSAL PASS 50/50**: N1–N3 con motivo; pub-B con `-FingerprintFile` (checks `huella_corresponde_al_build`, `bytes_indice_igual_build`, `arbol_publicado_igual_build` ok); binario `og-card.png` (17 B con NUL/0xFF/CR/LF sueltos) idéntico blob a fichero vía `hash-object --no-filters`; **N4** alteración post-huella → exit 1 con motivo `/huella/`, sin commit ni push; **CRLF** `core.autocrlf=true` → publish OK y blob == bytes (161 B == 161 B, CRLF conservado); **N5** `.gitattributes «*.txt text»` → exit 1 con motivo `/transform/`, origen intacto; rollback C con árbol == A y B en el historial; remoto divergente → exit 1 | `release-rehearsal/rehearsal-20260927T175238Z.json`, `publish-B-*.json`, `publish-C-crlf-*.json`, `rollback-C-*.json` |
| Guarda de `-Root` (fixtures, sin ensayo) | PowerShell 5.1 | dir preexistente con centinela → exit 1 y **centinela intacto** (script completo, no solo `-ValidateOnly`); `F:\`, raíz del repo, subdir del repo, padre inexistente y junction→`C:\` → exit 1; ruta nueva en `%TEMP%` → exit 0 | consola (registrada en esta tabla) |
| `node <abs>/app/scripts/rt_pages_prefix.mjs` desde `F:\Temp` | Chromium 153, servicios reales | **14/14 PASS** — la invocación de `RELEASE.md` §3 funciona con cwd ajeno (el script fija sus rutas desde `import.meta.url`) | `pages-prefix.json` (regenerado en esta corrida) |

Adjudicación detallada en `MATRIX.md` §FASE B.2. Ninguna de estas corridas
toca el repo real como Git (el ensayo usa un repo temporal con origen
local), ni GitHub, ni producción.

### 12b. Corridas de FASE B.3 (identidad de informe + stop-on-fail + huella)

| Corrida | Entorno | Resultado | Evidencia |
|---------|---------|-----------|-----------|
| `node scripts/launch_smoke_faults.mjs` (batería con `LAUNCH_RUN_ID`) | Chromium 153, servicios reales | **FAULT CONTROLS PASS**: self-test 15/15 (nuevos: `run_id_de_otra_ejecucion`, `run_id_ausente`, `normal_run_id_ajeno` — un informe fresco de OTRA ejecución es rechazado); 4 fallos con su aserto y `run_id` coincidente; normal exit 0 | `evidence/red-team-2026/launch-faults-20260927T194353Z.json` + `launch-run-*-<id8>.json` |
| `powershell -File scripts\release_doc_steps_test.ps1` (bloques íntegros extraídos del propio RELEASE.md) | PS 5.1 + git 2.55, repos temporales con origen local, artefacto sintético | **DOC-STEPS PASS 28/28** — ver desglose literal/adaptado/doble abajo. Detenciones observables: `npm build` falla (doble) → throw, sin fetch ni worktree; `git fetch` roto → throw, worktree no creado; `-WhatIf` con sha ajeno → throw, **sin push** (origen intacto); smoke a puerto muerto → throw, centinela sin escribir | `evidence/red-team-2026/doc-steps-20260927T195628Z.json` (sha256 de los fences ejecutados + tabla de sustituciones S1–S8) |

**Qué se ejecutó literalmente del documento** (texto del bloque sin cambios):
`git rev-parse HEAD`, `Push-Location`/`try`/`finally`/`Pop-Location`,
`Select-String mjt:build`, `git fetch`, la rama `if/else` del worktree
(`worktree add` cuando no existe; `rev-parse --abbrev-ref` + `status
--porcelain` cuando sí), ambas invocaciones de `publish_pages.ps1`
(`-WhatIf` y `-Push`), ambas de `rollback_pages.ps1`, `git rev-parse`,
`git diff --quiet`, `git log` y **todos** los `if ($LASTEXITCODE -ne 0)
{ throw }` — son el objeto de la prueba.

**Adaptado** (misma línea, argumentos del escenario): `fingerprint_candidate.mjs`
(script real + `--root/--build/--out`), rutas `publish/rollback_pages.ps1`
(las herramientas viven en el repo real, no en el temporal), `$restore` →
SHA real del deploy A del escenario, `-SourceSha` ajeno solo en N3.

**Dobles declarados** (sustituyen pasos ligados al producto/producción):
`npm ci`, `npm run build` (el artefacto sintético ya existe),
`rt_pages_prefix.mjs`, `smoke_public.mjs` → `doc-double.mjs` exigiendo
HTTP 200 + marca sobre el worktree servido por `static-server.mjs`.

**No ejecutado en este ensayo**: `npm ci`/`build`/`rt_pages_prefix`/`smoke_public`
reales — el PASS real del prefix ya consta (`pages-prefix.json`) y el smoke
público exige producción (pendiente). Este ensayo prueba la **mecánica**
documentada; ni el producto ni GitHub Pages.

## 12c. Etapa editorial (comprensión y presentación, 2026-09-28)

**Regresión corregida (revisión de la etapa):** `closeStory` devolvía a
portada pero dejaba el municipio ancla del ejemplo como `place`; al repetir
«Ver un ejemplo», ese resto se capturaba como selección personal y se
restauraba un resultado sin año (`phase=result, place=mungia, year=null`).
Corrección: restauración completa del snapshot en todos los casos y
`phase='intro'` solo cuando el snapshot no contiene lugar (`app.svelte.ts`).
Cobertura añadida al harness mantenido `app/scripts/editorial_verify.mjs`:
dos ciclos ejemplo→volver desde portada con estado limpio, entrada con
selección personal válida (getxo/1952 restaurada) y contrato del deep link
`?story=` (la escena se convierte en personal, GH3). Además,
`home_build_stamp` valida el sello contra `git rev-parse HEAD` del repo
(acepta `+dirty(n)`; rechaza otro SHA y ausencia de sello).

Cambios de producto aplicados (alcance: `NEXT_EDITORIAL_DELIVERY.md`):

- **`hero.example`** — «O ver un ejemplo: el caso de Mungia» en la portada;
  abre el capítulo `f4036` sin formulario (`enterStory` + `phase=result`).
  `closeStory` sin snapshot personal → portada (`phase='intro'`), nunca un
  resultado vacío.
- **`story.{id}.concl`** — bloque «En síntesis» en los cinco capítulos.
- **`how.check.*`** — sección «Comprueba un resultado» en
  `/como-lo-sabemos` (trazabilidad del 85,7 % de f4036) + `data/
  editorial-cases.csv` y diccionario `.md` generados por
  `app/scripts/editorial_cases_csv.mjs` desde `evidence/g2/story-briefs/`.
- **`hero.tagline`** — subtítulo descriptivo nuevo; propagado a
  `app.html`, `og-card.png` (regenerada), `_dbg_eu_leak.mjs`, `RELEASE.md`.

| Corrida | Resultado | Evidencia |
|---------|-----------|-----------|
| `npm run check` (svelte-check) | 0 errores (2 warnings preexistentes en `AddressSearch`/`CompareYear`, archivos no tocados) | consola |
| `npx eslint` (7 archivos tocados) | 0 errores | consola |
| `npx prettier --write/--check` (7 archivos) | conforme | consola |
| `npm run test` (vitest: dominio + copylint + contrato es/eu) | **275/275** | consola |
| `npm run build` | build + sello `0a2c7f6…+dirty(210)` | `app/build` |
| `node app/scripts/editorial_verify.mjs` (harness nuevo mantenido: build servido con prefijo real de Pages) | **21/21**: dos ciclos ejemplo→volver con portada limpia (`place=null`), restauración personal getxo/1952, contrato `?story=` → resultado, «En síntesis», sección «Comprueba», CSV 200 con 5 casos, EU traducido, sello validado contra HEAD | `evidence/red-team-2026/editorial-verify-20260927T205250Z.txt` (fix `closeStory`) / `…205851Z.txt` (build con cambios de Evolución) |
| `node app/scripts/rt_pages_prefix.mjs` | **14/14** | `pages-prefix.json` |
| `LAUNCH_ENGINES=chromium node scripts/launch_browser_smoke.mjs` (desde `app/`) | **LAUNCH SMOKE PASS** | `evidence/launch-qa/launch-run-20260927T203415Z.json` (pre-fix) / `launch-run-20260927T205318Z.json` (post-fix) / `launch-run-20260927T205856Z.json` (build con Evolución) |
| `git diff --check` | limpio | consola |

**Cambio incorporado (trabajo paralelo, mismo árbol):** el modo
Evolución/Play colorea los edificios respecto al año personal (gris/azul
≤ año, rojo > año) mientras el cabezal `playYear` decide la aparición —
leyenda con ambas fechas. El otro agente lo verificó con Chromium sobre
Vite dev (`evidence/evolution-colors-1790542351834/`); aquí se verificó
además sobre **el build estático**: `EVOLUTION_BASE=http://127.0.0.1:5199
node scripts/evolution_colors_verify.mjs` → 4 checks PASS contra
`app/build` servido con Range (`evidence/evolution-colors-1790542685732/`).
`app/build` regenerado con los cambios (sello `+dirty(219)`); las huellas
de §8b quedan regeneradas al final de esta etapa.

**Pendiente (no verificado esta ronda):** comprobación del subtítulo con
personas nuevas; grabación de la demo sobre el candidato congelado;
capturas del paquete de evaluación retomadas tras el freeze; revisión
nativa EU de las 21 claves nuevas (`EU_NATIVE_REVIEW.md` §3.1); gates
humanos/remotos de siempre intactos.

## 13. Cobertura de la lista del encargo (actualizada)

Todo lo de §7 sigue vigente; se añade: controles negativos reales (§10),
procedimiento de publicación/rollback ensayado (§9), huella del candidato
(§8b), universo `c02=0` (§3 `rt04b_*`), estado recuperable de métricas
(`error.metrics_retry`), zoom/espaciado con la semántica correcta (§9) y
matriz de entornos sin equivalencias (§11).
