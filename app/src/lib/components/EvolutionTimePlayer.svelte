<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Play, Pause, Info } from '@lucide/svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { AXIS_MIN, clampYear, playbackTickMs } from '$lib/domain/timeplayer';

  /**
   * Reproductor temporal (G18-R): UN único control cartográfico —
   * play/pausa + año + scrubber con ticks — en lugar de la batería de
   * botones y de la capa biográfica anterior. Modelo de interacción tipo
   * «imágenes históricas» (Google Earth): el tiempo se manipula como un
   * instrumento, no como una infografía sobre la edad del usuario.
   * La personalización decide qué resultado se enseña; el control solo
   * marca el año elegido con un hito sutil sobre el eje.
   *
   * Semántica (invariantes G2/T1): el cabezal `app.playYear` revela el
   * stock actual por `Ano_Constr <= playYear`; nunca escribe `app.year`.
   * La URL se sincroniza solo en eventos discretos (`playUrlSeq`): nunca
   * por tick ni por frame de arrastre (G2 §8 / spec §21–22).
   * La explicación metodológica vive en el disclosure «Qué muestra esta
   * vista», cerrado por defecto — el mapa empieza pronto.
   */

  let snapshot = $derived(app.catalog?.snapshot_year ?? 2026);
  let reduceMotion = $state(false);

  function pct(y: number): number {
    return ((y - AXIS_MIN) / (snapshot - AXIS_MIN)) * 100;
  }

  /** Posición visible del cabezal: sin cabezal activo, anclado al año personal. */
  let pos = $derived(app.playYear ?? app.year ?? AXIS_MIN);

  /** Ticks de década: paso 20 años; `.minor` (los intermedios) se ocultan
   *  en pantalla estrecha — la posición siempre es proporcional al año. */
  let decades = $derived.by(() => {
    const out: { y: number; minor: boolean }[] = [];
    for (let d = AXIS_MIN; d <= snapshot; d += 20) {
      out.push({ y: d, minor: (d - AXIS_MIN) % 40 !== 0 });
    }
    return out;
  });

  // ── Reproducción ─────────────────────────────────────────────────────
  let timer: ReturnType<typeof setInterval> | null = null;
  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  /** La URL se sincroniza solo en eventos discretos, nunca por frame (G2 §8). */
  const bumpUrl = () => app.playUrlSeq++;

  function tick() {
    if (!app.playing || app.playYear === null) return stopTimer();
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
    // G10-08: con reduced-motion el botón no se renderiza; si se invoca
    // igualmente (foco retenido, re-entrada) degrada a un paso manual.
    if (reduceMotion) return step(1);
    // Play estando en actualidad = «empezar de nuevo»: vuelve al año
    // elegido (sustituye al antiguo botón «Reiniciar desde {year}»).
    if (app.playYear === null || app.playYear >= snapshot) app.playYear = app.year;
    app.playYear = clampYear(app.playYear, snapshot);
    app.playing = true;
    stopTimer();
    timer = setInterval(tick, playbackTickMs(app.year, snapshot));
    bumpUrl();
  }

  function pause() {
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  const toggle = () => (app.playing ? pause() : play());

  $effect(() => {
    if (!app.playing) stopTimer();
  });

  function finish() {
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  /** Salto discreto a un año concreto (tecla, commit de scrub): pausa la
   *  reproducción y sincroniza la URL — es consulta, no animación. */
  function seek(y: number) {
    if (app.year === null) return;
    app.playing = false;
    stopTimer();
    app.playYear = clampYear(y, snapshot);
    bumpUrl();
  }

  /** Paso manual: equivalente del Play bajo reduced-motion (T6). */
  function step(d: number) {
    seek((app.playYear ?? app.year ?? AXIS_MIN) + d);
  }

  function onScrubInput(e: Event) {
    if (app.year === null) return;
    // Arrastrar pausa la reproducción y actualiza el mapa al vuelo; la URL
    // se sincroniza al soltar (onScrubCommit), nunca por movimiento.
    app.playing = false;
    stopTimer();
    app.playYear = clampYear(Number((e.target as HTMLInputElement).value), snapshot);
  }

  function onScrubCommit() {
    bumpUrl();
  }

  /**
   * Teclado del slider: el range nativo ya da flechas (±1); aquí se fija la
   * semántica del producto — Home = año elegido (el marcador personal del
   * eje), End = actualidad, PageUp/Down = ±10 años.
   */
  function onScrubKey(e: KeyboardEvent) {
    if (app.year === null) return;
    if (e.key === 'Home') {
      e.preventDefault();
      seek(app.year);
    } else if (e.key === 'End') {
      e.preventDefault();
      seek(snapshot);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      seek(pos + 10);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      seek(pos - 10);
    }
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
    const on = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      // G15c: activar movimiento reducido EN SESIÓN detiene el
      // temporizador y deja el estado pausado (el año se conserva, los
      // pasos manuales siguen disponibles). Al desactivarlo no se
      // reanuda automáticamente.
      if (e.matches) {
        app.playing = false;
        stopTimer();
        bumpUrl();
      }
    };
    mq.addEventListener('change', on);
    // G15b: remontaje con reproducción en curso — el estado global
    // `app.playing` puede seguir true sin temporizador local. Se reanuda
    // desde el playYear actual (sin reiniciar ni saltar años); con
    // reduced-motion o sin cabezal se deja pausado explícitamente. Nunca
    // playing=true sin avance.
    if (app.playing) {
      if (reduceMotion || app.playYear === null || app.playYear >= snapshot) {
        app.playing = false;
      } else {
        stopTimer();
        timer = setInterval(tick, playbackTickMs(app.year ?? snapshot, snapshot));
      }
    }
    return () => mq.removeEventListener('change', on);
  });

  onDestroy(stopTimer);
