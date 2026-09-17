<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { scaleLevel } from '$lib/domain/scale';
  import {
    shareAfter,
    shareAfterParsed,
    footprintShareAfter,
    parseYs,
    CELL_SMALL_DENOMINATOR
  } from '$lib/domain/cells';
  import { fmt, fmtPct } from '$lib/domain/format';
  import { rasterSourceDef, previewSourceDef } from '$lib/domain/ortho';
  import { preloadMapEngine } from '$lib/map/engine';
  import { ensureCellSeries } from '$lib/domain/catalog';
  import { t } from '$lib/i18n/t';
  import type { BuildingProps } from '$lib/domain/types';
  import type * as maplibregl from 'maplibre-gl';
  import type { Map as MLMap, MapLayerMouseEvent } from 'maplibre-gl';

  let {
    onViewChange = () => {}
  }: { onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void } = $props();

  let container = $state<HTMLDivElement | null>(null);
  let map: MLMap | null = null;
  let ml: typeof maplibregl | null = null;
  let level = $state(scaleLevel(app.view.zoom));
  let loaded = $state(false);
  let tooltip = $state<{ x: number; y: number; props: BuildingProps } | null>(null);
  let cellTooltip = $state<{
    x: number;
    y: number;
    share: number | null;
    footprint: number | null;
    known: number;
  } | null>(null);

  const COLORS = {
    bg: '#f2f0ec',
    before: '#8fa3b8',
    after: '#c63b4f',
    noyear: '#d9d8d2',
    noyearStroke: '#7c7c74',
    ramp: ['#eef0f3', '#dfc4cc', '#c58a9a', '#a85a70', '#8e2f4c'],
    neutral: '#e7e6e1',
    line: '#ffffff',
    muniLine: '#a9a49a'
  };

  const SHARE_PAINT: unknown = [
    'case',
    ['==', ['feature-state', 'share'], null],
    COLORS.neutral,
    [
      'interpolate',
      ['linear'],
      ['feature-state', 'share'],
      0,
      COLORS.ramp[0],
      0.25,
      COLORS.ramp[1],
      0.5,
      COLORS.ramp[2],
      0.75,
      COLORS.ramp[3],
      1,
      COLORS.ramp[4]
    ]
  ];

  function buildingFill(year: number | null): unknown {
    const y = year ?? 0;
    return [
      'case',
      ['!=', ['get', 'state'], 'VALID'],
      COLORS.noyear,
      ['>', ['get', 'year'], y],
      COLORS.after,
      COLORS.before
    ];
  }

  function hatchImage(): ImageData {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 8, 8);
    ctx.strokeStyle = COLORS.noyearStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(10, -2);
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, -2);
    ctx.moveTo(6, 10);
    ctx.lineTo(10, 6);
    ctx.stroke();
    return ctx.getImageData(0, 0, 8, 8);
  }

  // caches no reactivas: `parsedSeries` memoriza el parse de ys por feature
  // (una vez por sesión); `shareCache` la proyección por feature+año (PERF8:
  // el p95 alto venía de re-parsear el string de cada celda por año).
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const shareCache = new Map<string, number | null>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const parsedSeries = new Map<string, Map<number, number> | null>();
  function parsedFor(
    src: string,
    props: Record<string, unknown>,
    fid: unknown
  ): Map<number, number> | null {
    const mun = Number(props.mun ?? props.cod);
    const pk = `${src}|${fid}`;
    if (!parsedSeries.has(pk)) {
      // municipios: la serie sigue en la tesela; celdas: serie por fid via
      // data/cells/<cod>.json (PERF5). Si falta, se carga y repinta.
      const tileYs = props.ys as string | null | undefined;
      const s = tileYs !== undefined ? { ys: tileYs } : app.cellSeries.get(mun)?.get(Number(fid));
      if (s === undefined && !Number.isNaN(mun)) {
        // Encolada tras el prefetch en serie: una ráfaga de ~12 JSON
        // same-origin saturaría el pool HTTP/1.1 y retrasaría lo interactivo.
        queueCellSeries(mun);
        return null; // no cachear: aún no tenemos la serie
      }
      parsedSeries.set(pk, s?.ys ? parseYs(s.ys) : null);
    }
    return parsedSeries.get(pk)!;
  }
  function featureShare(src: string, props: Record<string, unknown>, fid: unknown): number | null {
    const key = `${src}|${fid}|${app.year}`;
    if (!shareCache.has(key)) {
      shareCache.set(key, shareAfterParsed(parsedFor(src, props, fid), app.year ?? 0));
    }
    return shareCache.get(key)!;
  }

  function refreshShares() {
    if (!map || !loaded) return;
    // Solo features renderizadas: querySourceFeatures recorre TODAS las teselas
    // cargadas (varios miles) en cada moveend/cambio de año — causa del p95 alto.
    for (const [src, layer] of [
      ['municipalities', 'munis-fill'],
      ['cells', 'cells-fill']
    ] as const) {
      if (!map.getSource(src) || !map.getLayer(layer)) continue;
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const seen = new Set<number>();
      for (const f of map.queryRenderedFeatures(undefined, { layers: [layer] })) {
        const fid = (f.properties.fid ?? f.id) as number;
        if (fid === undefined || fid === null || seen.has(fid)) continue;
        seen.add(fid);
        const share = featureShare(src, f.properties, fid);
        map.setFeatureState({ source: src, sourceLayer: src, id: fid }, { share });
      }
    }
  }

  function ensureBuildingSource(cod: number) {
    if (!map || app.loadedBuildingSources.has(cod)) return;
    const src = `b-${cod}`;
    const tiles = `pmtiles://${import.meta.env.BASE_URL}data/buildings/${String(cod).padStart(3, '0')}.pmtiles`;
    try {
      map.addSource(src, { type: 'vector', url: tiles, promoteId: 'id' });
    } catch {
      app.pmtilesError = true;
      return;
    }
    const before = map.getLayer('cells-fill') ? 'cells-fill' : undefined;
    map.addLayer(
      {
        id: `${src}-fill`,
        type: 'fill',
        source: src,
        'source-layer': 'buildings',
        minzoom: 13.5,
        paint: {
          'fill-color': buildingFill(app.year) as never,
          'fill-opacity': 0.85
        }
      },
      before
    );
    map.addLayer(
      {
        id: `${src}-noyear`,
        type: 'fill',
        source: src,
        'source-layer': 'buildings',
        minzoom: 13.5,
        filter: ['!=', ['get', 'state'], 'VALID'],
        paint: { 'fill-pattern': 'noyear-hatch', 'fill-opacity': 0.7 }
      },
      before
    );
    map.addLayer(
      {
        id: `${src}-line`,
        type: 'line',
        source: src,
        'source-layer': 'buildings',
        minzoom: 13.5,
        paint: {
          'line-color': [
            'case',
            ['!=', ['get', 'state'], 'VALID'],
            COLORS.noyearStroke,
            'rgba(255,255,255,0.6)'
          ] as never,
          'line-width': ['case', ['!=', ['get', 'state'], 'VALID'], 1, 0.4],
          'line-dasharray': [2, 2]
        }
      },
      before
    );
    map.addLayer(
      {
        id: `${src}-hl`,
        type: 'fill',
        source: src,
        'source-layer': 'buildings',
        minzoom: 13.5,
        filter: ['==', ['get', 'id'], '__none__'],
        paint: { 'fill-color': '#18181b', 'fill-opacity': 0.55 }
      },
      before
    );
    map.addLayer(
      {
        id: `${src}-sel`,
        type: 'line',
        source: src,
        'source-layer': 'buildings',
        minzoom: 13.5,
        filter: ['==', ['get', 'id'], '__none__'],
        paint: { 'line-color': '#18181b', 'line-width': 2.5 }
      },
      before
    );
    map.on('mousemove', `${src}-fill`, onBuildingHover);
    map.on('mouseleave', `${src}-fill`, () => {
      tooltip = null;
      if (map) map.getCanvas().style.cursor = '';
    });
    map.on('click', `${src}-fill`, onBuildingClick);
    app.loadedBuildingSources.add(cod);
    app.loadedBuildingSources = new Set(app.loadedBuildingSources);
  }

  function onBuildingHover(e: MapLayerMouseEvent) {
    if (!map) return;
    map.getCanvas().style.cursor = 'pointer';
    const f = e.features?.[0];
    if (!f) return;
    tooltip = {
      x: e.point.x,
      y: e.point.y,
      props: f.properties as unknown as BuildingProps
    };
  }

  function onBuildingClick(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (f) app.selectedBuilding = f.properties as unknown as BuildingProps;
  }

  function onCellHover(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (!f) {
      cellTooltip = null;
      return;
    }
    const p = f.properties as Record<string, unknown>;
    const s = app.cellSeries.get(Number(p.mun))?.get(Number(p.fid));
    cellTooltip = {
      x: e.point.x,
      y: e.point.y,
      share: shareAfter(s?.ys ?? null, app.year ?? 0),
      footprint: footprintShareAfter(s?.ya ?? null, app.year ?? 0),
      known: Number(p.known ?? 0)
    };
  }

  // En serie, no en ráfaga: es trabajo de fondo para tooltips y una descarga
  // simultánea de ~12 JSON saturaría el pool HTTP/1.1, retrasando peticiones
  // interactivas (preview de ortofoto, PERF10).
  let cellSeriesPrefetch: Promise<void> = Promise.resolve();
  const cellSeriesQueued = new Set<number>();
  function queueCellSeries(cod: number) {
    if (app.cellSeries.has(cod) || cellSeriesQueued.has(cod)) return;
    cellSeriesQueued.add(cod);
    cellSeriesPrefetch = cellSeriesPrefetch.then(() =>
      ensureCellSeries(cod)
        .then((sm) => {
          app.cellSeries.set(cod, sm);
          refreshShares();
        })
        .catch(() => {
          cellSeriesQueued.delete(cod);
        })
    );
  }

  /** Precarga las series de celda de los municipios visibles (celdas z≥9). */
  function ensureVisibleCellSeries() {
    if (!map || map.getZoom() < 9) return;
    const b = map.getBounds();
    for (const m of app.municipalityCatalog) {
      const [w, s, e2, n] = m.bbox;
      if (e2 < b.getWest() || w > b.getEast() || n < b.getSouth() || s > b.getNorth()) continue;
      queueCellSeries(m.cod);
    }
  }

  function ensureVisibleBuildings() {
    if (!map) return;
    const z = map.getZoom();
    if (z < 12.8) return; // precarga algo antes del umbral
    // Entre 12.8 y 13.4 solo el municipio seleccionado: cada addSource de
    // buildings lee el índice PMTiles (~16 KB) y un viewport a estas escalas
    // intersecta ~10 municipios; el barrido completo solo aplica cerca del
    // zoom de renderizado (13.5).
    if (app.place) ensureBuildingSource(app.place.cod);
    if (z < 13.4) return;
    const b = map.getBounds();
    for (const m of app.municipalityCatalog) {
      const [w, s, e2, n] = m.bbox;
      if (e2 < b.getWest() || w > b.getEast() || n < b.getSouth() || s > b.getNorth()) continue;
      ensureBuildingSource(m.cod);
    }
  }

  function updateYearDependentPaint() {
    if (!map) return;
    shareCache.clear();
    refreshShares();
    for (const cod of app.loadedBuildingSources) {
      const src = `b-${cod}`;
      if (map.getLayer(`${src}-fill`))
        map.setPaintProperty(`${src}-fill`, 'fill-color', buildingFill(app.year) as never);
    }
  }

  function updateDecadeHighlight() {
    if (!map || !loaded) return;
    const d = app.hoveredDecade;
    const num = d && /^\d{4}$/.test(d) ? Number(d) : null;
    for (const [_src, layer] of [
      ['municipalities', 'munis-hl'],
      ['cells', 'cells-hl']
    ] as const) {
      if (!map.getLayer(layer)) continue;
      map.setFilter(
        layer,
        num !== null
          ? (['==', ['get', 'decade'], num] as never)
          : (['==', ['get', 'decade'], -1] as never)
      );
    }
    for (const cod of app.loadedBuildingSources) {
      const layer = `b-${cod}-hl`;
      if (!map.getLayer(layer)) continue;
      let filter: unknown = ['==', ['get', 'id'], '__none__'];
      if (num !== null) {
        filter = [
          'all',
          ['==', ['get', 'state'], 'VALID'],
          ['>=', ['get', 'year'], num],
          ['<', ['get', 'year'], num + 10]
        ];
      } else if (d === 'pre1900') {
        filter = ['all', ['==', ['get', 'state'], 'VALID'], ['<', ['get', 'year'], 1900]];
      } else if (d === 'none') {
        filter = ['!=', ['get', 'state'], 'VALID'];
      }
      map.setFilter(layer, filter as never);
    }
  }

  function updateSelected() {
    if (!map || !loaded) return;
    const sel = app.selectedBuilding;
    for (const cod of app.loadedBuildingSources) {
      const layer = `b-${cod}-sel`;
      if (map.getLayer(layer))
        map.setFilter(layer, ['==', ['get', 'id'], sel ? sel.id : '__none__'] as never);
    }
  }

  let swipe: { remove?: () => void } | null = null;

  // registro imperativo capa→año de campaña mostrada (no reactivo: solo
  // dedupe de addSource/addLayer, nunca se renderiza)
  const orthoShown: Record<string, number> = {};
  function dropOrthoPreview(id: string) {
    const prevId = `${id}-preview`;
    if (map!.getLayer(prevId)) map!.removeLayer(prevId);
    if (map!.getSource(prevId)) map!.removeSource(prevId);
  }

  function setOrthoLayer(id: string, campaign: import('$lib/domain/ortho').Campaign | null) {
    if (!map) return;
    // Si la capa ya muestra esa campaña, no recrearla: tirar la source
    // descartaría las teselas ya descargadas y reiniciaría la espera.
    if (campaign && orthoShown[id] === campaign.year && map.getLayer(id)) return;
    const prevId = `${id}-preview`;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    // Preview ligado a la campaña: cambiar de campaña invalida la petición en
    // vuelo (seq) y sustituye source+capa — una carga tardía no pinta (stale).
    dropOrthoPreview(id);
    delete orthoShown[id];
    if (campaign) {
      map.addSource(id, rasterSourceDef(campaign));
      const before = map.getLayer('munis-fill')
        ? 'munis-fill'
        : map.getLayer('cells-fill')
          ? 'cells-fill'
          : undefined;
      // Preview first-party (misma campaña, baja resolución) bajo las teselas
      // oficiales: cubre el hueco perceptual si el upstream va lento (PERF10).
      // La request depende del pool HTTP/1.1 same-origin: el prefetch de
      // series de celda va serializado (queueCellSeries) para no bloquearla.
      const prev = previewSourceDef(campaign);
      if (prev) {
        map.addSource(prevId, prev);
        map.addLayer(
          { id: prevId, type: 'raster', source: prevId, paint: { 'raster-fade-duration': 0 } },
          before
        );
      }
      map.addLayer({ id, type: 'raster', source: id }, before);
      orthoShown[id] = campaign.year;
    }
  }

  async function updateOrtho() {
    if (!map || !loaded || !ml) return;
    if (swipe) {
      swipe.remove?.();
      swipe = null;
    }
    // Optimista: al opt-in (clic o deep link) la capa se añade ya y sus
    // teselas cargan en paralelo con la sonda (PERF10). Si la sonda clasifica
    // NOT_COVERED/SERVICE_ERROR la capa se retira y se muestran alternativas.
    const show =
      app.orthoVisible && (app.orthoState === 'AVAILABLE' || app.orthoState === 'UNKNOWN')
        ? app.orthoCampaign
        : null;
    setOrthoLayer('ortho', show);
    const cmp =
      app.orthoCompare && show && app.orthoCompare.year !== show.year ? app.orthoCompare : null;
    setOrthoLayer('ortho-compare', cmp);
    if (cmp) {
      const { SwipeControl } = await import('maplibre-gl-swipe');
      await import('maplibre-gl-swipe/style.css');
      swipe = new SwipeControl({
        orientation: 'vertical',
        position: 50,
        leftLayers: ['ortho', 'ortho-preview'],
        rightLayers: ['ortho-compare', 'ortho-compare-preview']
      }) as unknown as { remove?: () => void };
      map.addControl(swipe as never, 'top-right');
    }
  }

  function updateView() {
    if (!map) return;
    const c = map.getCenter();
    app.view = { lat: c.lat, lon: c.lng, zoom: map.getZoom() };
    onViewChange(app.view);
  }

  onMount(async () => {
    const [maplibregl, { Protocol }] = await preloadMapEngine();
    ml = maplibregl;
    // MapLibre v6 resuelve el worker relativo a import.meta.url del chunk → 404.
    // El worker real se copia a static/vendor/ (scripts/copy-maplibre-worker.mjs).
    maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre-gl-worker.mjs`);
    const protocol = new Protocol();
    (
      maplibregl as unknown as { addProtocol: (n: string, f: typeof protocol.tile) => void }
    ).addProtocol('pmtiles', protocol.tile);

    // Deep link con lugar pero sin vista explícita: el mapa nace ya encuadrado
    // en el municipio (bounds+padding equivalente al fitBounds del efecto) —
    // evita la animación de 1,2 s y la descarga de teselas del overview (PERF4/5).
    const initialFromPlace = !!app.place && !app.viewFromUrl;
    map = new maplibregl.Map({
      container: container!,
      ...(initialFromPlace
        ? {
            bounds: [
              [app.place!.bbox[0], app.place!.bbox[1]],
              [app.place!.bbox[2], app.place!.bbox[3]]
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 40 }
          }
        : {}),
      style: {
        version: 8,
        // Glyphs auto-hospedados (Open Sans Semibold, openmaptiles/fonts):
        // tests deterministas (VR4) y producción sin dependencia de demotiles.
        glyphs: `${import.meta.env.BASE_URL}fonts/glyphs/{fontstack}/{range}.pbf`,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': COLORS.bg } }]
      },
      center: [app.view.lon, app.view.lat],
      zoom: app.view.zoom,
      minZoom: 7,
      maxZoom: 17,
      maxBounds: [
        [-3.75, 42.7],
        [-2.2, 43.75]
      ],
      attributionControl: { compact: true },
      // techo explícito de caché de teselas (G1-PERFORMANCE §4.3: heap ≤60/40 MB)
      maxTileCacheSize: 384,
      maxTileCacheZoomLevels: 4
    });
    constructorFitCod = initialFromPlace ? (app.place?.cod ?? null) : null;
    map.getCanvas().setAttribute('aria-label', t('a11y.map.canvas.main'));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      const m = map!;
      const base = import.meta.env.BASE_URL;
      if (!m.hasImage('noyear-hatch')) m.addImage('noyear-hatch', hatchImage());

      function addMuniLayers() {
        if (m.getSource('municipalities')) return;
        m.addSource('municipalities', {
          type: 'vector',
          url: `pmtiles://${base}data/municipalities.pmtiles`,
          promoteId: 'fid'
        });
        m.addLayer({
          id: 'munis-fill',
          type: 'fill',
          source: 'municipalities',
          'source-layer': 'municipalities',
          maxzoom: 9,
          paint: { 'fill-color': SHARE_PAINT as never, 'fill-opacity': 0.85 }
        });
        m.addLayer({
          id: 'munis-hl',
          type: 'line',
          source: 'municipalities',
          'source-layer': 'municipalities',
          maxzoom: 9,
          filter: ['==', ['get', 'decade'], -1],
          paint: { 'line-color': '#18181b', 'line-width': 2 }
        });
        m.addLayer({
          id: 'munis-line',
          type: 'line',
          source: 'municipalities',
          'source-layer': 'municipalities',
          maxzoom: 9,
          paint: {
            'line-color': COLORS.muniLine,
            'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 9, 1.2]
          }
        });
        m.addLayer({
          id: 'munis-label',
          type: 'symbol',
          source: 'municipalities',
          'source-layer': 'municipalities',
          maxzoom: 9,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 9, 12],
            'text-font': ['Open Sans Semibold'],
            'text-allow-overlap': false,
            'symbol-placement': 'point'
          },
          paint: {
            'text-color': '#3a3835',
            'text-halo-color': 'rgba(255,255,255,0.85)',
            'text-halo-width': 1.2
          }
        });
      }

      function addCellLayers() {
        if (m.getSource('cells')) return;
        m.addSource('cells', {
          type: 'vector',
          url: `pmtiles://${base}data/cells.pmtiles`,
          promoteId: 'fid'
        });
        m.addLayer({
          id: 'cells-fill',
          type: 'fill',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          paint: {
            'fill-color': SHARE_PAINT as never,
            'fill-opacity': 0.75
          }
        });
        m.addLayer({
          id: 'cells-line',
          type: 'line',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          paint: { 'line-color': 'rgba(255,255,255,0.55)', 'line-width': 0.5 }
        });
        m.addLayer({
          id: 'cells-smalln',
          type: 'line',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          filter: ['<', ['get', 'known'], 15],
          paint: {
            'line-color': '#55524a',
            'line-width': 0.8,
            'line-dasharray': [2, 2]
          }
        });
        m.addLayer({
          id: 'cells-hl',
          type: 'line',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          filter: ['==', ['get', 'decade'], -1],
          paint: { 'line-color': '#18181b', 'line-width': 1.6 }
        });
        m.on('mousemove', 'cells-fill', onCellHover);
        m.on('mouseleave', 'cells-fill', () => {
          cellTooltip = null;
        });
      }

      // Fuentes PMTiles solo en su dominio de zoom: cada addSource dispara la
      // lectura del índice (~92 KB municipios / ~40 KB celdas), innecesaria
      // fuera del rango de capas que la usan.
      function ensureScaleSources() {
        const z = m.getZoom();
        if (z < 9) addMuniLayers();
        if (z >= 9) addCellLayers();
        if (m.getLayer('sel-muni-outline')) m.moveLayer('sel-muni-outline');
      }
      ensureScaleSources();

      // Contorno del municipio seleccionado desde el GeoJSON ligero ya servido:
      // mantiene contexto municipal a zoom de celdas sin el índice PMTiles.
      m.addSource('sel-muni', {
        type: 'geojson',
        data: `${base}data/municipalities-light.geojson`
      });
      m.addLayer({
        id: 'sel-muni-outline',
        type: 'line',
        source: 'sel-muni',
        filter: ['==', ['get', 'cod'], app.place?.cod ?? -1] as never,
        paint: { 'line-color': '#3a3835', 'line-width': 1.8 }
      });

      m.on('moveend', () => {
        level = scaleLevel(m.getZoom());
        ensureScaleSources();
        ensureVisibleBuildings();
        ensureVisibleCellSeries();
        refreshShares();
        updateView();
      });
      m.on('data', (e) => {
        const src = (e as unknown as { sourceId?: string }).sourceId;
        if (src === 'cells' || src === 'municipalities') refreshShares();
      });
      m.on('error', (e) => {
        const src = (e as unknown as { sourceId?: string }).sourceId;
        if (src && (src === 'cells' || src === 'municipalities' || src.startsWith('b-'))) {
          app.pmtilesError = true;
        }
      });
      m.on('click', (e) => {
        // clic en vacío deselecciona
        if (!e.defaultPrevented) app.selectedBuilding = null;
      });

      loaded = true;
      level = scaleLevel(m.getZoom());
      refreshShares();
      ensureVisibleBuildings();
      // Las series por celda alimentan tooltip/share, no el primer render:
      // cargarlas en 'idle' para no competir con las teselas (PERF4/7).
      m.once('idle', () => ensureVisibleCellSeries());
      (window as unknown as Record<string, unknown>).__mjtMap = m;
    });
  });

  // reactivos
  $effect(() => {
    void app.year;
    if (loaded) updateYearDependentPaint();
  });
  $effect(() => {
    void app.hoveredDecade;
    if (loaded) updateDecadeHighlight();
  });
  $effect(() => {
    void app.selectedBuilding;
    if (loaded) updateSelected();
  });
  $effect(() => {
    void app.orthoVisible;
    void app.orthoCampaign;
    void app.orthoState;
    void app.orthoCompare;
    if (loaded) updateOrtho();
  });
  // el municipio seleccionado enmarca la vista al entrar en RESULT,
  // salvo que la URL ya traiga una vista explícita (deep link) o el
  // constructor ya encuadrara ese municipio por bounds (deep link con
  // lugar sin vista). Un cambio de lugar posterior sí debe reencuadrar.
  let constructorFitCod: number | null = null;
  $effect(() => {
    const p = app.place;
    if (loaded && map && p && map.getLayer('sel-muni-outline')) {
      map.setFilter('sel-muni-outline', ['==', ['get', 'cod'], p.cod] as never);
    }
    if (loaded && map && p && !app.viewFromUrl && constructorFitCod !== p.cod) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // untrack: fitBounds dispara moveend de forma síncrona con duration:0;
      // sin untrack, las lecturas de app.view en updateView/syncUrl quedarían
      // registradas como dependencias de este efecto → ciclo de invalidación.
      untrack(() =>
        map!.fitBounds(
          [
            [p.bbox[0], p.bbox[1]],
            [p.bbox[2], p.bbox[3]]
          ],
          { padding: 40, duration: reduce ? 0 : 1200 }
        )
      );
    }
  });

  onDestroy(() => {
    map?.remove();
    map = null;
  });

  function buildingText(p: BuildingProps): string {
    if (p.state === 'VALID' && p.year !== null) return t('building.year', { year: p.year });
    if (p.state === 'SUSPICIOUS' || p.state === 'INVALID')
      return t('building.suspicious', { raw_value: p.year ?? '—' });
    return t('building.unknown');
  }
