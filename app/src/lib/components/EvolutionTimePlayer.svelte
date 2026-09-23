<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { AXIS_MIN, clampYear, playbackTickMs } from '$lib/domain/timeplayer';
  import TemporalChrome from './TemporalChrome.svelte';

  /**
   * Evolución (G19): el reproductor temporal como chrome del lienzo —
   * la barra flota sobre el mapa (TemporalChrome, modo continuo), no es
   * una sección de página encima de él. Modelo «imágenes históricas»:
   * play + año + scrubber con ticks; la explicación vive tras ⓘ.
   * La personalización decide qué resultado se enseña; el control solo
   * marca el año elegido con un hito sutil sobre el eje.
   *
   * Semántica (invariantes G2/T1): el cabezal `app.playYear` revela el
   * stock actual por `Ano_Constr <= playYear`; nunca escribe `app.year`.
   * La URL se sincroniza solo en eventos discretos (`playUrlSeq`): nunca
   * por tick ni por frame de arrastre (G2 §8 / spec §21–22).
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
  <section class="timeband tcpanel tcp-tl" aria-label={t('time.axis_label')}>
    <TemporalChrome
      playing={app.playing}
      canPlay={!reduceMotion}
      playLabel={t('time.play_aria')}
      pauseLabel={t('time.pause_aria')}
      year={pos}
      min={AXIS_MIN}
      max={snapshot}
      value={pos}
      scrubAria={t('time.scrub_label')}
      scrubValueText={String(pos)}
      onscrubinput={onScrubInput}
      onscrubcommit={onScrubCommit}
      onscrubkey={onScrubKey}
      ontoggle={toggle}
      rmSteps={reduceMotion
        ? { back: t('time.step_back'), fwd: t('time.step_fwd'), onstep: step }
        : undefined}
      infoLabel={t('time.explain')}
      status={announce}
    >
      {#snippet marks()}
        <!-- relleno en acento hasta el cabezal; la forma (grosor +
             relleno + thumb) codifica el estado aun sin distinguir color -->
        <i class="seg-done" style="width:{pct(pos)}%"></i>
        {#each decades as d (d.y)}
          <span class="decade" class:minor={d.minor} style="left:{pct(d.y)}%">{d.y}</span>
        {/each}
        {#if app.year !== null && app.year >= AXIS_MIN && app.year <= snapshot}
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
          <i class="mark-compare" style="left:{pct(app.compareYear)}%"></i>
        {/if}
        <i class="thumb" class:playing={app.playing} style="left:{pct(pos)}%"></i>
      {/snippet}
      {#snippet info()}
        {#if reduceMotion}
          <p>{t('time.reduced_note')}</p>
        {/if}
        <p>{t('time.caption')}</p>
      {/snippet}
    </TemporalChrome>
    {#if reduceMotion}
      <span class="sr-only">{t('time.reduced_note')}</span>
    {/if}
  </section>
{/if}

<style>
  /* ── marcas del eje continuo sobre la superficie oscura ──
     (la línea base la dibuja .tc-rail::before del chrome) */
  .seg-done {
    position: absolute;
    left: 0;
    top: 20px;
    height: 5px;
    border-radius: 3px;
    background: var(--accent);
    pointer-events: none;
  }

  .thumb {
    position: absolute;
    top: 15.5px;
    width: 15px;
    height: 15px;
    margin-left: -7.5px;
    border-radius: 50%;
    background: var(--paper);
    border: 2.5px solid var(--accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 2;
    transition: transform 0.12s ease;
  }
  .thumb.playing {
    border-color: var(--paper);
  }
  .timeband:hover .thumb {
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
    top: 13px;
    height: 8px;
    width: 0;
    border-left: 2px solid var(--accent);
    pointer-events: none;
    z-index: 1;
  }

  .mark-compare {
    position: absolute;
    top: 9px;
    height: 18px;
    width: 0;
    border-left: 2px dashed rgba(247, 248, 250, 0.7);
    pointer-events: none;
    z-index: 1;
  }

  .decade {
    position: absolute;
    top: 34px;
    transform: translateX(-50%);
    font-size: 0.62rem;
    color: rgba(247, 248, 250, 0.55);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .decade::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -9px;
    height: 6px;
    border-left: 1px solid rgba(247, 248, 250, 0.4);
  }
  /* etiquetas de borde: no se recortan fuera del eje */
  .decade:first-of-type {
    transform: translateX(0);
  }
  .decade:last-of-type {
    transform: translateX(-100%);
  }

  @media (max-width: 700px) {
    .decade {
      font-size: 0.58rem;
    }
    .decade.minor {
      display: none;
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
