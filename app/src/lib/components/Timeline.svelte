<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import type { Campaign } from '$lib/domain/ortho';
  import { activateOrtho } from '$lib/domain/ortho-probe.svelte';

  /**
   * Eje temporal G2 (gate §TIME/§FOTO). Dos posiciones independientes:
   *   TU AÑO (fijo, `app.year`) · REPRODUCCIÓN (móvil, `app.playYear`).
   * El Play revela el stock actual por `Ano_Constr <= playYear`; nunca toca
   * `app.year` (T1). Las marcas de campaña son acciones explícitas: su clic
   * invoca el contrato AVAILABLE/NOT_COVERED/SERVICE_ERROR existente y no
   * emite ninguna petición durante el Play (F3).
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

  // ── Marcas de campaña (F1/F2): disponibles cuando el eje las alcanza ──
  function campaignReached(c: Campaign): boolean {
    return (app.playYear ?? app.year ?? -Infinity) >= c.year;
  }

  function activateCampaign(c: Campaign) {
    // Un solo camino a FOTO (G4): activación explícita →
    // sonda compartida (la marca solo significa «existe la campaña», SEM).
    activateOrtho(c);
  }

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
      {#each app.allCampaigns as c, i (c.year)}
        {#if campaignReached(c)}
          <button
            class="camp {i % 2 ? 'low' : 'high'}"
            class:active={app.orthoVisible && app.orthoCampaign?.year === c.year}
            style="left:{pct(c.year)}%"
            onclick={() => activateCampaign(c)}
            aria-pressed={app.orthoVisible && app.orthoCampaign?.year === c.year}
            aria-label={t('time.campaign_action', { year: c.year })}
            ><i class="tick" aria-hidden="true"></i><span class="camp-year">{c.year}</span></button
          >
        {:else}
          <span
            class="camp off {i % 2 ? 'low' : 'high'}"
            style="left:{pct(c.year)}%"
            aria-hidden="true"><i class="tick"></i><span class="camp-year">{c.year}</span></span
          >
        {/if}
      {/each}
      <i class="mark mark-you" style="left:{pct(app.year)}%"></i>
      {#if app.compareYear !== null}
        <i class="mark mark-compare" style="left:{pct(app.compareYear)}%"></i>
      {/if}
      {#if app.playYear !== null}
        <i class="mark mark-play" style="left:{pct(app.playYear)}%"></i>
      {/if}
    </div>

    <p class="t-note">{t('time.caption')} {t('time.campaigns_note')}</p>
    <p class="sr-only" role="status">{announce}</p>
  </section>
{/if}

<style>
  .timeband {
    border-bottom: 1px solid #ddd9d0;
    background: #f7f5f1;
    padding: 0.55rem clamp(0.9rem, 3vw, 2rem) 0.7rem;
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
    border: 1px solid #3a3835;
    border-radius: 4px;
    background: transparent;
    color: #1c1a17;
    cursor: pointer;
    min-height: 44px;
  }
  .t-btn.primary {
    background: #1c1a17;
    color: #f2f0ec;
  }
  .t-btn:hover {
    background: #e9e6de;
  }
  .t-btn.primary:hover {
    background: #33312c;
  }
  .t-btn:focus-visible {
    outline: 2px solid #1c1a17;
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
    color: #8e2f4c;
  }
  .t-years .ph {
    color: #1c1a17;
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
    border-top: 1.5px solid #3a3835;
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
    outline: 2px solid #1c1a17;
    outline-offset: 4px;
  }
  .decade {
    position: absolute;
    top: 44px;
    transform: translateX(-50%);
    font-size: 0.62rem;
    color: #6b6b63;
    font-variant-numeric: tabular-nums;
  }
  .decade::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -9px;
    height: 7px;
    border-left: 1px solid #b9b5aa;
  }
  /* Marca de campaña: hitbox transparente 44×44 (A3) separado del tick
     visual de 3 px — en pantallas estrechas el eje no se tapa (G2-B §3). */
  .camp {
    position: absolute;
    transform: translateX(-50%);
    width: 44px;
    height: 44px;
    top: 0;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    z-index: 4; /* sobre el scrub invisible: la marca sigue siendo acción propia */
  }
  .camp .tick {
    position: absolute;
    left: 50%;
    top: 27px;
    width: 3px;
    height: 14px;
    margin-left: -1.5px;
    background: #3a3835;
  }
  .camp-year {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.62rem;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #3a3835;
    white-space: nowrap;
  }
  .camp.high .camp-year {
    top: 0;
  }
  .camp.low .camp-year {
    top: 14px;
  }
  .camp.active .camp-year {
    color: #8e2f4c;
  }
  .camp.active .tick {
    background: #c63b4f;
  }
  .camp.off {
    cursor: default;
    pointer-events: none;
  }
  .camp.off .tick {
    background: #c9c5bb;
  }
  .camp.off .camp-year {
    color: #6b6b63; /* el tick pálido marca «no alcanzada»; el texto mantiene AA */
  }
  .camp:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 1px;
  }
  /* ≤640 px: el año aparece al interactuar (hover/focus/activa); el tick
     exacto sigue siendo visible y el nombre accesible lo anuncia siempre. */
  @media (max-width: 640px) {
    .camp-year {
      display: none;
    }
    .camp:hover .camp-year,
    .camp:focus-visible .camp-year,
    .camp.active .camp-year {
      display: block;
    }
  }
  .mark {
    position: absolute;
    top: 26px;
    height: 18px;
    width: 0;
    z-index: 1;
  }
  .mark-you {
    border-left: 2px solid #8e2f4c;
  }
  .mark-play {
    border-left: 2px solid #1c1a17;
  }
  .mark-compare {
    border-left: 2px dashed #8e2f4c;
  }
  .t-note {
    margin: 0.35rem 0 0;
    font-size: 0.7rem;
    color: #6b6b63;
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
