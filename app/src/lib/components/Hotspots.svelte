<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { ensureCellSeries } from '$lib/domain/catalog';
  import { cellHotspots, type Hotspot } from '$lib/domain/sincebirth';
  import { parseYs, shareAfterParsed, footprintShareAfter } from '$lib/domain/cells';
  import { mapSync } from '$lib/map/sync';
  import { t } from '$lib/i18n/t';
  import { fmt } from '$lib/domain/format';

  /**
   * G6-I — «¿Dónde cambió más?»: las celdas de 500 m del municipio con más
   * edificios **actuales** construidos después del año personal. Cálculo
   * determinista sobre cells/<cod>.json (lazy, por demanda explícita).
   * Clic → flyTo + selección de la celda (CellDetail existente).
   */

  type HsState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  let hsState: HsState = $state('idle');
  let spots = $state<Hotspot[]>([]);
  let reqCod: number | null = null;

  async function compute() {
    const cod = app.place?.cod;
    const year = app.year;
    if (cod === undefined || year === null) return;
    hsState = 'loading';
    reqCod = cod;
    try {
      const series = await ensureCellSeries(cod);
      if (reqCod !== cod) return; // el lugar cambió durante el fetch
      app.cellSeries.set(cod, series);
      spots = cellHotspots(series, year);
      hsState = spots.length ? 'ready' : 'empty';
    } catch {
      hsState = 'error';
    }
  }

  function go(h: Hotspot) {
    const cod = app.place?.cod;
    if (cod === undefined) return;
    const s = app.cellSeries.get(cod)?.get(h.fid);
    const ys = s ? parseYs(s.ys) : null;
    let known = 0;
    for (const n of ys?.values() ?? []) known += n;
    app.selectedCell = {
      mun: cod,
      fid: h.fid,
      known,
      share: shareAfterParsed(ys, app.year ?? 0),
      footprint: footprintShareAfter(s?.ya ?? null, app.year ?? 0)
    };
    app.cellInspectNone = false;
    // z 13.2: dentro del rango de la capa de celdas (9–13.5); a ≥13.5 el
    // moveend de MapView limpiaría la selección recién hecha.
    mapSync.main?.flyTo({ center: [h.lon, h.lat], zoom: 13.2 });
    document.getElementById('scene')?.scrollIntoView({ block: 'nearest' });
  }
</script>

{#if app.place && app.year !== null}
  <div class="hot">
    {#if hsState === 'idle'}
      <button class="btn ghost" onclick={compute}>{t('hotspots.ask', { year: app.year })}</button>
    {:else if hsState === 'loading'}
      <p class="note" role="status">{t('hotspots.loading')}</p>
    {:else if hsState === 'ready'}
      <p class="lead">{t('hotspots.title', { year: app.year })}</p>
      <ol>
        {#each spots as h (h.fid)}
          <li>
            <button class="spot" onclick={() => go(h)}>
              {t('hotspots.item', { count: fmt(h.count), year: app.year })}
            </button>
          </li>
        {/each}
      </ol>
      <p class="note">{t('hotspots.note')}</p>
    {:else if hsState === 'empty'}
      <p class="note">{t('hotspots.empty', { year: app.year })}</p>
    {:else}
      <p class="note" role="alert">{t('hotspots.error')}</p>
    {/if}
  </div>
{/if}

<style>
  .hot {
    margin: 0.4rem 0 0;
  }
  .lead {
    margin: 0 0 0.3rem;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  ol {
    margin: 0.2rem 0 0.4rem;
    padding-left: 1.2rem;
  }
  .spot {
    font: inherit;
    font-size: 0.85rem;
    background: none;
    border: 0;
    border-bottom: 1.5px solid var(--accent);
    color: var(--accent-deep);
    padding: 0.2rem 0.1rem;
    min-height: 44px;
    cursor: pointer;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .spot:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .note {
    font-size: 0.75rem;
    color: var(--ink-3);
    margin: 0.2rem 0 0;
    max-width: 62ch;
  }
  .btn.ghost {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: transparent;
    color: var(--accent-deep);
    cursor: pointer;
    min-height: 44px;
  }
</style>
