<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { Play, Pause, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { flightSuffix, type Campaign } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';

  /**
   * Vista FOTO (G2-B/G5-E, G18-R): la misma escena del mapa con una campaña
   * de ortofoto. La procedencia (editor, año nominal, vuelo real si se
   * conoce, licencia) es visible: una línea de metadata + disclosure
   * «Fuente y detalles», nunca párrafos permanentes ni cards.
   * Navegar (rail, prev/next, play) es una activación explícita — cada
   * paso sondea exactamente la campaña pedida, sin sustituciones
   * silenciosas. Entrar en la vista no pide imagen alguna.
   *
   * Comparación: en pantalla ancha un segundo lienzo sincronizado muestra
   * la campaña `orthoCompare` (CompareMap); en pantalla estrecha el toggle
   * segmentado elige qué campaña ocupa el lienzo único (`app.photoView`).
   * El contorno de los edificios actuales sobre la imagen es opt-in
   * (`app.overlayBuildings`) — nunca pintado por defecto.
   */

  // Campaña en contexto: la activada si existe; si no, la más cercana al año.
  let cur = $derived<Campaign | null>(app.orthoCampaign ?? app.nearest);

  let idx = $derived(cur ? app.allCampaigns.findIndex((c) => c.year === cur.year) : -1);

  // ── Eje de campañas: posición REAL por año a todo lo ancho — cada
  // campaña es una marca en el eje (1945→2025), snap exclusivamente a
  // campañas existentes. Campañas BFA y épocas geoEuskadi llevan etiqueta
  // permanente si no colisiona; el resto revela su año al scrub.
  // Extremos del eje: posición % = (año - y0) / (y1 - y0)
  let y0 = $derived(app.allCampaigns[0]?.year ?? 1945);
  let y1 = $derived(app.allCampaigns[app.allCampaigns.length - 1]?.year ?? 2025);
  function railPct(year: number): string {
    return `${(((year - y0) / (y1 - y0)) * 100).toFixed(2)}%`;
  }
  // Etiqueta permanente solo si queda ≥ ~40px con la anterior etiquetada
  // (densidad medida en px reales del rail, no en años fijos).
  let railEl = $state<HTMLElement | null>(null);
  let railW = $state(0);
  onMount(() => {
    if (!railEl) return;
    const ro = new ResizeObserver((es) => {
      railW = es[0].contentRect.width;
    });
    ro.observe(railEl);
    return () => ro.disconnect();
  });
  let labeled = $derived.by(() => {
    const gapY = Math.max(4, Math.ceil(((y1 - y0) * 40) / Math.max(railW, 1)));
    const s = new SvelteSet<number>();
    let last = -Infinity;
    for (const c of app.allCampaigns) {
      const major = c.source === 'bizkaia' || !!c.layer;
      if (major && c.year - last >= gapY) {
        s.add(c.year);
        last = c.year;
      }
    }
    return s;
  });

  function nearestCampaign(y: number): Campaign | null {
    let best: Campaign | null = null;
    for (const c of app.allCampaigns) {
      if (!best || Math.abs(c.year - y) < Math.abs(best.year - y)) best = c;
    }
    return best;
  }

  // Scrub sobre el eje: arrastrar recorre las campañas (el año grande
  // muestra la más cercana al vuelo); al soltar se ACTIVA con la sonda
  // honesta — nunca una etiqueta nueva sobre la imagen de otra campaña.
  // Tocar la campaña ya destacada sin imagen activada la carga (el rail
  // es el activador: no hay CTA separado).
  let scrubbing = $state<number | null>(null);
  let scrubNear = $derived(scrubbing !== null ? nearestCampaign(scrubbing) : null);
  let shownYear = $derived(scrubNear?.year ?? cur?.year);
  function onScrubInput(e: Event) {
    scrubbing = Number((e.target as HTMLInputElement).value);
    playing = false; // elección manual: el usuario toma el control
    ended = false;
  }
  function onScrubCommit(e: Event) {
    const c = nearestCampaign(Number((e.target as HTMLInputElement).value));
    scrubbing = null;
    if (c && (c.year !== cur?.year || !app.orthoVisible)) activateOrtho(c);
  }
  // Clic sin desplazamiento sobre la marca destacada: el nativo no emite
  // ni 'input' ni 'change' cuando el valor no varía — pero «tocar la
  // campaña» debe activarla igualmente (el eje es el activador).
  function onScrubClick(e: MouseEvent) {
    const c = nearestCampaign(Number((e.target as HTMLInputElement).value));
    if (c && (c.year !== cur?.year || !app.orthoVisible)) activateOrtho(c);
  }
  // En teclado el paso es por CAMPAÑA, no por año nativo: con campañas
  // dispersas, flechas de ±1 año apenas recorrerían el eje.
  function onScrubKey(e: KeyboardEvent) {
    let c: Campaign | null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
      c = idx >= 0 ? (app.allCampaigns[idx + 1] ?? null) : null;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
      c = idx > 0 ? app.allCampaigns[idx - 1] : null;
    else if (e.key === 'Home') c = app.allCampaigns[0] ?? null;
    else if (e.key === 'End') c = app.allCampaigns[app.allCampaigns.length - 1] ?? null;
    else if (e.key === 'Enter' || e.key === ' ') {
      // la campaña destacada se activa por teclado igual que al tocarla
      e.preventDefault();
      playing = false;
      ended = false;
      if (cur && (cur.year !== app.orthoCampaign?.year || !app.orthoVisible)) activateOrtho(cur);
      return;
    } else return;
    e.preventDefault();
    playing = false;
    ended = false;
    if (c) activateOrtho(c);
  }

  let prev = $derived(idx > 0 ? app.allCampaigns[idx - 1] : null);
  let next = $derived(
    idx >= 0 && idx < app.allCampaigns.length - 1 ? app.allCampaigns[idx + 1] : null
  );

  function publisher(c: Campaign): string {
    return c.source === 'bizkaia' ? t('ortho.publisher.bizkaia') : t('ortho.publisher.geoeuskadi');
  }

  // Deep link (?ortho=YYYY&view=photo): la campaña traída por URL se sondea
  // una vez al montar (sin ella quedaría UNKNOWN).
  $effect(() => {
    const c = app.orthoCampaign;
    if (app.orthoVisible && c && app.orthoState === 'UNKNOWN' && !probeStatus.probing) {
      void probeOrtho(c);
    }
  });

  function toggleCompare() {
    if (app.orthoCompare) {
      app.orthoCompare = null;
      app.photoView = 'a';
    } else if (app.latest && cur && app.latest.year !== cur.year) {
      app.orthoCompare = app.latest;
    }
  }

  // ── Reproducción por campañas reales (G13): avanza una campaña por
  // paso manteniendo encuadre; cada paso es la MISMA activación sondeada
  // del rail — nunca salta en silencio. Si la sonda declara falta de
  // cobertura o error, la reproducción se detiene y el mensaje queda
  // visible. Con prefers-reduced-motion no hay reproducción automática
  // (mismo patrón que el reproductor de Evolución): el rail y ←/→ ya dan
  // el paso manual.
  // `playing` es local (esta reproducción es del panel, no la global del
  // Timeline): al remontar queda pausado de forma explícita — el botón
  // muestra «Reproducir» y no hay intervalo huérfano. La velocidad sí
  // sobrevive: es preferencia de usuario en `app.photoSpeed`.
  // `ended`: la serie se acabó — la reproducción se DETIENE en la última
  // campaña (sin bucle automático) y «Reproducir» vuelve a la primera.
  let playing = $state(false);
  let ended = $state(false);
  $effect(() => {
    void app.playbackPauseSeq;
    playing = false;
  });
  const SPEEDS = { slow: 3200, normal: 1800, fast: 900 } as const;
  let reduceMotion = $state(false);

  onMount(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = mq.matches;
    const on = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      if (e.matches) playing = false;
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });
  onDestroy(() => (playing = false));

  function togglePlay() {
    if (playing) {
      playing = false;
      return;
    }
    ended = false;
    // Sin campaña siguiente, «Reproducir» reinicia la serie desde la
    // primera — acción explícita del usuario, no un bucle automático.
    const start = !next ? (app.allCampaigns[0] ?? null) : cur;
    if (!start) return;
    if (!app.orthoVisible || start.year !== cur?.year) activateOrtho(start);
    playing = true;
  }

  $effect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      // mientras la sonda está en vuelo no se avanza — la campaña en
      // pantalla es siempre la última verificada, con su año real.
      if (probeStatus.probing || app.orthoState === 'UNKNOWN') return;
      if (app.orthoState !== 'AVAILABLE') {
        playing = false; // NOT_COVERED / error: el aviso queda en pantalla
        return;
      }
      if (next) activateOrtho(next);
      else {
        playing = false;
        ended = true; // fin de la serie: parada clara, sin bucle
      }
    }, SPEEDS[app.photoSpeed]);
    return () => clearInterval(id);
  });
