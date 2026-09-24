<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { flightSuffix, type Campaign } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';
  import TemporalChrome from './TemporalChrome.svelte';
  import LayerToggles from './LayerToggles.svelte';

  /**
   * Vista FOTO (G2-B/G5-E, G19): la misma escena del mapa con una campaña
   * de ortofoto. El rail temporal va integrado en el borde del lienzo (TemporalChrome,
   * modo discreto): play + ◀ campaña ▶ + marcas reales 1945→2025 + ⓘ.
   * La procedencia completa (editor, vuelo real, licencia) vive tras ⓘ —
   * la barra solo lleva play + campaña + rail (G19-R2).
   * Navegar (rail, prev/next, play) es una activación explícita — cada
   * paso sondea exactamente la campaña pedida, sin sustituciones
   * silenciosas. Entrar en la vista no pide imagen alguna.
   *
   * Capas (fotografía on/off, contorno de edificios) → LayerToggles, la
   * familia cartográfica; no compiten con la timeline. La comparación
   * editorial (orthoCompare/CompareMap) se conserva para historias y
   * deep links ?ortho2=, pero ya no es un CTA del visor — su equivalente
   * de producto es el modo «Antes / ahora». En pantalla estrecha con dúo
   * activo, un chip flotante elige qué campaña ocupa el lienzo único.
   */

  // Campaña en contexto: la activada si existe; si no, la más cercana al año.
  let cur = $derived<Campaign | null>(app.orthoCampaign ?? app.nearest);

  let idx = $derived(cur ? app.allCampaigns.findIndex((c) => c.year === cur.year) : -1);

  // ── Eje de campañas: posición REAL por año a todo lo ancho — cada
  // campaña es una marca en el eje (1945→2025), snap exclusivamente a
  // campañas existentes. La campaña activa NO lleva etiqueta propia:
  // el año grande junto al play es la fuente de verdad visual (G19 §12).
  // Extremos del eje: posición % = (año - y0) / (y1 - y0)
  let y0 = $derived(app.allCampaigns[0]?.year ?? 1945);
  let y1 = $derived(app.allCampaigns[app.allCampaigns.length - 1]?.year ?? 2025);
  function railPct(year: number): string {
    return `${(((year - y0) / (y1 - y0)) * 100).toFixed(2)}%`;
  }

  // Etiquetas: regla de densidad en px reales del rail (G19 §11) —
  // extremos siempre; majors por orden si dejan ~36px libres con TODAS
  // las ya pintadas (no solo con la activa: dos campañas a 1–2 años
  // coexisten como ticks sin pelear por el texto). La activa nunca
  // lleva etiqueta: el año grande junto al play es la fuente de verdad.
  const LABEL_GAP_PX = 42;
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
  let pxPerYear = $derived(railW / Math.max(y1 - y0, 1));
  let labeled = $derived.by(() => {
    const s = new SvelteSet<number>();
    const cs = app.allCampaigns;
    if (!cs.length) return s;
    const kept: number[] = [];
    const far = (y: number) => kept.every((k) => Math.abs(k - y) * pxPerYear >= LABEL_GAP_PX);
    // 1º extremos — anclas del eje, siempre
    s.add(y0);
    s.add(y1);
    kept.push(y0, y1);
    // 2º majors por orden cronológico, si no colisionan
    for (const c of cs) {
      if (s.has(c.year)) continue;
      const major = c.source === 'bizkaia' || !!c.layer;
      if (major && far(c.year)) {
        s.add(c.year);
        kept.push(c.year);
      }
    }
    return s;
  });
  function showYr(c: Campaign): boolean {
    if (!cur || c.year === cur.year) return false; // la activa la nombra el año grande
    const near = scrubNear?.year;
    if (near !== undefined && c.year === near) return true; // feedback del arrastre
    if (c.year === y0 || c.year === y1) return true; // los extremos anclan el eje siempre
    // el tick activo es más alto/acentuado: nada de texto debajo
    if (Math.abs(c.year - cur.year) * pxPerYear < LABEL_GAP_PX * 0.5) return false;
    return labeled.has(c.year);
  }

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
  let shownYear = $derived(scrubNear?.year ?? cur?.year ?? y0);
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

  // ── Reproducción por campañas reales (G13): avanza una campaña por
  // paso manteniendo encuadre; cada paso es la MISMA activación sondeada
  // del rail — nunca salta en silencio. Si la sonda declara falta de
  // cobertura o error, la reproducción se detiene y el mensaje queda
  // visible. Con prefers-reduced-motion no hay reproducción automática
  // (mismo patrón que el reproductor de Evolución): el rail y ←/→ ya dan
  // el paso manual.
  // `playing` es local (esta reproducción es del panel, no la global del
  // Timeline): al remontar queda pausado de forma explícita — el botón
  // muestra «Reproducir» y no hay intervalo huérfano.
  // `ended`: la serie se acabó — la reproducción se DETIENE en la última
  // campaña (sin bucle automático) y «Reproducir» vuelve a la primera.
  let playing = $state(false);
  let ended = $state(false);
  $effect(() => {
    void app.playbackPauseSeq;
    playing = false;
  });
  // velocidad fija bien elegida (G19 §8): la cadencia no es un ajuste del
  // usuario — 1,8 s por campaña deja leer cada imagen sin esperar.
  const PLAY_MS = 1800;
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
    }, PLAY_MS);
    return () => clearInterval(id);
  });
