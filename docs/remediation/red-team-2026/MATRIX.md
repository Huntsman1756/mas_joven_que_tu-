# FASE B — Matriz de adjudicación del red team 2026-09-27

Actualización editorial local del 28-09-2026: registro separado en
`evidence/final-candidate-20260928/REVIEW.md` y `fingerprint.json` de esa carpeta.
No modifica retrospectivamente la identidad del release publicado ni cierra gates humanos.

Seguimiento de implementación de los findings de `docs/red-team/` (auditoría
fechada, conservada como registro — no se reescribe). La auditoría es entrada
de trabajo, no especificación infalible: cada finding se adjudica con
evidencia propia. **FASE B.1 (mismo día)** reabrió los cierres que la revisión
contradijo y añadió los defectos nuevos (§FASE B.1).

**Baseline recuperada al empezar (2026-09-27):**

- Rama `g11-visual-renewal`, HEAD `0a2c7f6` (incluye sondas QA, no solo docs).
- Último commit de producto: `9a1a782` (copy ES + microcopy mapa).
- Producción Pages: SHA `df842fb` (atribuida a `1848c74` por mensaje de commit).
- Último CI remoto: run **36216032651** sobre `54e3519` → `failure`
  (`g18_now_follows`) — verificado en vivo el 2026-09-27; el penúltimo
  (`fb3242e`) también falló. Ninguna corrida remota corresponde a FASE B.
- Working tree al empezar: cambios sin commitear de sesiones previas + la
  auditoría sin trackear; **no se hizo ningún commit ni push** en esta fase.

## Vocabulario

**Adjudicación del finding:** `OPEN` · `CONFIRMED` · `FIXED_VERIFIED` ·
`NOT_REPRODUCED` · `NOT_APPLICABLE` · `REQUIRES_HUMAN` · `BLOCKED_EXTERNAL`.
`FIXED_VERIFIED` exige (FASE B.1): (1) corrección implementada, (2) la
prueba evalúa la propiedad relevante, (3) la prueba falla ante un
contraejemplo adecuado cuando corresponde, (4) el escenario corregido pasa,
(5) la evidencia identifica el candidato.

**Cadena de publicación** (columna «Cadena»): `IMPLEMENTADO` →
`VERIFICADO_LOCAL` → `VERIFICADO_CI_REMOTO` → `PUBLICADO` →
`VERIFICADO_EN_PRODUCCIÓN`. **En este candidato solo se alcanzan los dos
primeros**: no existe ninguna corrida de CI remota de FASE B ni nada
publicado. `VERIFICADO_CI_REMOTO` ≠ «nueve suites locales verdes».

**Identidad del candidato (working tree sucio)** — `evidence/red-team-2026/fingerprint.json`:

| Huella | Valor |
|--------|-------|
| `source_sha256` (1546 ficheros: src, scripts, static, pipeline, configs) | `c1344b8d77b297c4…` (candidato publicado `4b1b0c8`; anterior: `a7adb9f7…`) |
| `build_sha256` (1322 ficheros de `app/build`) | `a04189981d914396…` (**publicado** en gh-pages `21316b3`, sello `4b1b0c8`; anteriores: `455dc67e…`, `b81b0156…`) |
| `mjt:build` del HTML | `4b1b0c8…` sin dirty → **publicable y publicado** (gh-pages `21316b3`, smoke público 7/7) |

El build **no es bit-a-bit reproducible** (SvelteKit estampa `_app/version.json`
por corrida y los nombres de chunk cambian): el HEAD solo no identifica el
código probado, por eso se registra la huella de fuentes; el artefacto que se
publique debe ser el huellado **después** de commitear (sello limpio).

## Findings RT-01 … RT-22

