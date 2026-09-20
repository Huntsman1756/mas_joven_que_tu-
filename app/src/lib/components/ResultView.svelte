<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct } from '$lib/domain/format';
  import { approxOfTen, approxKind } from '$lib/domain/human';
  import { tick } from 'svelte';
  import MapView from '$lib/map/MapView.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import Lazy from './Lazy.svelte';
  import LazyView from './LazyView.svelte';
  import ShareButton from './ShareButton.svelte';
  import PlaceSearch from './PlaceSearch.svelte';

  let {
    onViewChange = () => {}
  }: { onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void } = $props();

  let changing = $state(false);
  let yearStr = $state('');

  let h = $derived(app.headline);
  let lowCoverage = $derived(h !== null && h.coveragePct < 70);
  // G5-R2: población del municipio viaja dentro del metrics JSON
  // (constants.population) — ningún fetch extra en el critical path.
  let population = $derived(app.metrics?.constants.population ?? null);

  // G5-R2 (prioridad humana 1): al entrar en «En el tiempo» el eje se
  // inserta sobre el mapa y puede quedar fuera de pantalla — se lleva a
  // la vista. Solo en cambios de modo por el usuario, no en la carga
  // inicial (un deep link ?view=time no debe secuestrar el scroll).
  let sceneEl = $state<HTMLElement | null>(null);
  let prevMode: string | null = null;
  let modeInit = false;
  $effect(() => {
    const m = app.mode;
    if (!modeInit) {
      modeInit = true;
      prevMode = m;
      return;
    }
    if (m === prevMode) return;
    prevMode = m;
    if (m === 'time') {
      void tick().then(() => {
        const el = sceneEl?.querySelector('.timeband');
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    }
  });

  // G5-E: comparación lado a lado solo en pantalla ancha; en estrecha el
  // toggle del panel elige la campaña del lienzo único (photoView).
  let narrow = $state(false);
  $effect(() => {
    const mq = matchMedia('(max-width: 700px)');
    const apply = () => (narrow = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
  let photoDuo = $derived(app.mode === 'photo' && !!app.orthoCompare && !narrow);

  // PERF4-R3: los deep links que restauran contenido below-fold
  // (?story=, ?building=, ?compare=, restauración fallida) montan el
  // chunk inmediatamente; sin deep link espera a viewport/focusin.
  let forceBelow = $derived(
    !!(app.story || app.selectedBuilding || app.compareYear !== null || app.buildingRestoreFailed)
  );
  $effect(() => {
    if (photoDuo) app.photoView = 'a'; // en dúo el lienzo principal es siempre A
  });

  async function applyChange() {
    const y = Number(yearStr);
    if (Number.isInteger(y) && y >= 1900 && y <= (app.metrics?.snapshot_year ?? 2026)) {
      app.year = y;
    }
    await app.ensureMetrics();
    changing = false;
  }
</script>

<div class="result">
  <header class="topbar">
    <span class="brand">{t('hero.title')}</span>
    <div class="controls">
      <button class="change" onclick={() => (changing = !changing)}>
        {t('result.change')}
      </button>
      <ShareButton />
    </div>
  </header>
  {#if changing}
    <form
      class="changeform"
      onsubmit={(e) => {
        e.preventDefault();
        applyChange();
      }}
    >
      <input
        bind:value={yearStr}
        inputmode="numeric"
        maxlength="4"
        placeholder={String(app.year ?? '')}
        aria-label={t('hero.label.year')}
      />
      <PlaceSearch compact />
      <button class="change" type="submit">{t('result.change.apply')}</button>
    </form>
  {/if}

  {#if h && app.year !== null && app.place}
    <!-- RESPUESTA: la cifra ES el titular (serif editorial, sin caja) -->
    <section class="headline-block">
      <h1>
        {t('result.headline.pre')}
        <span class="bignum">{fmtPct(h.sharePct)} %</span>
        {t('result.headline.post', { municipality: app.place.name })}
      </h1>
      <p class="plain">
        {#if approxKind(h.sharePct) === 'none'}
          {t('result.plain.none', { municipality: app.place.name })}
        {:else if approxKind(h.sharePct) === 'all'}
          {t('result.plain.all', { municipality: app.place.name })}
        {:else}
          {t('result.plain.some', {
            approx: approxOfTen(h.sharePct),
            municipality: app.place.name
          })}
        {/if}
      </p>
      <p class="lead2">
        {t('result.lead', {
          known: fmt(h.known),
          after: fmt(h.after),
          selected_year: app.year
        })}
      </p>
      {#if population?.padron}
        <p class="popline">
          {t('result.population', {
            municipality: app.place.name,
            population: fmt(population.padron),
            period: population.period.slice(0, 4)
          })}
        </p>
      {/if}
      <p class="coverage">
        {t('result.coverage', {
          known: fmt(h.known),
          total: fmt(h.total),
          coverage_pct: fmtPct(h.coveragePct)
        })}
        {#if h.unknown > 0 && h.suspicious > 0}
          {t('result.coverage.unknown_note', {
            unknown: fmt(h.unknown),
            suspicious: fmt(h.suspicious)
          })}
        {:else if h.unknown > 0}
          {t('result.coverage.unknown_only', { unknown: fmt(h.unknown) })}
        {:else if h.suspicious > 0}
          {t('result.coverage.suspicious_only', { suspicious: fmt(h.suspicious) })}
        {/if}
      </p>
      {#if lowCoverage}
        <p class="warn" role="note">{t('result.low_coverage')}</p>
      {/if}
    </section>

    <p class="sr-summary">
      {t('result.text_summary', {
        municipality: app.place.name,
        total: fmt(h.total),
        known: fmt(h.known),
        after: fmt(h.after),
        selected_year: app.year
      })}
    </p>
  {:else if app.metricsError}
    <p class="resolving" role="alert">{t('error.metrics')}</p>
  {:else if app.place}
    <p class="resolving" role="status">{t('search.searching')}</p>
  {/if}

  {#if app.place}
    <!-- ESCENA ÚNICA (G5): un lienzo, cuatro modos agrupados en dos
         intenciones — LEER EL DATO (edificios/tiempo) y COMPROBAR CON
         OTRAS FUENTES (fotos aéreas / mapa 1923–25). -->
    <div id="scene" bind:this={sceneEl}>
      {#if app.mode === 'time'}
        <Timeline />
      {/if}

      <div class="mapband" class:duo={photoDuo}>
        <section class="mapcell" aria-label={t('result.map_label')}>
          <MapView {onViewChange} />
          {#if app.mode === 'swipe'}
            <Lazy loader={() => import('$lib/map/SwipeCompare.svelte')} />
          {/if}
        </section>
        {#if photoDuo}
          <section class="mapcell cmp">
            <Lazy loader={() => import('$lib/map/CompareMap.svelte')} />
          </section>
        {/if}
      </div>

      <ViewSwitch />

      {#if app.mode !== 'time' && app.mode !== 'photo' && app.mode !== 'hist' && app.mode !== 'swipe'}
        <Timeline />
      {/if}

      {#if app.mode === 'photo'}
        <Lazy loader={() => import('./PhotoPanel.svelte')} />
      {:else if app.mode === 'hist'}
        <Lazy loader={() => import('./HistMapControls.svelte')} />
      {/if}
    </div>

    <div class="below">
      <!-- Todo lo below-fold (CUÁNDO/contexto/historias/tu calle/pie) es
           un único chunk lazy: se importa al acercarse al viewport, al
           primer focusin (teclado/clic) o si un deep link lo fuerza.
           Nada de ese grafo JS entra en el critical path (PERF4-R3). -->
      <LazyView loader={() => import('./BelowFold.svelte')} force={forceBelow} />
    </div>
  {/if}
</div>

<style>
  .result {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem clamp(1rem, 4vw, 2.4rem);
    border-bottom: 1px solid var(--line);
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--accent-deep);
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .change {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--ink-3);
    background: transparent;
    cursor: pointer;
    color: var(--ink-2);
  }
  .changeform {
    display: flex;
    gap: 0.6rem;
    padding: 0.5rem clamp(1rem, 4vw, 2.4rem);
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
    align-items: center;
  }
  .changeform input {
    width: 7rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--ink-3);
    border-radius: 8px;
    font: inherit;
  }

  /* RESPUESTA — el dato como titular editorial */
  .headline-block {
    padding: clamp(1.6rem, 4vw, 3rem) clamp(1rem, 4vw, 2.4rem) 0.8rem;
    max-width: 840px;
  }
  .resolving {
    padding: 1.4rem clamp(1rem, 4vw, 2.4rem) 0.8rem;
    font-size: 0.95rem;
    color: var(--ink-2);
    margin: 0;
  }
  h1 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: clamp(1.7rem, 3.6vw, 2.6rem);
    line-height: 1.12;
    margin: 0 0 0.7rem;
    color: var(--ink);
    text-wrap: balance;
  }
  .bignum {
    display: block;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: clamp(3.4rem, 9.5vw, 6rem);
    line-height: 0.95;
    color: var(--accent);
    font-weight: 700;
    margin: 0.1em 0;
    letter-spacing: -0.02em;
  }
  .plain {
    font-size: 1.08rem;
    margin: 0 0 0.55rem;
    color: var(--ink);
    max-width: 62ch;
  }
  .lead2 {
    font-size: 1.08rem;
    margin: 0 0 0.3rem;
    color: var(--ink-2);
    max-width: 62ch;
  }
  .popline {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
    color: var(--ink-2);
    max-width: 62ch;
    border-left: 2px solid var(--accent);
    padding-left: 0.6rem;
  }
  .coverage {
    font-size: 0.85rem;
    color: var(--ink-3);
    margin: 0 0 0.4rem;
    max-width: 70ch;
  }
  .warn {
    background: var(--warn-bg);
    border-left: 3px solid var(--warn-line);
    color: var(--warn-text);
    font-size: 0.82rem;
    padding: 0.45rem 0.8rem;
    max-width: 62ch;
  }
  .sr-summary {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  /* DÓNDE — lienzo continuo a ancho de columna */
  .mapband {
    height: min(56svh, 560px);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .mapband.duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .mapcell {
    min-height: 0;
    position: relative; /* SwipeCompare se superpone al lienzo principal */
  }
  .mapband.duo .mapcell:first-child {
    border-right: 1px solid var(--line);
  }

  .below {
    padding: 0 clamp(1rem, 4vw, 2.4rem) 2.5rem;
  }
  @media (max-width: 700px) {
    .mapband {
      height: 46svh;
    }
    .mapband.duo {
      grid-template-columns: 1fr;
    }
    .mapband.duo .mapcell:first-child {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
</style>
