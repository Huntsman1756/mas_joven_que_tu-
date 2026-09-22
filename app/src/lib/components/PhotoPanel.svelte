<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import {
    flightSuffix,
    milestoneCampaigns,
    milestoneCaption,
    type Campaign
  } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';
  import { relYearLabel } from '$lib/domain/format';

  /**
   * Vista FOTO (G2-B/G5-E): la misma escena del mapa con una campaña de
   * ortofoto. La procedencia (editor, año nominal, vuelo real si se conoce,
   * licencia) es visible en todo estado. Navegar prev/next es una activación
   * explícita — cada paso sondea exactamente la campaña pedida, sin
   * sustituciones silenciosas. Entrar en la vista no pide imagen alguna.
   *
   * Comparación: en pantalla ancha un segundo lienzo sincronizado muestra la
   * campaña `orthoCompare` (CompareMap); en pantalla estrecha el toggle
   * segmentado elige qué campaña ocupa el lienzo único (`app.photoView`).
   * El contorno de los edificios actuales sobre la imagen es opt-in
   * (`app.overlayBuildings`) — nunca pintado por defecto.
   */

  // Campaña en contexto: la activada si existe; si no, la más cercana al año.
  let cur = $derived<Campaign | null>(app.orthoCampaign ?? app.nearest);

  let idx = $derived(cur ? app.allCampaigns.findIndex((c) => c.year === cur.year) : -1);

  // ── Línea temporal de épocas (G7): posición REAL por año — cada
  // campaña se coloca en el eje según su año (1945→2025), no como pills
  // equiespaciadas. Campañas BFA y épocas especiales geoEuskadi llevan
  // etiqueta permanente; la serie anual 2004–2025 son ticks menores que
  // revelan su año al hover/foco. Misma máquina accesible: role=group,
  // roving tabindex, flechas/Home/Fin (G6-B).
  // Extremos del eje: posición % = (año - y0) / (y1 - y0)
  let y0 = $derived(app.allCampaigns[0]?.year ?? 1945);
  let y1 = $derived(app.allCampaigns[app.allCampaigns.length - 1]?.year ?? 2025);
  function railPct(year: number): string {
    return `${(((year - y0) / (y1 - y0)) * 100).toFixed(2)}%`;
  }
  // Etiqueta permanente solo si no colisiona con la anterior etiquetada
  // (≤2 años de separación → el tick revela su año al hover/foco).
  let labeled = $derived.by(() => {
    const s = new SvelteSet<number>();
    let last = -Infinity;
    for (const c of app.allCampaigns) {
      const major = c.source === 'bizkaia' || !!c.layer;
      if (major && c.year - last > 2) {
        s.add(c.year);
        last = c.year;
      }
    }
    return s;
  });

  let railEl = $state<HTMLElement | null>(null);
  let railFocus = $state<number | null>(null);
  let railTab = $derived(railFocus ?? cur?.year ?? null);

  function onRailKey(e: KeyboardEvent, i: number) {
    const btns = railEl?.querySelectorAll<HTMLButtonElement>('button.epoch');
    if (!btns?.length) return;
    let j: number;
    if (e.key === 'ArrowRight') j = i + 1;
    else if (e.key === 'ArrowLeft') j = i - 1;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = btns.length - 1;
    else return;
    e.preventDefault();
    const b = btns[Math.max(0, Math.min(btns.length - 1, j))];
    if (b) {
      railFocus = Number(b.dataset.year);
      b.focus();
    }
  }

  // La parada activa siempre visible en el rail (scroll horizontal).
  $effect(() => {
    const y = cur?.year;
    if (!railEl || y === undefined) return;
    railEl
      .querySelector(`button.epoch[data-year="${y}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  });

  // Relación con el año de nacimiento (G6-B): siempre el año real de la
  // campaña + la distancia honesta. Nunca etiquetar la imagen como el año
  // del usuario.
  let rel = $derived(cur ? relYearLabel(cur.year, app.year, t, locale.lang) : null);

  // G16 — hitos vitales → campañas reales (lógica en `milestoneCampaigns`,
  // testeada en dominio). No es un segundo eje temporal: el rail sigue
  // siendo el selector completo; esto son accesos directos con identidad.
  let milestones = $derived(milestoneCampaigns(app.allCampaigns, app.year));

  // Subtítulo del hito (dominio): intervalo de vuelo si la fuente lo
  // publica; si no, distancia aproximada al año NOMINAL marcada como tal.
  // Nunca una edad única derivada de un año nominal con vuelo fechado.
  function msSub(c: Campaign): string {
    return milestoneCaption(c, app.year, t, locale.lang);
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
  // (mismo patrón que Timeline): el rail y ←/→ ya dan el paso manual.
  // `playing` es local (esta reproducción es del panel, no la global del
  // Timeline): al remontar queda pausado de forma explícita — el botón
  // muestra «Reproducir» y no hay intervalo huérfano. La velocidad sí
  // sobrevive: es preferencia de usuario en `app.photoSpeed`.
  let playing = $state(false);
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
    if (!app.orthoVisible && cur) activateOrtho(cur);
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
      else playing = false;
    }, SPEEDS[app.photoSpeed]);
    return () => clearInterval(id);
  });
</script>

{#if cur && app.year !== null}
  <section class="photo" aria-label={t('photo.label')} tabindex="-1">
    <!-- aria-live: durante la reproducción cada campaña se anuncia con su
         año real, editor y vuelo — la imagen nunca se «disfraza» de otro año -->
    <div class="p-head" aria-live="polite">
      <div class="p-nav">
        <button
          class="nav"
          data-action="prev"
          disabled={!prev}
          onclick={() => {
            playing = false; // elección manual: el usuario toma el control
            if (prev) activateOrtho(prev);
          }}
          aria-label={prev ? t('photo.prev', { year: prev.year }) : t('photo.prev_none')}
        >
          ← {prev ? prev.year : '—'}
        </button>
        <strong class="p-year">{cur.year}</strong>
        <button
          class="nav"
          data-action="next"
          disabled={!next}
          onclick={() => {
            playing = false;
            if (next) activateOrtho(next);
          }}
          aria-label={next ? t('photo.next', { year: next.year }) : t('photo.next_none')}
        >
          {next ? next.year : '—'} →
        </button>
      </div>
      <p class="src">
        {publisher(cur)} · {t('photo.nominal', { year: cur.year })}{flightSuffix(
          cur,
          t,
          locale.lang
        )} · CC BY 4.0
        {#if app.orthoVisible}
          <span class="nodata">· {t('photo.nodata')}</span>
        {/if}
      </p>
      {#if rel}
        <p class="rel">{rel}</p>
      {/if}
    </div>

    <!-- G16: accesos por hito vital — cada uno activa una campaña real
         del catálogo (el año del chip es el de la campaña, no el hito). -->
    {#if milestones.length > 1}
      <div class="ms-row" role="group" aria-label={t('photo.ms.a11y')}>
        {#each milestones as m (m.id)}
          <button
            class="ms"
            data-action="milestone"
            data-ms={m.id}
            aria-current={m.c.year === cur.year ? 'true' : undefined}
            onclick={() => {
              playing = false;
              activateOrtho(m.c);
            }}
          >
            <span class="ms-name">{t(`photo.ms.${m.id}`)}</span>
            <span class="ms-sub">{msSub(m.c)}</span>
          </button>
        {/each}
        <p class="ms-note">{t('photo.ms.note')}</p>
      </div>
    {/if}

    <div class="railwrap">
      <div
        class="rail"
        role="group"
        aria-label={t('photo.epochs_a11y')}
        bind:this={railEl}
        style:min-width="{(y1 - y0) * 44}px"
      >
        {#each app.allCampaigns as c, i (c.year)}
          <button
            class="epoch"
            data-action="epoch"
            class:major={labeled.has(c.year)}
            class:cur={c.year === cur.year}
            class:birth={app.year !== null && c === app.nearest}
            data-year={c.year}
            style:left={railPct(c.year)}
            tabindex={c.year === railTab ? 0 : -1}
            aria-current={c.year === cur.year ? 'true' : undefined}
            aria-label={c === app.nearest && app.year !== null
              ? `${c.year} — ${t('photo.epoch_birth')}`
              : String(c.year)}
            onclick={() => {
              playing = false;
              activateOrtho(c);
            }}
            onkeydown={(e) => onRailKey(e, i)}><span class="yr">{c.year}</span></button
          >
        {/each}
      </div>
    </div>

    {#if !app.orthoVisible}
      <p class="proposal">{t('photo.proposal', { year: cur.year })}</p>
      <button class="btn" data-action="activate" onclick={() => activateOrtho(cur!)}
        >{t('photo.activate')}</button
      >
      {#if !reduceMotion}
        <button class="btn ghost" data-action="play" onclick={togglePlay}>{t('photo.play')}</button>
      {/if}
    {:else}
      <div class="state">
        {#if !reduceMotion}
          <button
            class="btn"
            class:ghost={!playing}
            data-action="play"
            aria-pressed={playing}
            onclick={togglePlay}>{playing ? t('photo.pause') : t('photo.play')}</button
          >
        {/if}
        <label class="speed-lbl"
          >{t('photo.speed')}
          <select data-action="speed" bind:value={app.photoSpeed}>
            <option value="slow">{t('photo.speed.slow')}</option>
            <option value="normal">{t('photo.speed.normal')}</option>
            <option value="fast">{t('photo.speed.fast')}</option>
          </select>
        </label>
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
        <button class="btn ghost" data-action="hide" onclick={() => (app.orthoVisible = false)}
          >{t('ortho.hide')}</button
        >
      </div>
    {/if}
  </section>
{/if}

<style>
  .photo {
    padding: 0.7rem clamp(1rem, 4vw, 2.4rem) 0.9rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
  }
  .photo:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
  }
  .nodata {
    color: var(--ink-2);
    font-size: 0.72rem;
  }
  .p-head {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    grid-template-areas: 'nav rel' 'src src';
    align-items: center;
    gap: 0.35rem 1rem;
  }
  .p-nav {
    grid-area: nav;
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
  }
  .p-year {
    font-family: var(--serif);
    font-size: 1.7rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--accent-deep);
  }
  .nav {
    font: inherit;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    background: none;
    border: 0;
    border-bottom: 1.5px solid var(--accent);
    color: var(--accent-deep);
    padding: 0.15rem 0.1rem;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
  }
  .nav:disabled {
    color: var(--ink-3);
    border-bottom-color: transparent;
    cursor: default;
  }
  .nav:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .src {
    grid-area: src;
    min-block-size: 4.5em;
    line-height: 1.5;
    margin: 0;
    font-size: 0.75rem;
    color: var(--ink-3);
  }
  .rel {
    grid-area: rel;
    min-block-size: 3em;
    line-height: 1.5;
    display: flex;
    align-items: center;
    margin: 0;
    font-size: 0.72rem;
    color: var(--accent-deep);
    font-variant-numeric: tabular-nums;
  }
  /* G16 — hitos vitales: chips compactos con campaña real + edad aprox.;
     el rail sigue siendo el selector completo de campañas */
  .ms-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
    align-items: baseline;
  }
  .ms-note {
    flex-basis: 100%;
    margin: 0.1rem 0 0;
    font-size: 0.68rem;
    color: var(--ink-3);
    max-width: 72ch;
  }
  .ms {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.05rem;
    font: inherit;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.35rem 0.65rem;
    min-height: 44px;
    cursor: pointer;
    color: var(--ink);
  }
  .ms:hover {
    border-color: var(--line-strong);
  }
  .ms[aria-current='true'] {
    border-color: var(--accent);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .ms-name {
    font-size: 0.78rem;
    font-weight: 700;
  }
  .ms-sub {
    font-size: 0.68rem;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  .ms:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  /* G7 — línea temporal real: el contenedor hace scroll horizontal
     sin scrollbar visible; las campañas son ticks posicionados por año */
  .railwrap {
    overflow-x: auto;
    scrollbar-width: none;
    margin-top: 0.5rem;
  }
  .railwrap::-webkit-scrollbar {
    display: none;
  }
  .rail {
    position: relative;
    height: 64px;
    width: 100%;
  }
  /* línea base del eje */
  .rail::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 14px;
    height: 1.5px;
    background: var(--line-strong);
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
    min-width: 44px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
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
  .epoch.birth .yr,
  .epoch:hover .yr,
  .epoch:focus-visible .yr {
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
  /* marcador «tu año»: etiqueta en acento sobre la línea (no colisiona
     con la etiqueta permanente de una campaña vecina) */
  .epoch.birth:not(.cur) .yr {
    order: -1;
    margin: 0 0 3px;
    color: var(--accent-deep);
    font-weight: 700;
  }
  .epoch:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .proposal {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .state {
    min-block-size: 7rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.4rem;
  }
  .speed-lbl {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
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
    .state {
      min-block-size: 12rem;
    }
    .p-head {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'nav' 'rel' 'src';
      gap: 0.2rem;
    }
    .p-nav {
      justify-content: space-between;
    }
    .src {
      min-block-size: 7.5em;
    }
    .pv {
      display: inline-flex;
    }
    .pv-hint {
      display: block;
    }
  }
</style>
