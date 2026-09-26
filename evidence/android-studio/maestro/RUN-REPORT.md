# Maestro smoke — producción en AVD Pixel8_API33

Fecha: 2026-09-26 · Objetivo: sustituir los checks móviles ad hoc por un flujo
repetible y legible por agentes (sin tocar los gates humanos).

## Entorno

- **Dispositivo:** `emulator-5554` = AVD `Pixel8_API33` (Android 13, API 33,
  `sdk_gphone64_x86_64`, 1080×2400 @420 dpi) — el mismo del QA-REPORT.
- **Boot:** cold boot `-no-snapshot -dns-server 8.8.8.8` (el AVD no hereda DNS
  del host). ANR de SystemUI en el arranque → «Wait», recuperación limpia.
  Chrome ANR en su primer arranque tras el cold boot → recuperado. Ambiental.
- **Chrome:** primera ejecución tras `clearState` muestra ToS + «Turn on sync?»;
  el flujo los cubre con taps opcionales (no usar `clearState` en Chrome).
- **Producción:** `https://huntsman1756.github.io/mas_joven_que_tu-/`
- **Driver:** Maestro MCP (`list_devices`/`inspect_screen`/`run`/`take_screenshot`).

## Flujo

`smoke_prod.yaml` — 44 comandos, ejecutado **2 veces seguidas con PASS** sobre
la versión final del archivo. Golden path idéntico al QA: Bilbao / 1922.

| Paso | Aserción / evidencia | Resultado |
|---|---|---|
| Home | `year-input`, `place-input`, lista NORA (`place-opt-0`), CTA habilitado | PASS — `00_home`, `01_result` |
| Resultado | «BILBAO, DESDE 1922», 85,7 %, 11.780/13.738 | PASS — `01_result` |
| Por antigüedad | mapa con celdas + leyenda + «Ver datos de esta zona» | PASS — `02_map_antiquity` |
| Evolución | play → «Pausar evolución» (playback activo), fin estable en 2026 | PASS — `03_time_idle`, `04_time_playing` |
| Fotos aéreas | nav ‹/›: 1945 → «Campaña siguiente: 1956» → raster B/N pintado | PASS — `05_photo_1956` (contenido verificado, no lienzo vacío) |
| Antes / ahora | SeekBar «Cortina de comparación», drag mueve el handle | PASS — `06_swipe_idle`, `07_swipe_dragged` |

## Notas de a11y del árbol (para futuros selectores)

- «Desliza para comparar» **no está en el árbol accesible** (etiqueta solo
  visual). El handle de la cortina es un `SeekBar` con texto
  `<n>, Cortina de comparación: {a} a la izquierda, {b} a la derecha`.
- El selector de vista es un menú nativo: «VISTA {modo}» → `MenuItem`s
  («Evolución», «Fotos aéreas», «Mapa 1923–25», «Antes / ahora»).
- La lista NORA solo se expone con el teclado oculto (`hideKeyboard`).

## ANDROID-03 — verificación

Finding original (QA-REPORT): overlap transitorio `.cell-inspect` cubierto por
`BUTTON.btn.ghost` en modo time, 1/3, below-fold.

El árbol a11y de Maestro no ejecuta `elementFromPoint` en el DOM de la página —
para replicar el detector original se usó CDP (`chrome_devtools_remote`, la
única capacidad que Maestro no expone aquí) con dos sondas en
`app/scripts/qa_android03_probe{,2}.mjs`:

- **Sonda 1:** 6 transiciones map↔time con leyenda abierta + scrolls forzados,
  muestreo cada ~120 ms → 180 muestras, `elementFromPoint` en el centro de
  `.cell-inspect` → **0 cubiertas**.
- **Sonda 2:** 3 reproducciones completas del player (1922→1968+, la leyenda
  hace reflow en cada tick) → 120 muestras → **0 cubiertas**.
- En todos los estados estacionarios `.cell-inspect` y `.btn.ghost` ocupan
  rects disjuntos en flujo normal (a11y: [36,147][462,265] vs
  [42,611][931,732]).

**Resultado:** ANDROID-03 **no reproducido de forma determinista** — coherente
con su valoración original (transitorio, 1/3, MINOR). Sigue **ABIERTO** para
verificación en dispositivo físico (MOB-05b, gate humano). No se modifica
producto: sin defecto reproducible no hay fix que justificar.

## Reproducir

```bash
# 1. Boot del AVD (host Windows)
"F:/Android/Sdk/emulator/emulator.exe" -avd Pixel8_API33 -no-snapshot -dns-server 8.8.8.8
# 2. Ejecutar el flujo vía Maestro MCP
run { device_id: "<id de list_devices>", files: ["evidence/android-studio/maestro/smoke_prod.yaml"] }
```

Las capturas `00..07` son las de la última pasada verificada. Regenerarlas con
un run nuevo y comparar manualmente (canvas no asertable por a11y).

## Adjudicación (2026-09-26)

- `MAESTRO_ANDROID_SMOKE = PASS` — este flujo queda como **regresión
  permanente** (tag `regression`); sustituye los checks `adb` de coordenadas.
- `ANDROID_STUDIO_QA = PASS_WITH_FINDINGS — CLOSED`
- `ANDROID-01` / `ANDROID-02` = `FIXED_VERIFIED`
- `ANDROID-03` = `NOT_REPRODUCED / PENDING_PHYSICAL` — el retest físico lo
  incluye MOB-R1 §pendiente («si ya no roba interacción, cerrarlo»).
- `MOB-05b` = `PENDING/FAIL` hasta revalidación en iPhone Safari del
  candidato MOB-R2 (`c90db43` congelado, `evidence/mobile-physical/MOB-R2.md`).
- `NV-18/19` = `PENDING` (NVDA real).

## CI — recomendación registrada (no implementada)

Si se automatiza: workflow **manual / `workflow_dispatch`**, no por commit —
emulador + Chrome + Maestro es caro y lento para cada push. Reservado a
candidatos de release o a cambios que toquen mapa / player / móvil.
Requisitos del runner: AVD API 33, Chrome estable, `maestro` CLI, DNS explícito.
Sin verificar en CI no se commitea un workflow que afirme funcionar.