</script>

{#if cur && app.year !== null}
  <section class="photo" aria-label={t('photo.label')} tabindex="-1">
    <div class="p-bar">
      <div class="p-nav" aria-live="polite">
        {#if !reduceMotion}
          <button
            class="play"
            data-action="play"
            aria-pressed={playing}
            aria-label={playing ? t('photo.pause') : t('photo.play')}
            onclick={togglePlay}
          >
            {#if playing}
              <Pause size={16} strokeWidth={2.2} aria-hidden="true" />
            {:else}
              <Play size={16} strokeWidth={2.2} aria-hidden="true" />
            {/if}
          </button>
        {/if}
        <button
          class="nav"
          data-action="prev"
          data-year={prev?.year}
          disabled={!prev}
          onclick={() => {
            playing = false; // elección manual: el usuario toma el control
            ended = false;
            if (prev) activateOrtho(prev);
          }}
          aria-label={prev ? t('photo.prev', { year: prev.year }) : t('photo.prev_none')}
        >
          <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <strong class="p-year">{shownYear}</strong>
        <button
          class="nav"
          data-action="next"
          data-year={next?.year}
          disabled={!next}
          onclick={() => {
            playing = false;
            ended = false;
            if (next) activateOrtho(next);
          }}
          aria-label={next ? t('photo.next', { year: next.year }) : t('photo.next_none')}
        >
          <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        {#if !reduceMotion}
          <label class="speed-lbl"
            >{t('photo.speed')}
            <select data-action="speed" bind:value={app.photoSpeed}>
              <option value="slow">{t('photo.speed.slow')}</option>
              <option value="normal">{t('photo.speed.normal')}</option>
              <option value="fast">{t('photo.speed.fast')}</option>
            </select>
          </label>
        {/if}
      </div>
      <p class="meta">
        {cur.year} · {publisher(cur)}{cur.flightRange
          ? flightSuffix(cur, t, locale.lang)
          : ` · ${t('photo.nominal_mark')}`}
      </p>
      <details class="p-info">
        <summary data-action="info">{t('photo.details')}</summary>
        <div class="p-info-body">
          <p>
            {t('ortho.available', {
              publisher: publisher(cur),
              year: cur.year,
              flight_range: flightSuffix(cur, t, locale.lang)
            })}
          </p>
          <p>{t('photo.rail_note')}</p>
          {#if app.orthoVisible}
            <p>{t('photo.nodata')}</p>
          {/if}
        </div>
      </details>
    </div>

    <div class="railwrap">
      <div class="rail" bind:this={railEl}>
        <!-- Un solo control temporal: arrastrar con puntero/tacto recorre
             el eje; las flechas del teclado saltan de campaña en campaña.
             Las marcas bajo el input son solo visuales — el estado
             accesible lo lleva el slider. -->
        <input
          class="pscrub"
          data-action="scrub"
          type="range"
          min={y0}
          max={y1}
          step="1"
          value={shownYear}
          oninput={onScrubInput}
          onchange={onScrubCommit}
          onclick={onScrubClick}
          onkeydown={onScrubKey}
          aria-label={t('photo.scrub_label')}
          aria-valuetext={t('photo.scrub_valuetext', { year: shownYear ?? '' })}
        />
        {#each app.allCampaigns as c, i (c.year)}
          <span
            class="epoch"
            class:major={labeled.has(c.year)}
            class:cur={c.year === cur.year}
            class:near={scrubNear !== null && scrubNear.year === c.year}
            class:birth={app.year !== null && c === app.nearest}
            class:first={i === 0}
            class:last={i === app.allCampaigns.length - 1}
            data-year={c.year}
            style:left={railPct(c.year)}
            aria-hidden="true"><span class="yr">{c.year}</span></span
          >
        {/each}
      </div>
    </div>

    {#if !app.orthoVisible}
      <p class="hint">{t('photo.hint')}</p>
    {:else}
      <div class="state">
        {#if probeStatus.probing || app.orthoState === 'UNKNOWN'}
          <p role="status">{t('ortho.loading', { year: cur.year })}</p>
        {:else if app.orthoState === 'AVAILABLE'}
          {#if app.latest && app.latest.year !== cur.year}
            <button class="btn ghost" data-action="compare" onclick={toggleCompare}>
              {app.orthoCompare
                ? t('photo.duo_off')
                : t('photo.duo_on', { latest_year: app.latest.year })}
            </button>
          {/if}
          <button
            class="btn ghost"
            data-action="overlay"
            aria-pressed={app.overlayBuildings}
            onclick={() => (app.overlayBuildings = !app.overlayBuildings)}
          >
            {app.overlayBuildings ? t('overlay.buildings.hide') : t('overlay.buildings.show')}
          </button>
          {#if app.orthoCompare}
            <p class="cmp" aria-live="polite">
              {t('ortho.compare_label', { left_year: cur.year, right_year: app.orthoCompare.year })}
            </p>
            <!-- toggle de campaña: solo en pantalla estrecha (un lienzo) -->
            <div class="pv" role="group" aria-label={t('photo.toggle.a11y')}>
              <button
                class="pv-b"
                data-action="panel-a"
                aria-pressed={app.photoView === 'a'}
                onclick={() => (app.photoView = 'a')}
                >{t('photo.panel_a', { year: cur.year })}</button
              >
              <button
                class="pv-b"
                data-action="panel-b"
                aria-pressed={app.photoView === 'b'}
                onclick={() => (app.photoView = 'b')}
                >{t('photo.panel_a', { year: app.orthoCompare.year })}</button
              >
            </div>
            <p class="pv-hint">{t('photo.mobile_hint')}</p>
          {/if}
        {:else if app.orthoState === 'NOT_COVERED'}
          <p role="status">
            {t('ortho.not_covered', {
              year: cur.year,
              alternatives:
                app.orthoAlternatives
                  .map((c) => String(c.year))
                  .join(locale.lang === 'eu' ? ' edo ' : ' o ') || t('ortho.fallback_alt')
            })}
          </p>
          {#each app.orthoAlternatives as c (c.year)}
            <button
              class="btn ghost"
              data-action="alt"
              data-year={c.year}
              onclick={() => activateOrtho(c)}>{c.year}</button
            >
          {/each}
        {:else}
          <p role="alert">{t('ortho.service_error')}</p>
          <button class="btn ghost" data-action="retry" onclick={() => cur && void probeOrtho(cur)}
            >{t('ortho.retry')}</button
          >
        {/if}
        {#if ended}
          <p class="ended" role="status">{t('photo.ended')}</p>
        {/if}
        <button class="btn ghost" data-action="hide" onclick={() => (app.orthoVisible = false)}
          >{t('ortho.hide')}</button
        >
      </div>
    {/if}
  </section>
{/if}

<style>
  .photo {
    padding: 0.45rem clamp(1rem, 4vw, 2.4rem) 0.6rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
  }
  .photo:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
  }

  /* ── toolbar: nav de campañas + metadata + disclosure en una línea ── */
  .p-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem 1rem;
    flex-wrap: wrap;
  }
  .p-nav {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .play {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
  }
  .play:hover {
    background: var(--ink-2);
  }
  .play:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .p-year {
    font-family: var(--serif);
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--accent-deep);
    min-width: 4.5ch;
    text-align: center;
  }
  .nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    background: none;
    border: 1.5px solid var(--line-strong);
    border-radius: 8px;
    color: var(--accent-deep);
    padding: 0;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
  }
  .nav:hover:not(:disabled) {
    border-color: var(--accent-deep);
  }
  .nav:disabled {
    color: var(--ink-3);
    border-color: var(--line);
    cursor: default;
  }
  .nav:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .speed-lbl {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 0.3rem;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .speed-lbl select {
    font: inherit;
    padding: 0.3rem 0.5rem;
    min-height: 44px;
    border: 1.5px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
  }
  .meta {
    margin: 0;
    font-size: 0.76rem;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .p-info {
    position: relative;
    flex: 0 0 auto;
    margin-left: auto;
  }
  .p-info summary {
    list-style: none;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ink-3);
    cursor: pointer;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 0.35rem;
    border-bottom: 1px solid var(--line-strong);
    white-space: nowrap;
  }
  .p-info summary::-webkit-details-marker {
    display: none;
  }
  .p-info summary:hover {
    color: var(--ink);
  }
  .p-info summary:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .p-info-body {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 6;
    width: min(52ch, 82vw);
    padding: 0.6rem 0.8rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(24, 38, 49, 0.14);
    font-size: 0.74rem;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .p-info-body p {
    margin: 0 0 0.35rem;
  }
  .p-info-body p:last-child {
    margin-bottom: 0;
  }

  /* ── eje de campañas a todo lo ancho: posición proporcional al año ── */
  .railwrap {
    overflow-x: clip;
    margin-top: 0.15rem;
  }
  .rail {
    position: relative;
    height: 52px;
    width: 100%;
  }
  /* línea base del eje */
  .rail::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 13px;
    height: 1.5px;
    background: var(--line-strong);
  }
  /* El scrub invisible ocupa todo el rail: recibe puntero, tacto y
     teclado; las marcas .epoch son solo la representación visual. */
  .pscrub {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
  }
  .rail:has(.pscrub:focus-visible) {
    outline: 2px solid var(--ink);
    outline-offset: 4px;
  }
  .epoch {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    font: inherit;
    padding: 0 0.4rem;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    pointer-events: none;
  }
  /* etiquetas de borde: el tick queda en su posición real y el texto
     no se recorta fuera del eje (bug del «45» visible) */
  .epoch.first {
    transform: translateX(0);
    align-items: flex-start;
  }
  .epoch.last {
    transform: translateX(-100%);
    align-items: flex-end;
  }
  /* el tick */
  .epoch::before {
    content: '';
    width: 1.5px;
    height: 9px;
    margin-top: 8px;
    background: var(--ink-3);
    transition:
      height 0.12s,
      background 0.12s;
  }
  .epoch.major::before {
    height: 13px;
    margin-top: 4px;
    background: var(--ink-2);
  }
  .epoch .yr {
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    margin-top: 5px;
    opacity: 0;
    transition: opacity 0.12s;
    pointer-events: none;
  }
  .epoch.major .yr,
  .epoch.cur .yr,
  .epoch.near .yr,
  .epoch.birth .yr {
    opacity: 1;
  }
  .epoch.cur::before {
    width: 2.5px;
    height: 17px;
    margin-top: 0;
    background: var(--accent);
  }
  .epoch.cur .yr {
    color: var(--accent-deep);
    font-weight: 700;
    font-size: 0.8rem;
  }
  /* durante el arrastre la campaña más cercana se marca sin activarla */
  .epoch.near:not(.cur)::before {
    background: var(--ink);
  }
  .epoch.near:not(.cur) .yr {
    color: var(--ink);
    font-weight: 700;
  }
  /* marcador «tu año»: la campaña más cercana al elegido, en acento */
  .epoch.birth:not(.cur) .yr {
    color: var(--accent-deep);
    font-weight: 700;
  }
  .epoch.birth:not(.cur)::before {
    background: var(--accent-deep);
  }

  .hint {
    margin: 0.3rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .ended {
    flex-basis: 100%;
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.35rem;
  }
  .cmp {
    margin: 0.2rem 0;
    font-size: 0.78rem;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }
  .pv {
    display: none;
    gap: 0;
    border: 1px solid var(--ink-3);
    border-radius: 8px;
    overflow: hidden;
    margin-left: 0.4rem;
  }
  .pv-b {
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .pv-b[aria-pressed='true'] {
    background: var(--accent);
    color: #fff;
  }
  .pv-hint {
    display: none;
    margin: 0.2rem 0;
    font-size: 0.72rem;
    color: var(--ink-3);
    flex-basis: 100%;
  }
  .btn {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    margin-right: 0.4rem;
    min-height: 44px;
  }
  .btn.ghost {
    background: transparent;
    color: var(--accent-deep);
  }
  .btn:focus-visible,
  .pv-b:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .p-bar {
      gap: 0.3rem 0.7rem;
    }
    .meta {
      order: 3;
      flex-basis: 100%;
    }
    .p-info {
      margin-left: auto;
    }
    .p-year {
      font-size: 1.3rem;
    }
    .pv {
      display: inline-flex;
    }
    .pv-hint {
      display: block;
    }
  }
</style>