| ID | Estado | Cadena | Evidencia inicial | Decisión | Verificación (FASE B.1) | Pendiente real |
|----|--------|--------|-------------------|----------|--------------------------|----------------|
| RT-01 | REQUIRES_HUMAN *(procedimiento reabierto y corregido en B.1)* | IMPLEMENTADO · VERIFICADO_LOCAL | Producción `df842fb` ≠ HEAD; CI rojo histórico; sin candidato identificado | Sello `mjt:build` + procedimiento **ejecutable** (`scripts/publish_pages.ps1`, `scripts/rollback_pages.ps1`) con validación previa total, `-WhatIf` y reports JSON; ensayo completo en repo temporal | Ensayo **34/04 checks PASS** (`release-rehearsal/REHEARSAL.md`): A→B→C, gitfile preservado, bytes correctos, obsoletos fuera, controles negativos con motivo; `pages-prefix.json` 14/14 (build relativo y `BASE_PATH`); `verify.ps1` TODO OK | Commit + CI remoto + deploy (humano). **Un build `+dirty` no es publicable** |
| RT-02 | REQUIRES_HUMAN | IMPLEMENTADO (protocolo) | MOB-05b y NV-18/19 sin PASS físico | Protocolo y matriz de retests en `RELEASE.md` §4; sin PASS inventado | Inventario: sin dispositivo conectado; AVD `Pixel8_API33`/`hbo`; Maestro CLI no invocado (solo deps de la sesión MCP previa, v2.10.0); intento de emulador → ANR recurrente (evidencia `android-emulator-anr.png`) → `BLOCKED_EXTERNAL` | Safari iOS físico, NVDA, Safari macOS/Firefox instalados |
| RT-03 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Entrar en Fotos mostraba campaña sin imagen ni explicación | Estado inicial inequívoco (`photo.hint` + `photo.activate`) conservando el opt-in | `verify.json` (60 checks): 8 rutas RT-03 + `global_photo_mode_zero_ortho` (0 req); `g2b net_no_ortho_on_switch` PASS; `launch journey` verifica estado/URL/petición/respuesta/cobertura/contenido en 3 motores | — |
| RT-04 | FIXED_VERIFIED **(reabierto en B.1: le faltaba el universo sin año conocido)** | IMPLEMENTADO · VERIFICADO_LOCAL | 1/3.528 → «La cifra exacta: 0 %»; y con `c02=0` el titular seguía afirmando «Ningún edificio…» + «0 de 0» | `fmtPctEdge` + «La cifra» **y** estado explícito `known=0` en titular, recuento, resumen accesible, histograma, comparación de dos años, cálculo y chip de celda; ceros verdaderos conservados | `golden-cases.json` (17: Karrantza `<0,1 %`, sin «0 %»/«exacta») + `verify.json rt04b_*` (11 checks con fixture local `rt04-metrics-zero.json`, sin NaN/undefined en pantalla); fixture aceptado por la frontera (test) | Escenario no observado en los 112 (declarado) |
| RT-05 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | «1,9» sin unidad | Unidad `result.pct_value` en ambas filas (ES/EU) | `verify.json rt05_contrast_units = ["85,7 %","1,9 %"]`; `g2b c1_denominators_*` PASS | — |
| RT-06 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Hallazgos detrás del visor/contexto | Franja «Un hallazgo» EN el primer panel (universo real: celda 500 m, 70 edificios) + `STORY_ORDER` abre por `f4036` | `verify.json rt06_*` (8 checks incl. índice por Mungia); vitest `stories.test`; `g2b todo PASS` | — |
| RT-07 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Memoria DRAFT G5 + README con fases obsoletas | Reescritura contra el producto real (incluye §FASE B.1) | Lectura cruzada README ↔ memoria ↔ PRODUCT/UX_COPY | Actualizar en el freeze final |
| RT-08 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Receta G1 incompatible con el CLI real | `--only`, preingesta `g0_recon`, `verify.ps1` con `format:check` | Error reproducido; `--catalog-only` idéntico; **reconstrucción en entorno aislado** (243,5 MB fuera del repo, sin `.git`): `npm ci` + check/format/lint + 275/15 tests + build + 49 pytest, todo verde; sello `unknown` | Regenerar datos solo como corte nuevo declarado |
| RT-09 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Hashes existen (112) pero dispersos | Enlace registro↔inventario↔ZIP en `data/manifests/README.md`, memoria y `SOURCES-LICENSES.md` | `recon-bizkaia.json`: 112 `sha256_or_error`, 0 `failures`; YAML parsea | Conservar `data/raw/` |
| RT-10 | REQUIRES_HUMAN | IMPLEMENTADO (lista) | 513 claves EU; delta sin revisión nativa | Lista exacta de **21** claves/ contextos de FASE B/B.1 + 24 heredadas; verificaciones estructurales | Paridad **531/531** + tokens; `verify:eu` 2/2; `g14_eu_qa` **101/101**; layout 320 EU | **Revisión lingüística nativa** (corpus completo) |
| RT-11 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | «no incluye ningún dato personal» excesivo | `share.done` describe los campos reales | copylint RT-11 (ES+EU) | — |
| RT-12 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Hero 2 JPEG = 1.309.435 B | `srcset` 800/1200/1600 + recompresión con hashes en su manifest | `rt12-hero.json`: 272.473 B (−79 %) DPR1-2, 1.012.738 B (−23 %) Retina; `currentSrc` verificado | CWV de campo sin acreditar |
| RT-13 | FIXED_VERIFIED **(reabierto en B.1: solo cubría la pausa)** | IMPLEMENTADO · VERIFICADO_LOCAL | `g18_now_follows` comparaba `y1` y el texto en ticks distintos | (B) aserto de pausa + **(B.1) aserto EN VIVO**: DOM↔cabezal muestreados iguales ANTES y DESPUÉS de comprobar avance real, sin sleeps arbitrarios | `g18_timeplayer` **44 checks/0 fallos**; control negativo `g18_fault_frozen_label`: con rótulo congelado → `g18_now_follows_live=false` y **exit=1**; corrida normal posterior **exit=0** (`g18-fault-frozen-label/report.json`) | — |
| RT-14 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | advisory `cookie` LOW | Override `cookie@^0.7.2`; sin downgrade de SvelteKit/adapter | `npm audit` 0; `npm ci` 227 paquetes; diff del lock = solo `resolved` de `cookie` | — |
| RT-15 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | `AbortSignal.timeout` sin fallback | Fallback + baseline declarada + test | vitest rama sin `timeout` (`TimeoutError` + composición); journey 17/17 en chromium y webkit y 17/17 en Firefox (corrida individual; la conjunta tuvo un timeout transitorio conservado, ambas conservadas); `g2b` en verde en los 3 motores; `--reflow` y `--textspacing` operables | Navegadores instalados y físicos (RT-02) |
| RT-16 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Rechazo del import cacheado; sin estado visible | Estado visible + recarga (el *module map* impide reintento en sesión, verificado); sin unhandled rejection | `rt16 7/7`: fallo → `.maperror`+acción, 0 pageerrors, 1 petición en sesión, recarga → canvas + estado conservado | — |
| RT-17 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | CI subía `evidence/` entero (573 MB) | Marcador + `find -newer` + `if-no-files-found: warn` | YAML parsea (3 jobs); simulación bash local: solo el fichero del run, estructura `--parents`, evidencia previa fuera (exit 0) | Primer run rojo real (post-push) |
| RT-18 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Población duplicada en 2025; «1 se terminaron» | Normalización de periodos + singulares (`text_summary_one`, cálculo, particiones, década) | Auditoría `karrantza-2025-dom.txt:130`; `rt18_padron_not_duplicated` (2.741 ×1); `rt18_calc_singular` y `rt18_partition_singular` | — |
| RT-19 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | Cuota podía leerse como densidad/huella | Leyenda declara que cuenta **edificios** | `g10 g12_legend_contract` PASS (59/0) | — |
| RT-20 | FIXED_VERIFIED **(reabierto en B.1: aceptaba `dist:[null]`)** | IMPLEMENTADO · VERIFICADO_LOCAL | `fetchJson` aceptaba filas `null` y constantes incompletas → `TypeError`/`NaN` aguas abajo | Validación de frontera profunda con **motivo**: tipos/ rangos, filas de `dist`/`cum`, orden ascendente, constantes y coherencias C-01…C-06; opcionales como opcionales; botón de reintento en el fallo | 275 tests (contraejemplos del revisor, filas `null`, tipos, orden, coherencia, recuperación tras cuerpo inválido) + **barrido real: catálogo + 112 municipios + 112 métricas = todos validan** + E2E `rt04b` con fixture c02=0 | — |
| RT-21 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | OG «70 años construyendo Bizkaia» | Claim real en OG/twitter + `og-card.png` regenerado + charter actualizado | `build/index.html` con título nuevo; `og-card.png` 69.061 B; sin «70 años» en src/README/scripts | Previews de terceros no se prometen |
| RT-22 | FIXED_VERIFIED | IMPLEMENTADO · VERIFICADO_LOCAL | `tls_verified=True` en ZIP de caché | `None`=UNKNOWN + `from_cache`; evidencia histórica intacta | 4 tests (caché sin red, HTTP 500, fresco `True`, red caída `None`); `pytest` **49 PASS**; `recon-bizkaia.json` sin campos `tls_verified` | — |

