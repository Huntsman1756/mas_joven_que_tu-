<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { ensureCellSeries } from '$lib/domain/catalog';
  import { cellHotspots, zoneRef, type Hotspot } from '$lib/domain/sincebirth';
  import { activateOrthoAt } from '$lib/domain/ortho-probe.svelte';
  import {
    parseYs,
    cellDataState,
    shareAfterParsed,
    countAfterParsed,
    countUntilParsed,
    footprintShareAfter
  } from '$lib/domain/cells';
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

  // G10-10: la identidad del resultado es municipio + año. Cualquier
  // cambio de uno u otro invalida lo mostrado y hace obsoleta la
  // respuesta en vuelo (el guard compara la clave completa).
  let reqKey: string | null = null;
  let doneKey: string | null = null;

  let key = $derived(app.place && app.year !== null ? `${app.place.cod}:${app.year}` : null);

  $effect(() => {
    const k = key;
    const active = doneKey ?? reqKey; // clave que respalda lo visible/en vuelo
    if (active !== null && active !== k) {
      // el estado cambió: ni lo mostrado ni la request en curso
      // corresponden a la consulta actual
      spots = [];
      doneKey = null;
      reqKey = null; // la respuesta tardía queda descartada por el guard
      hsState = 'idle';
    }
  });

  async function compute() {
    const cod = app.place?.cod;
    const year = app.year;
    if (cod === undefined || year === null) return;
    const k = `${cod}:${year}`;
    hsState = 'loading';
    reqKey = k;
    try {
      const series = await ensureCellSeries(cod);
      if (reqKey !== k || key !== k) return; // lugar o año cambiaron en vuelo
      app.cellSeries.set(cod, series);
      spots = cellHotspots(series, year);
      doneKey = k;
      hsState = spots.length ? 'ready' : 'empty';
    } catch {
      if (reqKey === k) hsState = 'error';
    }
  }

  function go(h: Hotspot, { fly = true } = {}) {
    const cod = app.place?.cod;
    const year = app.year;
    if (cod === undefined || year === null) return;
    const s = app.cellSeries.get(cod)?.get(h.fid);
    const ys = s ? parseYs(s.ys) : null;
    let known = 0;
    for (const n of ys?.values() ?? []) known += n;
    app.selectedCell = {
      mun: cod,
      fid: h.fid,
      known,
      dataState: cellDataState(known, shareAfterParsed(ys, year), false, app.cellSeries.has(cod)),
      share: shareAfterParsed(ys, year),
      after: countAfterParsed(ys, year),
      until: app.playYear !== null ? countUntilParsed(ys, app.playYear) : null,
      footprint: footprintShareAfter(s?.ya ?? null, year),
      center: [h.lon, h.lat]
    };
    app.cellInspectNone = false;
    // z 13.2: dentro del rango de la capa de celdas (9–13.5); a ≥13.5 el
    // moveend de MapView limpiaría la selección recién hecha.
    if (fly) mapSync.main?.flyTo({ center: [h.lon, h.lat], zoom: 13.2 });
    document.getElementById('scene')?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Cadena lista → fotos: mismo `go` (una sola selección, sin estado
   * paralelo) y a continuación la campaña más cercana al año sondeada
   * EN el centro de la zona. La ficha de la celda queda como vuelta.
   */
  function goPhotos(h: Hotspot) {
    const campaign = app.nearest ?? app.latest;
    if (!campaign) return;
    go(h, { fly: false });
    // G19: entrar en el visor redimensiona el lienzo — un flyTo ya en
    // curso quedaría interrumpido a mitad de camino y la cámara no
    // llegaría a la zona. Salto imperativo diferido, el mismo contrato
    // que CellDetail.seePhotos (cameraTarget + seq → jumpTo).
    app.cameraTarget = { lon: h.lon, lat: h.lat, zoom: 13.2 };
    app.cameraSeq++;
    activateOrthoAt(campaign, [h.lon, h.lat]);
    app.modeNavSeq++; // cambio de modo explícito → entrada de history (G8)
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
        {#each spots as h, i (h.fid)}
          {@const ref = app.place ? zoneRef(app.place, h) : null}
          <li>
            <button class="spot" data-action="spot-map" data-fid={h.fid} onclick={() => go(h)}>
              <span class="ref"
                >{t('hotspots.zone', { n: i + 1 })} · {#if ref?.dir === 'center'}{t(
                    'hotspots.center'
                  )}{:else if ref}{t('hotspots.ref', {
                    km: fmt(ref.km),
                    dir: t(`dir.${ref.dir}`)
                  })}{/if}</span
              >
              {t('hotspots.item', { count: fmt(h.count), year: app.year })}
            </button>
            <button
              class="spot-photo"
              data-action="spot-photo"
              data-fid={h.fid}
              onclick={() => goPhotos(h)}>{t('hotspots.photo')}</button
            >
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
  .spot .ref {
    display: block;
    font-weight: 700;
    color: var(--ink);
    border-bottom: none;
  }
  .spot-photo {
    font: inherit;
    font-size: 0.78rem;
    background: none;
    border: 0;
    color: var(--accent-deep);
    text-decoration: underline;
    text-underline-offset: 3px;
    padding: 0.15rem 0;
    margin-left: 1.1rem;
    min-height: 44px;
    cursor: pointer;
  }
  .spot:focus-visible,
  .spot-photo:focus-visible {
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
