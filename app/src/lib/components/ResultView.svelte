<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, fmtHa } from '$lib/domain/format';
  import MapView from '$lib/map/MapView.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import Contrast from './Contrast.svelte';
  import DecadeDistribution from './DecadeDistribution.svelte';
  import OrthoControls from './OrthoControls.svelte';
  import HistMapInvite from './HistMapInvite.svelte';
  import AddressInvite from './AddressInvite.svelte';
  import CompareInvite from './CompareInvite.svelte';
  import PlanningContext from './PlanningContext.svelte';
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
    <section class="headline-block">
      <h1>{t('result.headline', { municipality: app.place.name })}</h1>
      <p class="lead2">
        {t('result.lead', { post_share: fmtPct(h.sharePct), selected_year: app.year })}
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
      </details>
      <p class="area">{t('result.area', { area: fmtHa(h.footprintAfterM2) })}</p>
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
    <ViewSwitch />

    {#if app.mode === 'time'}
      <!-- TIEMPO: el eje temporal encabeza; el mapa queda como evidencia -->
      <Timeline />
    {/if}

    <section class="mapband" aria-label={t('result.map_label')}>
      <MapView {onViewChange} />
    </section>

    {#if app.mode !== 'time'}
      <Timeline />
    {/if}

    {#if app.mode === 'photo'}
      <Lazy loader={() => import('./PhotoPanel.svelte')} />
    {/if}

    <section class="below">
      <div class="sheet">
        <h2>{t('dist.title', { municipality: app.place.name })}</h2>
        <DecadeDistribution />
        {#if app.mode !== 'photo'}
          <OrthoControls />
        {/if}
        <HistMapInvite />
        <!-- G3-A progressive disclosure: primero la recompensa municipal,
             después profundidad personal (gate §1/§10) -->
        <AddressInvite />
        <CompareInvite />
        <Contrast />
        {#if app.selectedCell || app.cellInspectNone}
          <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.CellDetail }))} />
        {/if}
        {#if app.selectedBuilding}
          <Lazy
            loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.BuildingCard }))}
          />
        {/if}
        <PlanningContext />
        {#if app.selectedBuilding}
          <Lazy
            loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.ContextModules }))}
          />
        {/if}
        <p class="caveat">{t('result.caveat')}</p>
      </div>
      <footer class="foot">
        <p>{t('footer.sources')}</p>
        <p>
          {t('footer.code')}
          {t('footer.snapshot', { snapshot_date: app.catalog?.snapshot_year ?? '—' })}
          <a href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
        </p>
      </footer>
    </section>
  {/if}
</div>

<style>
  .result {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: #f2f0ec;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem clamp(0.9rem, 3vw, 2rem);
    border-bottom: 1px solid #ddd9d0;
    background: #f7f5f1;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: #8e2f4c;
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
    border: 1px solid #b9b5aa;
    background: #fff;
    cursor: pointer;
    color: #44423c;
  }
  .changeform {
    display: flex;
    gap: 0.6rem;
    padding: 0.5rem clamp(0.9rem, 3vw, 2rem);
    background: #efede7;
    border-bottom: 1px solid #ddd9d0;
    align-items: center;
  }
  .changeform input {
    width: 7rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid #b9b5aa;
    border-radius: 8px;
    font: inherit;
  }
  .headline-block {
    padding: 1.4rem clamp(0.9rem, 3vw, 2rem) 0.8rem;
    max-width: 900px;
  }
  .resolving {
    padding: 1.4rem clamp(0.9rem, 3vw, 2rem) 0.8rem;
    font-size: 0.95rem;
    color: #55534b;
    margin: 0;
  }
  h1 {
    font-size: clamp(1.5rem, 3.4vw, 2.4rem);
    line-height: 1.15;
    margin: 0 0 0.6rem;
    color: #1c1a17;
    text-wrap: balance;
  }
  .lead2 {
    font-size: 1.1rem;
    margin: 0 0 0.5rem;
    color: #33312c;
  }
  .coverage {
    font-size: 0.85rem;
    color: #55534b;
    margin: 0 0 0.4rem;
    max-width: 70ch;
  }
  .warn {
    background: #fdf3e7;
    border: 1px solid #d9a441;
    color: #6b4d13;
    font-size: 0.8rem;
    padding: 0.4rem 0.7rem;
    border-radius: 6px;
    max-width: 60ch;
  }
  .calc {
    font-size: 0.78rem;
    color: #55534b;
    margin: 0.4rem 0;
  }
  .calc summary {
    cursor: pointer;
    font-weight: 600;
  }
  .area {
    font-size: 0.82rem;
    color: #6b6b63;
    margin: 0.3rem 0 0;
  }
  .sr-summary {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .mapband {
    height: min(58svh, 560px);
    border-top: 1px solid #ddd9d0;
    border-bottom: 1px solid #ddd9d0;
  }
  .below {
    padding: 0 clamp(0.9rem, 3vw, 2rem) 2rem;
  }
  .sheet {
    max-width: 900px;
    margin: -1.6rem auto 0;
    background: #fff;
    border: 1px solid #e0ddd4;
    border-radius: 12px;
    padding: 1.1rem 1.3rem;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.07);
    position: relative;
    z-index: 5;
  }
  .sheet h2 {
    font-size: 1rem;
    margin: 0 0 0.6rem;
    color: #33312c;
  }
  .caveat {
    margin: 0.7rem 0 0;
    font-size: 0.78rem;
    color: #6b6b63;
    font-style: italic;
    border-top: 1px solid #eeece6;
    padding-top: 0.5rem;
  }
  .foot {
    max-width: 900px;
    margin: 1.4rem auto 0;
    font-size: 0.72rem;
    color: #605e56;
    border-top: 1px solid #e0ddd4;
    padding-top: 0.6rem;
  }
  .foot a {
    color: #8e2f4c;
    margin-left: 0.5rem;
  }
  @media (max-width: 700px) {
    .mapband {
      height: 52svh;
    }
    .sheet {
      margin-top: -2.4rem;
      padding: 0.9rem;
    }
  }
</style>
