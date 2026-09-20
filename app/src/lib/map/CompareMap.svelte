<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { rasterSourceDef, previewSourceDef } from '$lib/domain/ortho';
  import { preloadMapEngine } from '$lib/map/engine';
  import { mapSync } from '$lib/map/sync';
  import { PALETTE } from '$lib/palette';
  import { t } from '$lib/i18n/t';
  import type * as maplibregl from 'maplibre-gl';
  import type { Map as MLMap } from 'maplibre-gl';

  /**
   * G5-E — lienzo de comparación lado a lado (sustituye al swipe). Segundo
   * mapa MapLibre NO interactivo con la segunda campaña de ortofoto (o el
   * mapa 1923–25 si algún día se compara con él). Sincronización unidireccional
   * desde el mapa principal (mapSync.main) vía 'move' → jumpTo.
   *
   * a11y: canvas aria-hidden — es solo visual; la comparación se anuncia en
   * PhotoPanel (ortho.compare_label).
   */

  let container = $state<HTMLDivElement | null>(null);
  let map: MLMap | null = null;
  let shownYear: number | null = null;

  function setCampaign() {
    if (!map) return;
    const c = app.orthoCompare;
    const id = 'ortho-b';
    const prevId = `${id}-preview`;
    if (c && shownYear === c.year && map.getLayer(id)) return;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    if (map.getLayer(prevId)) map.removeLayer(prevId);
    if (map.getSource(prevId)) map.removeSource(prevId);
    shownYear = null;
    if (!c) return;
    const prev = previewSourceDef(c);
    if (prev) {
      map.addSource(prevId, prev);
      map.addLayer({
        id: prevId,
        type: 'raster',
        source: prevId,
        paint: { 'raster-fade-duration': 0 }
      });
    }
    map.addSource(id, rasterSourceDef(c));
    map.addLayer({ id, type: 'raster', source: id });
    shownYear = c.year;
  }

  let detach: (() => void) | null = null;
  function attachSync() {
    const main = mapSync.main;
    if (!main || !map || detach) return;
    const sync = () => {
      if (!map) return;
      map.jumpTo({
        center: main.getCenter(),
        zoom: main.getZoom(),
        bearing: main.getBearing(),
        pitch: main.getPitch()
      });
    };
    main.on('move', sync);
    sync();
    detach = () => main.off('move', sync);
  }

  onMount(async () => {
    const [ml] = await preloadMapEngine();
    map = new (ml as typeof maplibregl).Map({
      container: container!,
      style: {
        version: 8,
        glyphs: `${import.meta.env.BASE_URL}fonts/glyphs/{fontstack}/{range}.pbf`,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': PALETTE.paper } }]
      },
      center: [app.view.lon, app.view.lat],
      zoom: app.view.zoom,
      minZoom: 7,
      maxZoom: 17,
      interactive: false,
      attributionControl: false
    });
    map.on('load', () => {
      // aria-hidden visual-only: el canvas hereda role/tabindex de MapLibre
      // — los retiramos para que no entre en el árbol de accesibilidad.
      const cv = map!.getCanvas();
      cv.removeAttribute('role');
      cv.removeAttribute('tabindex');
      cv.setAttribute('aria-hidden', 'true');
      setCampaign();
      attachSync();
    });
  });

  // si el mapa principal aún no estaba listo al montar (deep link), reintentar
  let retryTimer: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    if (map && !detach && !mapSync.main && !retryTimer) {
      let tries = 0;
      retryTimer = setInterval(() => {
        if (detach || !map || ++tries > 100) {
          if (retryTimer) clearInterval(retryTimer);
          retryTimer = null;
        } else attachSync();
      }, 100);
    }
  });
  $effect(() => {
    void app.orthoCompare;
    if (map?.isStyleLoaded() ?? false) setCampaign();
  });

  onDestroy(() => {
    if (retryTimer) clearInterval(retryTimer);
    detach?.();
    map?.remove();
    map = null;
  });
</script>

<div class="cmpwrap" bind:this={container} aria-hidden="true">
  <span class="cmpcap"
    >{app.orthoCompare ? t('photo.panel_a', { year: app.orthoCompare.year }) : ''}</span
  >
</div>

<style>
  .cmpwrap {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 340px;
  }
  .cmpcap {
    position: absolute;
    left: 0.75rem;
    bottom: 0.75rem;
    z-index: 10;
    background: rgba(25, 24, 23, 0.78);
    color: var(--paper);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
  }
</style>