## FASE B.1 — defectos nuevos encontrados al verificar (no estaban en GAPS)

| Qué | Evidencia | Estado / Cadena | Decisión |
|-----|-----------|-----------------|----------|
| El procedimiento de publicación de `RELEASE.md` borraba la metadata de Git: `Get-ChildItem -Force \| Where {≠ .nojekyll} \| Remove-Item` seleccionaba el gitfile `.git` del worktree (además de depender de un `cd` implícito y no validar rutas) | Revisión P0 de la propia FASE B | `FIXED_VERIFIED` · IMPLEMENTADO · VERIFICADO_LOCAL | `scripts/publish_pages.ps1`: validación total **antes** de tocar nada (raíz de git, gitfile vincado con `-Force` por atributo HIDDEN, rama, limpieza, remoto, sello, inventario), limpieza por entrada con ruta contenida, verificación índice==build, exit codes, `-WhatIf`, `-ReportFile`; ensayo con controles negativos |
| El rollback propuesto (`git push origin <sha>:gh-pages`) sería **non-fast-forward** tras un deploy nuevo | Revisión P0 | `FIXED_VERIFIED` · IMPLEMENTADO · VERIFICADO_LOCAL | `scripts/rollback_pages.ps1`: commit C con el árbol del deploy objetivo y padre = tip (fast-forward, sin force, mensaje que indica qué deploy revierte, revalidación del remoto antes de push); ensayo A→B→C + control de remoto divergente |
| Defectos de los propios scripts SUT que el ensayo cazó: rutas `F:/…` vs `F:\…`, `Get-Item` sin `-Force` sobre gitfile HIDDEN, stderr de `git fetch` como `NativeCommandError` con `EAP=Stop`, CRLF de `Out-String` rompiendo comparaciones | `release-rehearsal/REHEARSAL.md` §Defectos 1–4 | `FIXED_VERIFIED` · IMPLEMENTADO · VERIFICADO_LOCAL | Corregidos y re-ensayados: 34/34 |
| `launch_browser_smoke` no podía fallar: PASS no exigía ortofoto activa ni municipio correcto, exit siempre 0, «sin estado» no probaba AVAILABLE, resultados de corridas distintas mezclados bajo una fecha | Revisión P1 | `FIXED_VERIFIED` · IMPLEMENTADO · VERIFICADO_LOCAL | Semántica estricta (estado/URL/petición/respuesta/cobertura/contenido + lugar esperado), `process.exitCode`, cierre garantizado de navegador/servidor, un fichero de detalle POR corrida + índice con la fecha de cada una, procedencia (build/HEAD/node/Playwright/servicios); **4 controles negativos** locales (CTA oculto, `commitSearch` no-op, teselas abortadas, métricas abortadas) → exit=1 con el aserto exacto y corrida normal posterior exit=0 (`launch-faults.json`) |
| Prueba «zoom400»: era `document.body.style.zoom` con aserto de caja no nula — no acreditaba ni zoom real ni ausencia de pérdida | Revisión P1 | `FIXED_VERIFIED` (CSS) · IMPLEMENTADO · VERIFICADO_LOCAL · **zoom del navegador: PENDIENTE** | Renombrada `--csszoom400` con aserto de operabilidad + envoltorio del titular + nota explícita de que NO es zoom de navegador; `--reflow` con dimensiones explícitas (320×844), scroll horizontal del documento Y fuera del mapa, controles operables; `--textspacing` (WCAG 1.4.12 inyectado) con aserto de aplicación observable; capturas revisadas visualmente. **Zoom real del navegador (1.4.4): no verificable con la herramienta disponible → pendiente declarado** |
| Cobertura del reproductor incompleta: la corrección solo miraba la pausa | Revisión P1 (RT-13) | `FIXED_VERIFIED` · IMPLEMENTADO · VERIFICADO_LOCAL | Aserto en vivo coherente + control negativo (§RT-13) |
| Emulador Android no utilizable: ANR recurrente de SystemUI y Chrome tras cold boot (2 intentos; el segundo ni siquiera registró dispositivo); Maestro CLI no invocado (solo `~/.maestro/deps` de la sesión MCP previa) | `evidence/red-team-2026/android-emulator-anr.png` + registro de intentos | `BLOCKED_EXTERNAL` | Sin instalar nada (la mención de Maestro no autoriza descargas); protocolo en `RELEASE.md` §4; **ningún gate físico se cierra con esto** |
| Fallo transitorio: en una corrida del journey, Firefox agotó 20 s esperando `.hero h1` (chromium y webkit PASS); reejecución individual → PASS | `launch-smoke.json` (ambas corridas conservadas) | `NOT_APPLICABLE` (transitorio, reproducido 0/2 en reejecución) | Ambas corridas se conservan como evidencia; no se oculta ni se reescribe |
| `g4_scene_stories.mjs` (fuera de CI) sigue con `pass:false` por causas preexistentes de la era G8/MOB (menú móvil, presupuesto ≤6) — corregido solo su criterio de orden | ver FASE B | `NOT_APPLICABLE` (harness histórico) | Cobertura equivalente en `g8_viewer`/`g2b_views` (ambos en verde) |

