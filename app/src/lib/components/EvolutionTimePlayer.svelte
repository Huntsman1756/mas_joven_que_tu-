<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Play, Pause } from '@lucide/svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import {
    AXIS_MIN,
    clampYear,
    milestones,
    playbackTickMs,
    type Milestone
  } from '$lib/domain/timeplayer';

  /**
   * Reproductor temporal (G18): UN único control — play/pausa + scrubber
   * + hitos de vida — en lugar de la batería de botones anterior. Modelo
   * de interacción tipo «imágenes históricas» (Google Earth) traducido a
   * la pregunta del producto: «¿cómo fue apareciendo, entre los edificios
   * que existen hoy, la Bizkaia que has conocido?».
   *
   * Semántica (invariantes G2/T1): el cabezal `app.playYear` revela el
   * stock actual por `Ano_Constr <= playYear`; nunca escribe `app.year`.
   * El eje permite explorar antes del nacimiento — el tramo previo se
   * dibuja atenuado, pero la historia arranca en `app.year`.
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

  // ── Contexto editorial del año mostrado ──────────────────────────────
  function contextFor(y: number, birth: number, snap: number): string {
    if (y >= snap) return t('time.today');
    if (y === birth) return t('time.born');
    const a = y - birth;
    if (a < 0) return t('time.before_birth');
    return a === 1 ? t('time.age_one') : t('time.age', { age: a });
  }
  let ctxText = $derived(app.year !== null ? contextFor(pos, app.year, snapshot) : '');
  let ariaValueText = $derived(t('time.valuetext', { play_year: pos, context: ctxText }));

  // ── Hitos personales sobre la línea ──────────────────────────────────
  let msList = $derived(app.year !== null ? milestones(app.year, snapshot) : []);
  function msLabel(m: Milestone): string {
    if (m.kind === 'birth') return t('time.born');
    if (m.kind === 'today') return t('time.ms_today');
    return t('time.ms_age', { age: m.age ?? 0 });
  }
  /** Labels permanentes: nacimiento y actualidad siempre; los de edad solo
   *  si mantienen ≥5 % del eje con sus vecinos (sin colisión). El resto se
   *  descubre al hover/focus — y su efecto (salto + contexto) al tocar. */
  const LABEL_MIN_GAP = 5;
  let msLabelShown = $derived(
    msList.map((m, i) => {
      if (m.kind !== 'age') return true;
      const prev = msList[i - 1];
      const next = msList[i + 1];
      return (
        (!prev || pct(m.year) - pct(prev.year) >= LABEL_MIN_GAP) &&
        (!next || pct(next.year) - pct(m.year) >= LABEL_MIN_GAP)
      );
    })
  );

  /** Hitbox de cada hito: como máximo hasta el punto medio con sus
   *  vecinos (en % del eje) — en eje estrecho los targets de ~44px
   *  solaparían y el último en DOM se comería el tap del vecino.
   *  Tope visual en CSS (max-width); sin vecinos, ancho completo. */
  let msHitboxPct = $derived(
    msList.map((m, i) => {
      const p = pct(m.year);
      const prev = msList[i - 1];
      const next = msList[i + 1];
      const gap = Math.min(
        prev ? p - pct(prev.year) : Infinity,
        next ? pct(next.year) - p : Infinity
      );
      return Number.isFinite(gap) ? Math.max(gap * 2 * 0.92, 2) : 100;
    })
  );

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
    // Play estando en actualidad = «empezar de nuevo»: vuelve al año de
    // nacimiento (sustituye al antiguo botón «Reiniciar desde {year}»).
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

  /** «Volver al presente»: apaga el cabezal (stock completo). */
  function reset() {
    app.playYear = null;
    app.playing = false;
    stopTimer();
    bumpUrl();
  }

  /** Salto discreto a un año concreto (hito, tecla, commit de scrub):
   *  pausa la reproducción y sincroniza la URL — es consulta, no animación. */
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
   * semántica del producto — Home = nacimiento (la experiencia empieza en
   * el año propio, no en 1900), End = actualidad, PageUp/Down = ±10 años.
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
        <!-- G10-08/spec §17: sin Play; el scrubber y los hitos siguen
             operativos y los pasos ±1 dan el avance discreto. -->
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

      <div class="now" aria-hidden="true">
        <strong class="now-year">{pos}</strong>
        <span class="now-ctx">{ctxText}</span>
      </div>

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
          aria-valuetext={ariaValueText}
        />
        <!-- track de tres tramos (§5): antes de nacer atenuado · vivido en
             acento · pendiente neutro. La forma (grosor + relleno + thumb)
             codifica el estado aun sin distinguir color (§25). -->
        <i class="seg seg-base"></i>
        <i class="seg seg-pre" style="width:{pct(app.year)}%"></i>
        {#if pos > app.year}
          <i class="seg seg-done" style="left:{pct(app.year)}%;width:{pct(pos) - pct(app.year)}%"
          ></i>
        {/if}
        {#each decades as d (d.y)}
          <span class="decade" class:minor={d.minor} style="left:{pct(d.y)}%">{d.y}</span>
        {/each}
        {#each msList as m, i (m.kind + m.year)}
          <button
            class="ms ms-{m.kind}"
            style="left:{pct(m.year)}%;width:{msHitboxPct[i]}%"
            data-action="milestone"
            data-year={m.year}
            aria-label={t('time.goto', { year: m.year, label: msLabel(m) })}
            onclick={() => seek(m.year)}
          >
            <i class="ms-dot"></i>
            <span
              class="ms-label"
              class:lbl-key={m.kind !== 'age'}
              class:lbl-off={!msLabelShown[i]}
            >
              {msLabel(m)}
            </span>
          </button>
        {/each}
        {#if app.compareYear !== null}
          <i class="mark mark-compare" style="left:{pct(app.compareYear)}%"></i>
        {/if}
        <i class="thumb" class:playing={app.playing} style="left:{pct(pos)}%"></i>
      </div>

      {#if app.playYear !== null}
        <button class="t-quiet" data-action="reset" onclick={reset}>{t('time.reset')}</button>
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
    padding: 0.55rem clamp(1rem, 4vw, 2.4rem) 0.55rem;
    /* los hitboxes de los hitos sobresalen del eje: se recortan aquí */
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

  /* ── año actual + contexto personal: el estado principal ── */
  .now {
    flex: 0 0 auto;
    min-width: 9.5ch;
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .now-year {
    font-size: 1.35rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--ink);
  }
  .now-ctx {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--accent-deep);
    white-space: nowrap;
  }

  /* ── eje: el scrubber es el protagonista ── */
  .axis {
    position: relative;
    flex: 1 1 auto;
    height: 66px;
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
    top: 30px;
    height: 3px;
    border-radius: 2px;
    pointer-events: none;
  }
  .seg-base {
    left: 0;
    right: 0;
    background: var(--line-strong);
  }
  /* tramo anterior al nacimiento: más fino, sin énfasis (§5/§25) */
  .seg-pre {
    left: 0;
    top: 30.75px;
    height: 1.5px;
    background: var(--ink-3);
    opacity: 0.55;
  }
  .seg-done {
    height: 5px;
    top: 29px;
    background: var(--accent);
  }

  .thumb {
    position: absolute;
    top: 31.5px;
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

  /* ── hitos personales: puntos permanentes + salto directo (§6/§15) ── */
  .ms {
    position: absolute;
    top: 13px;
    transform: translateX(-50%);
    /* el ancho real viene de msHitboxPct (punto medio con vecinos):
       en un eje de ~120px es físicamente imposible dar 44px a cada hito
       sin solapar (excepción a la regla global de targets — el scrubber
       sí mantiene el área táctil completa; los hitos son atajos) */
    min-width: 8px;
    max-width: 44px;
    height: 40px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    z-index: 4;
  }
  .ms-dot {
    position: absolute;
    left: 50%;
    top: 15.5px;
    width: 7px;
    height: 7px;
    margin-left: -3.5px;
    border-radius: 50%;
    background: var(--paper);
    border: 1.5px solid var(--ink-2);
  }
  .ms-birth .ms-dot,
  .ms-today .ms-dot {
    width: 9px;
    height: 9px;
    margin-left: -4.5px;
    border-color: var(--accent-deep);
    border-width: 2px;
  }
  .ms:hover .ms-dot,
  .ms:focus-visible .ms-dot {
    background: var(--accent);
    border-color: var(--ink);
    transform: scale(1.25);
  }
  .ms:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
    border-radius: 4px;
  }
  .ms-label {
    position: absolute;
    left: 50%;
    top: 26px;
    transform: translateX(-50%);
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--ink-2);
    white-space: nowrap;
    pointer-events: none;
  }
  .ms-label.lbl-key {
    color: var(--ink);
    font-weight: 700;
  }
  /* sin hueco para etiqueta permanente: aparece al hover/focus */
  .ms-label.lbl-off {
    opacity: 0;
  }
  .ms:hover .ms-label,
  .ms:focus-visible .ms-label {
    opacity: 1;
  }

  .decade {
    position: absolute;
    top: 48px;
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
    top: -10px;
    height: 6px;
    border-left: 1px solid var(--line-strong);
  }

  .mark-compare {
    position: absolute;
    top: 23px;
    height: 18px;
    width: 0;
    border-left: 2px dashed var(--accent);
    pointer-events: none;
    z-index: 1;
  }

  /* ── acción secundaria: conserva «Volver al presente» sin competir ── */
  .t-quiet {
    flex: 0 0 auto;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-3);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line-strong);
    padding: 0.15rem 0.1rem;
    margin-left: 0.2rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .t-quiet:hover {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
  .t-quiet:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
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

  .t-note {
    margin: 0.15rem 0 0;
    font-size: 0.7rem;
    color: var(--ink-3);
    max-width: 110ch;
  }

  /* G18 móvil: una fila de estado + eje a todo lo ancho; hitos
     secundarios sin etiqueta permanente (§18). */
  @media (max-width: 700px) {
    .timeband {
      padding: 0.4rem 1rem 0.5rem;
    }
    .player {
      gap: 0.6rem;
    }
    .now {
      min-width: 7ch;
    }
    .now-year {
      font-size: 1.15rem;
    }
    .now-ctx {
      font-size: 0.68rem;
      white-space: normal;
    }
    .axis {
      height: 58px;
    }
    .seg {
      top: 27px;
    }
    .seg-done {
      top: 26px;
    }
    .thumb {
      top: 28.5px;
    }
    .ms {
      top: 10px;
    }
    .ms-dot {
      top: 15.5px;
    }
    .ms-label {
      top: 25px;
      font-size: 0.58rem;
    }
    /* en táctil no hay hover: solo etiquetas clave (naciste/hoy) */
    .ms-label:not(.lbl-key) {
      opacity: 0;
    }
    .ms:focus-visible .ms-label,
    .ms:active .ms-label {
      opacity: 1;
    }
    .decade {
      top: 42px;
      font-size: 0.58rem;
    }
    .decade.minor {
      display: none;
    }
    .t-quiet {
      font-size: 0.68rem;
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