</script>

{#if app.year !== null}
  <section class="timeband" aria-label={t('time.axis_label')}>
    <div class="player">
      {#if reduceMotion}
        <!-- G10-08/spec §17: sin Play; el scrubber sigue operativo y los
             pasos ±1 dan el avance discreto. -->
        <div class="rm">
          <span class="rm-steps">
            <button class="t-btn" data-action="step-back" onclick={() => step(-1)}>
              {t('time.step_back')}
            </button>
            <button class="t-btn" data-action="step-fwd" onclick={() => step(1)}>
              {t('time.step_fwd')}
            </button>
          </span>
          <span class="rm-note">{t('time.reduced_note')}</span>
        </div>
      {:else}
        <button
          class="playbtn"
          data-action="play"
          aria-label={app.playing ? t('time.pause_aria') : t('time.play_aria')}
          onclick={toggle}
        >
          {#if app.playing}
            <Pause size={17} strokeWidth={2.2} aria-hidden="true" />
          {:else}
            <Play size={17} strokeWidth={2.2} aria-hidden="true" />
          {/if}
        </button>
      {/if}

      <strong class="now" aria-hidden="true">{pos}</strong>

      <div class="axis">
        <input
          class="scrub"
          data-action="scrub"
          type="range"
          min={AXIS_MIN}
          max={snapshot}
          step="1"
          value={pos}
          oninput={onScrubInput}
          onchange={onScrubCommit}
          onkeydown={onScrubKey}
          aria-label={t('time.scrub_label')}
          aria-valuetext={String(pos)}
        />
        <!-- track: relleno en acento hasta el cabezal, base neutra; la
             forma (grosor + relleno + thumb) codifica el estado aun sin
             distinguir color. -->
        <i class="seg seg-base"></i>
        <i class="seg seg-done" style="width:{pct(pos)}%"></i>
        {#each decades as d (d.y)}
          <span class="decade" class:minor={d.minor} style="left:{pct(d.y)}%">{d.y}</span>
        {/each}
        {#if app.year >= AXIS_MIN && app.year <= snapshot}
          <!-- marcador sutil del año elegido: la personalización fija el
               resultado, no la interfaz (única marca personal del eje) -->
          <i
            class="ymark"
            style="left:{pct(app.year)}%"
            data-year={app.year}
            title={String(app.year)}
          ></i>
        {/if}
        {#if app.compareYear !== null}
          <i class="mark mark-compare" style="left:{pct(app.compareYear)}%"></i>
        {/if}
        <i class="thumb" class:playing={app.playing} style="left:{pct(pos)}%"></i>
      </div>

      <details class="t-info">
        <summary data-action="info" title={t('time.explain')}>
          <Info size={15} strokeWidth={2} aria-hidden="true" /><span class="t-info-txt"
            >{t('time.explain')}</span
          >
        </summary>
        <p class="t-info-body">{t('time.caption')}</p>
      </details>
    </div>

    <p class="sr-only" role="status">{announce}</p>
  </section>
{/if}

<style>
  .timeband {
    border-bottom: 1px solid var(--line);
    background: var(--paper-2);
    padding: 0.45rem clamp(1rem, 4vw, 2.4rem);
    overflow-x: clip;
  }
  .player {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  /* ── play/pausa: parte del control, no un botón textual suelto ── */
  .playbtn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
  }
  .playbtn:hover {
    background: var(--ink-2);
  }
  .playbtn:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  /* ── año actual: el estado principal del control ── */
  .now {
    flex: 0 0 auto;
    min-width: 4.5ch;
    font-size: 1.35rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--ink);
  }

  /* ── eje: el scrubber es el protagonista ── */
  .axis {
    position: relative;
    flex: 1 1 auto;
    height: 52px;
    min-width: 0;
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

  .seg {
    position: absolute;
    top: 22px;
    height: 3px;
    border-radius: 2px;
    pointer-events: none;
  }
  .seg-base {
    left: 0;
    right: 0;
    background: var(--line-strong);
  }
  .seg-done {
    left: 0;
    height: 5px;
    top: 21px;
    background: var(--accent);
  }

  .thumb {
    position: absolute;
    top: 23.5px;
    width: 15px;
    height: 15px;
    margin-left: -7.5px;
    margin-top: -7.5px;
    border-radius: 50%;
    background: var(--paper);
    border: 2.5px solid var(--ink);
    box-shadow: 0 1px 3px rgba(24, 38, 49, 0.35);
    pointer-events: none;
    z-index: 2;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .thumb.playing {
    border-color: var(--accent-deep);
  }
  .axis:hover .thumb,
  .axis:has(.scrub:focus-visible) .thumb,
  .axis:has(.scrub:active) .thumb {
    transform: scale(1.3);
  }
  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
  }

  /* marcador del año elegido: tick corto en acento sobre la línea */
  .ymark {
    position: absolute;
    top: 15px;
    height: 8px;
    width: 0;
    border-left: 2px solid var(--accent-deep);
    pointer-events: none;
    z-index: 1;
  }

  .decade {
    position: absolute;
    top: 34px;
    transform: translateX(-50%);
    font-size: 0.62rem;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .decade::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -9px;
    height: 6px;
    border-left: 1px solid var(--line-strong);
  }
  /* etiquetas de borde: no se recortan fuera del eje */
  .decade:first-of-type {
    transform: translateX(0);
  }
  .decade:last-of-type {
    transform: translateX(-100%);
  }

  .mark-compare {
    position: absolute;
    top: 15px;
    height: 18px;
    width: 0;
    border-left: 2px dashed var(--accent);
    pointer-events: none;
    z-index: 1;
  }

  /* ── disclosure metodológico: la explicación existe pero no ocupa ── */
  .t-info {
    position: relative;
    flex: 0 0 auto;
  }
  .t-info summary {
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-3);
    cursor: pointer;
    min-height: 44px;
    padding: 0 0.35rem;
    white-space: nowrap;
  }
  .t-info summary::-webkit-details-marker {
    display: none;
  }
  .t-info summary:hover {
    color: var(--ink);
  }
  .t-info summary:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .t-info-body {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 6;
    width: min(52ch, 78vw);
    margin: 0;
    padding: 0.6rem 0.8rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(24, 38, 49, 0.14);
    font-size: 0.74rem;
    line-height: 1.45;
    color: var(--ink-2);
  }

  /* ── reduced-motion: pasos manuales + nota accesible (§17) ── */
  .rm {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .rm-steps {
    display: flex;
    gap: 0.4rem;
  }
  .rm-note {
    font-size: 0.68rem;
    color: var(--ink-3);
    max-width: 30ch;
    line-height: 1.3;
  }
  .t-btn {
    font: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--ink-2);
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    min-height: 40px;
  }
  .t-btn:hover {
    background: var(--paper);
  }
  .t-btn:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  @media (max-width: 700px) {
    .timeband {
      padding: 0.35rem 1rem 0.45rem;
    }
    .player {
      gap: 0.6rem;
    }
    .now {
      font-size: 1.15rem;
    }
    .axis {
      height: 46px;
    }
    .seg {
      top: 20px;
    }
    .seg-done {
      top: 19px;
    }
    .thumb {
      top: 21.5px;
    }
    .ymark {
      top: 13px;
      height: 7px;
    }
    .mark-compare {
      top: 13px;
      height: 16px;
    }
    .decade {
      top: 30px;
      font-size: 0.58rem;
    }
    .decade.minor {
      display: none;
    }
    .t-info-txt {
      display: none;
    }
    .rm-note {
      font-size: 0.64rem;
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