</script>

<div class="mapwrap" bind:this={container}>
  {#if tooltip}
    <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">
      {buildingText(tooltip.props)}
    </div>
  {/if}
  {#if cellTooltip}
    <div class="tooltip cell-tip" style="left:{cellTooltip.x + 12}px; top:{cellTooltip.y + 12}px">
      {#if cellTooltip.share !== null}
        <p class="tip-main">
          {t('map.tooltip.cell.share', {
            share: fmtPct(cellTooltip.share * 100),
            selected_year: app.year ?? ''
          })}
        </p>
        <p class="tip-sub">
          {t('map.tooltip.cell.denominator', { known: fmt(cellTooltip.known) })}
        </p>
        {#if cellTooltip.footprint !== null}
          <p class="tip-sub">
            {t('map.tooltip.cell.footprint', {
              share: fmtPct(cellTooltip.footprint * 100),
              selected_year: app.year ?? ''
            })}
          </p>
        {/if}
        {#if cellTooltip.known < CELL_SMALL_DENOMINATOR}
          <p class="tip-warn">{t('map.legend.cells.small_n', { n: cellTooltip.known })}</p>
        {/if}
      {:else if cellTooltip.known === 0}
        <p class="tip-main">{t('map.tooltip.cell.no_known')}</p>
      {:else}
        <p class="tip-sub">
          {t('map.tooltip.cell.denominator', { known: fmt(cellTooltip.known) })}
        </p>
      {/if}
    </div>
  {/if}
  {#if app.pmtilesError}
    <div class="maperror" role="alert">{t('error.pmtiles')}</div>
  {/if}
  <div class="legend" aria-live="polite">
    {#if level === 'BIZKAIA'}
      <p class="legend-title">{t('map.legend.munis', { selected_year: app.year ?? '' })}</p>
    {:else if level === 'CELDA'}
      <p class="legend-title">{t('map.legend.cells', { selected_year: app.year ?? '' })}</p>
    {:else}
      <p class="legend-title">{t('map.legend.title')}</p>
      <span
        ><i style="background:{COLORS.before}"></i>{t('map.legend.before', {
          selected_year: app.year ?? ''
        })}</span
      >
      <span
        ><i style="background:{COLORS.after}"></i>{t('map.legend.after', {
          selected_year: app.year ?? ''
        })}</span
      >
      <span><i class="hatch"></i>{t('map.legend.noyear')}</span>
    {/if}
    {#if level !== 'EDIFICIO'}
      <div class="ramp">
        <i style="background:{COLORS.ramp[0]}"></i><i style="background:{COLORS.ramp[1]}"></i><i
          style="background:{COLORS.ramp[2]}"
        ></i><i style="background:{COLORS.ramp[3]}"></i><i style="background:{COLORS.ramp[4]}"></i>
      </div>
      <p class="ramp-label">
        <span>{t('map.legend.cells.less')}</span><span>{t('map.legend.cells.more')}</span>
      </p>
    {/if}
    {#if app.place}
      <p class="universe">{t('map.visible_universe', { municipality: app.place.name })}</p>
    {/if}
  </div>
</div>

<style>
  .mapwrap {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 340px;
  }
  .mapwrap :global(.maplibregl-canvas) {
    outline-offset: -2px;
  }
  .tooltip {
    position: absolute;
    z-index: 20;
    background: #fff;
    border: 1px solid #d6d3cb;
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    max-width: 240px;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .cell-tip p {
    margin: 0;
  }
  .tip-main {
    color: #1c1a17;
  }
  .tip-sub {
    color: #55534b;
    font-size: 0.75rem;
    margin-top: 0.2rem !important;
  }
  .tip-warn {
    color: #6b4d13;
    font-size: 0.72rem;
    border-top: 1px dashed #d9a441;
    margin-top: 0.35rem !important;
    padding-top: 0.3rem;
  }
  .maperror {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    background: #fff3f0;
    border: 1px solid #c63b4f;
    color: #7a1f2e;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  .legend {
    position: absolute;
    left: 0.75rem;
    bottom: 0.75rem;
    z-index: 10;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid #d6d3cb;
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.75rem;
    max-width: 250px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .legend-title {
    margin: 0;
    font-weight: 600;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend i {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex: none;
  }
  .legend i.hatch {
    background: repeating-linear-gradient(45deg, #d9d8d2, #d9d8d2 2px, #7c7c74 2px, #7c7c74 3px);
    border: 1px dashed #7c7c74;
  }
  .ramp {
    display: flex;
    gap: 2px;
    margin-top: 0.2rem;
  }
  .ramp i {
    flex: 1;
    height: 10px;
  }
  .ramp-label {
    display: flex;
    justify-content: space-between;
    margin: 0;
    color: #6b6b63;
  }
  .universe {
    margin: 0.3rem 0 0;
    font-size: 0.7rem;
    color: #6b6b63;
    border-top: 1px solid #e3e1da;
    padding-top: 0.3rem;
  }
</style>