</script>

{#if cur && app.year !== null}
  <section class="photo tcpanel tcp-tl" aria-label={t('photo.label')} tabindex="-1">
    <TemporalChrome
      {playing}
      canPlay={!reduceMotion}
      playLabel={t('photo.play')}
      pauseLabel={t('photo.pause')}
      year={shownYear}
      liveYear
      min={y0}
      max={y1}
      value={shownYear}
      scrubAria={t('photo.scrub_label')}
      scrubValueText={t('photo.scrub_valuetext', { year: shownYear })}
      onscrubinput={onScrubInput}
      onscrubcommit={onScrubCommit}
      onscrubclick={onScrubClick}
      onscrubkey={onScrubKey}
      ontoggle={togglePlay}
      prev={prev ? { year: prev.year, label: t('photo.prev', { year: prev.year }) } : null}
      next={next ? { year: next.year, label: t('photo.next', { year: next.year }) } : null}
      onprev={() => {
        playing = false;
        ended = false;
        if (prev) activateOrtho(prev);
      }}
      onnext={() => {
        playing = false;
        ended = false;
        if (next) activateOrtho(next);
      }}
      prevNoneLabel={t('photo.prev_none')}
      nextNoneLabel={t('photo.next_none')}
      infoLabel={t('photo.details')}
      bind:railEl
    >
      {#snippet marks()}
        <!-- las marcas bajo el input son solo visuales — el estado
             accesible lo lleva el slider -->
        {#each app.allCampaigns as c, i (c.year)}
          <span
            class="epoch"
            class:major={c.source === 'bizkaia' || !!c.layer}
            class:cur={c.year === cur.year}
            class:near={scrubNear !== null && scrubNear.year === c.year}
            class:first={i === 0}
            class:last={i === app.allCampaigns.length - 1}
            class:show={showYr(c)}
            data-year={c.year}
            style:left={railPct(c.year)}
            aria-hidden="true"><span class="yr">{c.year}</span></span
          >
        {/each}
      {/snippet}
      {#snippet info()}
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
      {/snippet}
    </TemporalChrome>

    {#if !app.orthoVisible}
      <p class="hint">{t('photo.hint')}</p>
    {:else}
      {#if probeStatus.probing || app.orthoState === 'UNKNOWN'}
        <p class="state" role="status">{t('ortho.loading', { year: cur.year })}</p>
      {:else if app.orthoState === 'NOT_COVERED'}
        <div class="state">
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
        </div>
      {:else if app.orthoState === 'SERVICE_ERROR'}
        <div class="state">
          <p role="alert">{t('ortho.service_error')}</p>
          <button class="btn ghost" data-action="retry" onclick={() => cur && void probeOrtho(cur)}
            >{t('ortho.retry')}</button
          >
        </div>
      {/if}
      {#if ended}
        <p class="ended" role="status">{t('photo.ended')}</p>
      {/if}
    {/if}
  </section>

  <LayerToggles ortho={cur} />

  {#if app.orthoCompare}
    <!-- con dúo activo en pantalla estrecha (un solo lienzo): qué
         campaña ocupa el mapa. Solo visible ≤700px — en ancho el dúo
         usa CompareMap y este chip no aplica. -->
    <div class="pvfloat" role="group" aria-label={t('photo.toggle.a11y')}>
      <button
        class="pv-b"
        data-action="panel-a"
        aria-pressed={app.photoView === 'a'}
        onclick={() => (app.photoView = 'a')}>{t('photo.panel_a', { year: cur.year })}</button
      >
      <button
        class="pv-b"
        data-action="panel-b"
        aria-pressed={app.photoView === 'b'}
        onclick={() => (app.photoView = 'b')}
        >{t('photo.panel_a', { year: app.orthoCompare.year })}</button
      >
    </div>
  {/if}
{/if}

<style>
  .photo {
    display: flex;
    flex-direction: column;
  }
  .photo:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }
  @media (max-width: 1023px) {
    /* barra anclada abajo: el estado crece hacia el mapa, la barra queda
       pegada al borde inferior del lienzo */
    .photo {
      flex-direction: column-reverse;
    }
  }

  /* ── marcas de campaña sobre la línea base del chrome (top:10px) ── */
  .epoch {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0.4rem;
    border: 0;
    background: transparent;
    color: rgba(247, 248, 250, 0.6);
    pointer-events: none;
  }
  /* etiquetas de borde: el tick queda en su posición real y el texto
     no se recorta fuera del eje */
  .epoch.first {
    transform: translateX(0);
    align-items: flex-start;
  }
  .epoch.last {
    transform: translateX(-100%);
    align-items: flex-end;
  }
  /* el tick: termina en la línea base del rail (top:10px) */
  .epoch::before {
    content: '';
    width: 1.5px;
    height: 5px;
    margin-top: 5px;
    background: rgba(247, 248, 250, 0.45);
    transition:
      height 0.12s,
      background 0.12s;
  }
  .epoch.major::before {
    height: 9px;
    margin-top: 1px;
    background: rgba(247, 248, 250, 0.7);
  }
  .epoch .yr {
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    margin-top: 5px;
    opacity: 0;
    transition: opacity 0.12s;
    pointer-events: none;
  }
  .epoch.show .yr {
    opacity: 1;
  }
  .epoch.cur::before {
    width: 2.5px;
    height: 12px;
    margin-top: -2px;
    background: var(--accent);
  }
  /* durante el arrastre la campaña más cercana se marca sin activarla */
  .epoch.near:not(.cur)::before {
    background: var(--paper);
  }
  .epoch.near:not(.cur) .yr {
    color: var(--paper);
    font-weight: 700;
  }

  /* ── estado/hints secundarios sobre la superficie oscura ── */
  .hint {
    margin: 0;
    padding: 0 0.7rem 0.45rem;
    font-size: 0.74rem;
    color: rgba(247, 248, 250, 0.75);
  }
  .state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.7rem 0.45rem;
    font-size: 0.74rem;
    color: rgba(247, 248, 250, 0.85);
  }
  .state p {
    margin: 0;
    flex-basis: 100%;
  }
  .ended {
    margin: 0;
    padding: 0 0.7rem 0.45rem;
    font-size: 0.74rem;
    color: rgba(247, 248, 250, 0.75);
  }
  .btn {
    font: inherit;
    font-size: 0.78rem;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    min-height: 40px;
  }
  .btn.ghost {
    background: transparent;
    color: var(--paper);
    border-color: rgba(247, 248, 250, 0.55);
  }
  .btn:focus-visible,
  .pv-b:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }

  /* ── dúo en pantalla estrecha: qué campaña ocupa el lienzo único ── */
  .pvfloat {
    display: none;
    position: absolute;
    top: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 13;
    pointer-events: auto;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(24, 38, 49, 0.94);
    box-shadow: 0 4px 18px rgba(24, 38, 49, 0.3);
  }
  .pv-b {
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    min-height: 40px;
    border: 0;
    background: transparent;
    color: rgba(247, 248, 250, 0.75);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .pv-b[aria-pressed='true'] {
    background: var(--accent);
    color: #fff;
  }
  @media (max-width: 700px) {
    .pvfloat {
      display: inline-flex;
    }
    .epoch .yr {
      font-size: 0.62rem;
    }
  }
</style>
