<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';

  /**
   * Eje temporal (G5 GT1): UN solo eje, el catastral. Dos posiciones
   * independientes: TU AÑO (fijo, `app.year`) · REPRODUCCIÓN (móvil,
   * `app.playYear`). El Play revela el stock actual por `Ano_Constr <=
   * playYear`; nunca toca `app.year` (T1). Las campañas de ortofoto ya NO
   * son marcas de este eje: viven en su propio panel de escena, con su
   * propio sistema de fechas (nominal/vuelo).
   */

  const TICK_MS = 280; // 1 año registrado por tick — ritmo editorial, no video
  const AXIS_MIN = 1900; // mismo límite inferior que la entrada de año del hero

  let snapshot = $derived(app.catalog?.snapshot_year ?? 2026);
  let reduceMotion = $state(false);

  function pct(y: number): number {
    return ((y - AXIS_MIN) / (snapshot - AXIS_MIN)) * 100;
  }

  const clampY = (y: number) => Math.min(snapshot, Math.max(AXIS_MIN, Math.round(y)));

  let timer: ReturnType<typeof setInterval> | null = null;
  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  /** La URL se sincroniza solo en eventos discretos, nunca por frame (G2 §8). */
  const bumpUrl = () => app.playUrlSeq++;

  function tick() {
    if (app.playYear === null) return stopTimer();
    const next = app.playYear + 1;
    if (next >= snapshot) {
      app.playYear = snapshot;
      finish();
    } else {
      app.playYear = next;
    }
  }

  function play() {
    if (app.year === null) return;
    // G10-08: con reduced-motion el botón no se renderiza, pero si se
    // invoca igualmente (foco retenido, re-entrada) se degrada a un paso.
    if (reduceMotion) return step(1);
    if (app.playYear === null || app.playYear >= snapshot) app.playYear = app.year;
    app.playYear = clampY(app.playYear);
    app.playing = true;
    stopTimer();
    timer = setInterval(tick, TICK_MS);
    bumpUrl();
  }

  function pause() {
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  function finish() {
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  function restart() {
    if (app.year === null) return;
    app.playYear = clampY(app.year);
    // G10-08: reiniciar = volver al año propio; con reduced-motion no
    // arranca animación automática (el usuario avanza con los pasos).
    if (reduceMotion) {
      app.playing = false;
      stopTimer();
      bumpUrl();
      return;
    }
    app.playing = true;
    stopTimer();
    timer = setInterval(tick, TICK_MS);
    bumpUrl();
  }

  /** «Volver al presente»: sale del modo temporal (stock completo). */
  function reset() {
    app.playYear = null;
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  /** Paso manual: equivalente del Play bajo reduced-motion (T6). */
  function step(d: number) {
    if (app.year === null) return;
    app.playing = false;
    stopTimer();
    app.playYear = clampY((app.playYear ?? app.year) + d);
    bumpUrl();
  }

  function onScrubInput(e: Event) {
    if (app.year === null) return;
    app.playing = false;
    stopTimer();
    app.playYear = clampY(Number((e.target as HTMLInputElement).value));
  }

  function onScrubCommit() {
    bumpUrl();
  }

  // Un cambio explícito del año personal apaga el modo temporal: el cabezal
  // arranca de nuevo desde el nuevo `selected_year` (G2-DIRECTION §4).
  let lastYear = app.year;
  $effect(() => {
    const y = app.year;
    if (y !== lastYear) {
      lastYear = y;
      app.playYear = null;
      app.playing = false;
      stopTimer();
    }
  });

  // ── Alternativa textual (A2): anuncio discreto, no por frame ──
  let announce = $state('');
  $effect(() => {
    const p = app.playYear;
    if (p === null) {
      announce = '';
      return;
    }
    if (!app.playing || p % 5 === 0 || p === snapshot) {
      announce = t('time.status', { play_year: p });
    }
  });

  onMount(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const on = (e: MediaQueryListEvent) => (reduceMotion = e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });

  onDestroy(stopTimer);
</script>

{#if app.year !== null}
  <section class="timeband" aria-label={t('time.axis_label')}>
    <div class="t-head">
      <div class="t-controls">
        {#if reduceMotion}
          <button class="t-btn" onclick={() => step(-1)}>{t('time.step_back')}</button>
          <button class="t-btn" onclick={() => step(1)}>{t('time.step_fwd')}</button>
        {:else if app.playing}
          <button class="t-btn primary" onclick={pause}>{t('time.pause')}</button>
        {:else}
          <button class="t-btn primary" onclick={play}>{t('time.play')}</button>
        {/if}
        <button class="t-btn" onclick={restart}
          >{t('time.restart', { selected_year: app.year })}</button
        >
        {#if app.playYear !== null}
          <button class="t-btn" onclick={reset}>{t('time.reset')}</button>
        {/if}
      </div>
      <div class="t-years" aria-hidden="true">
        <span class="you">{t('time.you', { selected_year: app.year })}</span>
        {#if app.playYear !== null}
          <span class="ph">{t('time.playhead', { play_year: app.playYear })}</span>
        {/if}
      </div>
    </div>

    <div class="axis">
      <input
        class="scrub"
        type="range"
        min={AXIS_MIN}
        max={snapshot}
        step="1"
        value={app.playYear ?? Math.max(AXIS_MIN, app.year)}
        oninput={onScrubInput}
        onchange={onScrubCommit}
        aria-label={t('time.scrub_label')}
      />
      <div class="axis-line"></div>
      {#each [1900, 1920, 1940, 1960, 1980, 2000, 2020] as d (d)}
        <span class="decade" style="left:{pct(d)}%">{d}</span>
      {/each}
      <i class="mark mark-you" style="left:{pct(app.year)}%"></i>
      {#if app.compareYear !== null}
        <i class="mark mark-compare" style="left:{pct(app.compareYear)}%"></i>
      {/if}
      {#if app.playYear !== null}
        <i class="mark mark-play" style="left:{pct(app.playYear)}%"></i>
      {/if}
    </div>

    <p class="t-note">{t('time.caption')}</p>
    <p class="sr-only" role="status">{announce}</p>
  </section>
{/if}

<style>
  .timeband {
    border-bottom: 1px solid var(--line);
    background: var(--paper-2);
    padding: 0.55rem clamp(1rem, 4vw, 2.4rem) 0.7rem;
    /* los hitboxes de 44px de las marcas de borde sobresalen del eje: se
       recortan aquí, no en .axis (las etiquetas de década viven en el padding) */
    overflow-x: clip;
  }
  .t-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .t-controls {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .t-btn {
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--ink-2);
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    min-height: 44px;
  }
  .t-btn.primary {
    background: var(--ink);
    color: var(--paper);
  }
  .t-btn:hover {
    background: var(--paper);
  }
  .t-btn.primary:hover {
    background: var(--ink-2);
  }
  .t-btn:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .t-years {
    display: flex;
    gap: 1.2rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.08em;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .t-years .you {
    color: var(--accent-deep);
  }
  .t-years .ph {
    color: var(--ink);
  }

  /* ── eje: línea + marcas, como eje de gráfico impreso ── */
  .axis {
    position: relative;
    height: 64px;
    margin-top: 0.5rem;
  }
  .axis-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 34px;
    border-top: 1.5px solid var(--ink-2);
  }
  .scrub {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
  }
  .axis:has(.scrub:focus-visible) {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
  }
  .decade {
    position: absolute;
    top: 44px;
    transform: translateX(-50%);
    font-size: 0.62rem;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .decade::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -9px;
    height: 7px;
    border-left: 1px solid var(--line-strong);
  }
  .mark {
    position: absolute;
    top: 26px;
    height: 18px;
    width: 0;
    z-index: 1;
  }
  .mark-you {
    border-left: 2px solid var(--accent);
  }
  .mark-play {
    border-left: 2px solid var(--ink);
  }
  .mark-compare {
    border-left: 2px dashed var(--accent);
  }
  .t-note {
    margin: 0.35rem 0 0;
    font-size: 0.7rem;
    color: var(--ink-3);
    max-width: 110ch;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