## FASE B.2 — cuatro pendientes de la revisión de B.1

La revisión de FASE B.1 encontró cuatro defectos en la propia entrega de
remediación. Adjudicación tras corregir y volver a verificar
(`evidence/red-team-2026/launch-faults-20260927T173920Z.json`,
`release-rehearsal/rehearsal-20260927T175238Z.json`, fixtures de `-Root`):

| Pendiente | Defecto reproducido | Corrección | Estado |
|-----------|---------------------|------------|--------|
| **B2-1** Ejecutor de controles negativos vacío | `scripts/launch_smoke_faults.mjs` era 3 bytes (solo BOM): `exit 0` sin ejecutar nada | Ejecutor real (ya presente al entrar en B.2): cwd explícito `app/`, exige por fallo — escenario ejecutado (checks previos en verde), informe NUEVO y fresco (mtime + `utc` en ventana), `exit=1`, aserto esperado entre los fallidos — y escenario normal posterior `exit=0`; **self-test previo** (12 casos) que demuestra que no puede dar PASS por ejecución vacía | FIXED_VERIFIED — corrida nueva `20260927T173920Z`: 4 fallos detectados por su aserto + normal PASS |
| **B2-2** Publicación comparaba nombres, no bytes | `indice_igual_al_build` cotejaba `git ls-files` con el inventario: contraejemplo CRLF (fichero 14 B → blob 13 B) daba `PUBLISH OK` | Contrato byte a byte: `git add` con `-c core.autocrlf=false -c core.safecrlf=false` (solo esa llamada) + comparación de **id de blob** (SHA-1 de `blob <len>\0<bytes>`) índice↔build y árbol↔build; huella `fingerprint.json` obligatoria y correspondiente al build; transformaciones restantes (`.gitattributes`, filtros) se detectan y abortan | FIXED_VERIFIED — ensayo 50/50: publish OK con bytes idénticos, binario (17 B con NUL/0xFF) byte a byte, CRLF preservado bajo `autocrlf=true`, alteración post-huella rechazada, `.gitattributes text` rechazado |
| **B2-3** `-Root` borraba cualquier ruta | `if (Test-Path $Root) { Remove-Item -Recurse -Force }` sin validación suficiente | Eliminado todo borrado de rutas del usuario: directorio **nuevo y único** por ejecución (GUID bajo temp); `-Root` explícito debe no existir, no ser raíz de unidad, no coincidir/estar dentro/contener el repo, padre existente y sin ancestros reparse point/junction; `-ValidateOnly` prueba la guarda sin ejecutar nada | FIXED_VERIFIED — fixtures: centinela preexistente conservado (exit 1 antes de tocar nada), `F:\`, repo, subdir del repo, padre inexistente y junction rechazados; ruta nueva en temp aceptada; ensayo normal PASS en dir único |
| **B2-4** RELEASE.md inconsistente | `rt_pages_prefix.mjs` por ruta absoluta pero resolvía `build/` desde `process.cwd()`; matriz proponía `BROWSER=webkit` para acreditar Safari y `BROWSER=firefox` para Firefox del usuario | El script resuelve `app/` desde `import.meta.url` (cwd irrelevante); matriz corregida: Playwright WebKit/Firefox acreditan **esos binarios**, no Safari.app ni el Firefox instalado — retest real documentado o PENDIENTE; bloques PS con comprobación de `$LASTEXITCODE` | FIXED_VERIFIED — invocación documentada ejecutada tal cual desde `F:\Temp` → **14/14 PASS** (`pages-prefix.json` regenerado) |

Además: `rollback_pages.ps1` — la comprobación extra de `index.html` ya no se
denomina ni se hace «texto normalizado»: compara el **id de blob** (bytes
exactos). `scripts/verify.ps1` — whitespace pendiente corregido (EOL LF,
convención del repo). La evidencia de corridas anteriores no se sobrescribe:
todos los artefactos nuevos llevan sello de su ejecución.

## FASE B.3 — tres ajustes residuales de la revisión de B.2

| Ajuste | Defecto | Corrección | Estado |
|--------|---------|------------|--------|
| **B3-1** Identidad del informe | `report_utc_fresh` aceptaba ±15 min: un informe generado 60 s **antes** de la corrida pasaba | Cada hijo recibe `LAUNCH_RUN_ID=<uuid>`; el smoke lo registra en el informe (`run_id`) y en el nombre del fichero (`launch-run-…-<id8>.json`); el juez exige coincidencia exacta — la fecha queda como comprobación **adicional** | FIXED_VERIFIED — batería nueva `launch-faults-20260927T194353Z.json`; self-test 15/15 (nuevos casos: run_id ajeno, run_id ausente, normal con run_id ajeno) |
| **B3-2** Bloques de RELEASE.md sin stop-on-fail | `git fetch`, `worktree add`, `-WhatIf`, `-Push`, `smoke_public` y los equivalentes de rollback no comprobaban `$LASTEXITCODE` | Todos los comandos nativos llevan `if ($LASTEXITCODE -ne 0) { throw }` inmediato; `Push-Location` dentro de `try/finally`; worktree existente → inspeccionar y validar, nunca borrar; bloques de verificación autocontenidos (`$repo`/`$restore` declarados) | FIXED_VERIFIED — `scripts/release_doc_steps_test.ps1` extrae los **4 bloques íntegros** del propio RELEASE.md y los ejecuta en repos temporales con origen local: recorrido completo OK (publish×2, rollback, `diff --quiet`) y 4 detenciones demostradas con centinela + marcador del paso que falló (`doc-steps-20260927T195628Z.json`, 28/28). **Límite:** los pasos ligados al producto/producción van con dobles declarados (`npm ci/build`, `rt_pages_prefix`, `smoke_public` HTTP local, artefacto sintético) — el ensayo prueba la *mecánica* (secuencia + stop-on-fail), no el producto ni GitHub Pages |
| **B3-3** Afirmación de procedencia de la huella | `note` decía «las fuentes que lo produjeron» — la correspondencia causal no la demuestra el script | Texto corregido: `source_sha256` identifica los ficheros de fuentes incluidos; `build_sha256` los bytes del artefacto; la correspondencia depende del proceso registrado; `publishable_stamp` solo acredita el formato del sello | FIXED_VERIFIED — campos y algoritmo sin cambios |

## Notas de método

- **`VERIFICADO_LOCAL` ≠ CI remoto**: las 9 suites de CI se corrieron aquí
  con `CI_STUBS=1`; el último run **remoto** sigue siendo el fallo de
  `54e3519` (FASE A). `PUBLICADO` y `VERIFICADO_EN_PRODUCCIÓN`: ninguno.
- Las suites de gate reescriben sus propios artefactos en `evidence/g*`; las
  versiones anteriores siguen en sus commits (no se ha commiteado nada).
- `docs/red-team/` no se ha modificado; sigue siendo el registro fechado de
  la FASE A.
- Evidencia del candidato: `evidence/red-team-2026/`
  (`verify.json` 60 · `golden-cases.json` 17 · `rt16-engine-retry.json` 7 ·
  `pages-prefix.json` 14 + `pages-prefix-basepath.json` 14 · `rt12-hero.json` ·
  `fingerprint.json` · `release-rehearsal/` 34 · `android-emulator-anr.png`),
  `evidence/launch-qa/` (journey 3 motores, reflow, textspacing, csszoom,
  `launch-faults.json`), `evidence/g18-fault-frozen-label/report.json`.
