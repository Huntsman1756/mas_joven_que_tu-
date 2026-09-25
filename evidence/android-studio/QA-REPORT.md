# Android Studio QA — Chrome real en emulador

## ANDROID ENVIRONMENT

- **AVD:** `Pixel8_API33` (perfil `pixel_8`), imagen Google Play, x86_64
- **Android:** 13 (API 33) — `sdk_gphone64_x86_64`
- **Pantalla:** 1080×2400 @ 420 dpi (viewport CSS 412×811, dpr 2.625)
- **Chrome:** 109.0.5414.123
- **Emulator:** 37.1.11.0 · **adb:** 1.0.41 (37.0.1)
- **Host:** Windows, cold boot (`-no-snapshot`) + `-dns-server 8.8.8.8` (el AVD no hereda DNS del host)
- **Harness:** `app/scripts/g19r5_android.mjs` — CDP sobre `chrome_devtools_remote` (Playwright), capturas por `adb exec-out screencap`, gestos por `input`/`mouse`, back por `KEYCODE_BACK`.

## BUILD

- URL: `https://huntsman1756.github.io/mas_joven_que_tu-/`
- gh-pages evaluado: `5474c5a` (build `ed4142e`) → re-desplegado como `df842fb` (build `1848c74`) tras los fixes ANDROID-01/02
- Producto: `ed4142e` → `1848c74`

## TEST MATRIX

| ID | Área | Resultado | Evidencia | Finding |
|---|---|---|---|---|
| PRE-SMOKE | http/css/js/pmtiles/mapa | PASS | prod-01/02/03 | — |
| GOLDEN | home → Bilbao/1922 | PASS | golden_flow, prod-01/02 | — |
| RESULT | headline, %, cards, tabs, overflow, targets | PASS | prod-02 | — |
| MAP | sin player, bicolor, orthoRender=IDLE, drag | PASS | prod-03 | — |
| TIME | player continuo, play/pausa avanza y queda estable, clase única, scrub no mueve mapa | PASS | prod-04/05 | — |
| PHOTO | deep link ortho=1965 | FAIL→FIXED | ANDROID-01/02 | ver FINDINGS |
| PHOTO | nav ‹/› campañas | PASS | prod-06 (pre-fix: sin raster tras opt-in limpio = contrato) | — |
| HIST | modo hist, sin player, histmap montada | PASS | prod-07 | — |
| SWIPE | cortina = canvas, drag del handle sigue al dedo | PASS | prod-08/08b | — |
| CYCLE | 5 modos rápido, sin capas stale | PASS | cycle_clean | — |
| BACK | KEYCODE_BACK restaura modo/URL | PASS | back_restores | — |
| DEEPLINK | time+play=1945 | PASS | deeplink_time | — |
| DEEPLINK | photo+ortho=1965 | FAIL→FIXED | prod-15-photo-fixed | ANDROID-01 |
| INVALID | año 1899 → error visible, editor abierto, resultado intacto | PASS | prod-09 | — |
| ROTATION | portrait→landscape→portrait sin perder modo/año | PASS | prod-10/11 | — |
| FONT | font_scale=1.3 | BLOCKED | prod-12 | límite Chrome 109 (no escala texto web) — igual que g16c |
| EU | switch ES→EU, sin perder estado, sin overflow | PASS | prod-13 | — |
| COPY | Copiar enlace → clipboard con URL completa | PASS | clipboard_write | — |
| CANVAS | bitmap = css×dpr, canvas==.mapwrap | PASS | canvas_size_matches | — |
| OFFLINE | svc wifi off → app viva; on → recupera | PASS | offline_* | — |
| GESTURE | drag sobre rail no mueve mapa | PASS | scrub_no_map_pan | — |
| OVERLAP | solapes de elementos accionables | PASS parcial | tap_* | ANDROID-03 |

## FINDINGS

| ID | Severidad | Repro | Descripción | Estado |
|---|---|---|---|---|
| ANDROID-01 | **MAJOR** | 3/3 determinista | `AbortSignal.any` no existe en Chrome ≤116 → `probeCampaign` lanza TypeError → SERVICE_ERROR → ninguna ortofoto monta desde deep link ni activación (también `address.ts`/`nora.ts`). Fix: `timeoutSignal()` con fallback AbortController (commit `1848c74`). | FIXED — verificado en prod: `deeplink photo` → CONTENT/AVAILABLE, raster 1965 visible |
| ANDROID-02 | MAJOR | 3/3 | Sonda fallida → capa no monta → `orthoRender` quedaba IDLE y el lienzo no declaraba nada (canvas mudo). Fix: `updateOrtho`/`verifyOrthoCanvas` declaran EMPTY/ERROR sin capa; retry del lienzo re-sondea. | FIXED — ERROR en lienzo + «Reintentar» recupera a CONTENT |
| ANDROID-03 | MINOR | 1/3 | Overlap transitorio `.cell-inspect` cubierto por `BUTTON.btn.ghost` durante modo time (elemento below-fold). No reproducido en estado estacionario. | ABIERTO — verificar en físico |

## Notas de entorno

- DNS del emulador: el AVD no heredaba resolución del host → `-dns-server` necesario.
- Chrome 109 no escala texto web bajo `font_scale` del sistema → FONT130 = BLOCKED (límite del entorno, no del producto; mismo resultado que g16c).
- `browser.close()` de Playwright sobre CDP mata Chrome — las reconexiones necesitan relanzar la activity.
- Chrome offered translate bar visible en capturas — ambiental.

## VEREDICTO

**ANDROID_STUDIO_QA = PASS_WITH_FINDINGS** — dos defectos MAJOR encontrados, corregidos y verificados en producción (`df842fb`); un MINOR abierto para físico.

**MOB-05b = PENDING_HUMAN_PHYSICAL_DEVICE** — el emulador no sustituye hardware real.
