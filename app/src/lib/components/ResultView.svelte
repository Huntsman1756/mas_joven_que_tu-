<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, fmtHa } from '$lib/domain/format';
  import { approxOfTen } from '$lib/domain/human';
  import MapView from '$lib/map/MapView.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import DecadeDistribution from './DecadeDistribution.svelte';
  import AddressInvite from './AddressInvite.svelte';
  import CompareInvite from './CompareInvite.svelte';
  import StoriesSection from './StoriesSection.svelte';
  import PlaceContext from './PlaceContext.svelte';
  import Lazy from './Lazy.svelte';
  import ShareButton from './ShareButton.svelte';
  import PlaceSearch from './PlaceSearch.svelte';
  import { resolve } from '$app/paths';

  let {
    onViewChange = () => {}
  }: { onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void } = $props();

  let changing = $state(false);
  let yearStr = $state('');

  let h = $derived(app.headline);
  let lowCoverage = $derived(h !== null && h.coveragePct < 70);

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
      <p class="lead2">
        {t('result.lead', {
          known: fmt(h.known),
          after: fmt(h.after),
          selected_year: app.year
        })}
        <span class="approx">{t('result.approx', { approx: approxOfTen(h.sharePct) })}.</span>
      </p>
      <p class="coverage">
        {t('result.coverage', {
          known: fmt(h.known),
          total: fmt(h.total),
          municipality: app.place.name,
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
    <div id="scene">
      {#if app.mode === 'time'}
        <Timeline />
      {/if}

      <div class="mapband" class:duo={photoDuo}>
        <section class="mapcell" aria-label={t('result.map_label')}>
          <MapView {onViewChange} />
        </section>
        {#if photoDuo}
          <section class="mapcell cmp">
            <Lazy loader={() => import('$lib/map/CompareMap.svelte')} />
          </section>
        {/if}
      </div>

      <ViewSwitch />

      {#if app.mode !== 'time' && app.mode !== 'photo' && app.mode !== 'hist'}
        <Timeline />
      {/if}

      {#if app.mode === 'photo'}
        <Lazy loader={() => import('./PhotoPanel.svelte')} />
      {:else if app.mode === 'hist'}
        <Lazy loader={() => import('./HistMapControls.svelte')} />
      {/if}
    </div>

    <div class="below">
      <!-- CUÁNDO: la distribución por periodo sobre el eje único -->
      <section class="tramo" aria-labelledby="reading-h">
        <h2 id="reading-h" class="kicker">{t('section.reading')}</h2>
        <DecadeDistribution />
        {#if app.selectedCell || app.cellInspectNone}
          <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.CellDetail }))} />
        {/if}
        <p class="caveat">{t('result.caveat')}</p>
        {#if h && app.year !== null}
          <details class="calc">
            <summary>{t('result.calc.summary')}</summary>
            <p>
              {t('result.calc', {
                selected_year: app.year,
                after: fmt(h.after),
                known: fmt(h.known),
                post_share: fmtPct(h.sharePct)
              })}
            </p>
            <p class="area">{t('result.area', { area: fmtHa(h.footprintAfterM2) })}</p>
            <p class="tech">
              {t('result.calc.technical')}
              <a href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
            </p>
          </details>
        {/if}
      </section>

      <!-- QUÉ MÁS SABEMOS DEL LUGAR: líneas editoriales con fuente+fecha -->
      <section class="tramo" aria-labelledby="context-h">
        <h2 id="context-h" class="kicker">{t('section.context')}</h2>
        <PlaceContext />
      </section>

      <!-- CASOS QUE MERECE LA PENA MIRAR -->
      <section class="tramo" aria-labelledby="more-h">
        <h2 id="more-h" class="kicker">{t('section.more')}</h2>
        <StoriesSection />
      </section>

      <!-- TU CALLE: profundidad personal por demanda -->
      <section class="tramo" aria-labelledby="place-h">
        <h2 id="place-h" class="kicker">{t('section.place')}</h2>
        {#if app.buildingRestoreFailed}
          <p class="notice" role="status">{t('building.restore_failed')}</p>
        {/if}
        <AddressInvite />
        {#if app.selectedBuilding}
          <Lazy
            loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.BuildingCard }))}
          />
          <Lazy
            loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.PlanningLocal }))}
          />
          <Lazy
            loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.ContextModules }))}
          />
        {/if}
        <CompareInvite />
      </section>

      <footer class="foot">
        <p>{t('footer.sources')}</p>
        <p>
          {t('footer.code')}
          {t('footer.snapshot', { snapshot_date: app.catalog?.snapshot_year ?? '—' })}
          <a href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
        </p>
      </footer>
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
  .lead2 {
    font-size: 1.08rem;
    margin: 0 0 0.3rem;
    color: var(--ink-2);
    max-width: 62ch;
  }
  .approx {
    color: var(--accent-deep);
    font-weight: 600;
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
  .calc {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.5rem 0;
    max-width: 68ch;
  }
  .calc summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .calc .tech {
    font-size: 0.75rem;
    color: var(--ink-3);
  }
  .calc .tech a {
    color: var(--accent-deep);
  }
  .area {
    margin: 0.3rem 0 0;
    color: var(--ink-3);
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
  }
  .mapband.duo .mapcell:first-child {
    border-right: 1px solid var(--line);
  }

  .below {
    padding: 0 clamp(1rem, 4vw, 2.4rem) 2.5rem;
  }
  .tramo {
    max-width: 840px;
    margin: 2.2rem auto 0;
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }
  .kicker {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-deep);
    margin: 0 0 0.8rem;
  }
  .caveat {
    margin: 0.8rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-3);
    font-style: italic;
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
    max-width: 68ch;
  }
  .notice {
    margin: 0.3rem 0 0.5rem;
    font-size: 0.82rem;
    color: var(--warn-text);
    background: var(--warn-bg);
    border-left: 3px solid var(--warn-line);
    padding: 0.4rem 0.7rem;
    max-width: 62ch;
  }
  .foot {
    max-width: 840px;
    margin: 2.4rem auto 0;
    font-size: 0.74rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.7rem;
  }
  .foot a {
    color: var(--accent-deep);
    margin-left: 0.5rem;
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
