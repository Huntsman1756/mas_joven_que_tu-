<script lang="ts">
  import { onMount, onDestroy, untrack, tick, type Snippet } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { app } from '$lib/state/app.svelte';
  import { scaleLevel } from '$lib/domain/scale';
  import {
    shareAfter,
    cellDataState,
    shareAfterParsed,
    shareUntilParsed,
    countAfterParsed,
    countUntilParsed,
    footprintShareAfter,
    parseYs
  } from '$lib/domain/cells';
  import { rasterSourceDef, previewSourceDef } from '$lib/domain/ortho';
  import { histMapSourceDef } from '$lib/domain/histmap';
  import { preloadMapEngine } from '$lib/map/engine';
  import { ensureCellSeries, loadBuildingIndex } from '$lib/domain/catalog';
  import { probeOrtho } from '$lib/domain/ortho-probe.svelte';
  import { distM } from '$lib/domain/sincebirth';
  import CellData from '$lib/map/CellData.svelte';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';
  import type { BuildingProps } from '$lib/domain/types';
  import type * as maplibregl from 'maplibre-gl';
  import type { Map as MLMap, MapLayerMouseEvent } from 'maplibre-gl';
  import type { Feature as GeoFeature, Geometry as GeoGeometry } from 'geojson';
  import { PALETTE } from '$lib/palette';
  import { mapSync } from '$lib/map/sync';

  let {
    onViewChange = () => {},
    overlay
  }: {
    onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void;
    /** Capa superpuesta limitada al lienzo del mapa (p.ej. el comparador
        «swipe»). Vive DENTRO de .mapwrap para heredar su caja exacta:
        si se monta sobre .mapcell, en móvil también cubre la leyenda en
        flujo que hay debajo del canvas (solape G16c). */
    overlay?: Snippet;
  } = $props();

  let container = $state<HTMLDivElement | null>(null);
  let map: MLMap | null = null;
  let ml: typeof maplibregl | null = null;
  let level = $state(scaleLevel(app.view.zoom));
  let loaded = $state(false);
  let tooltip = $state<{ x: number; y: number; props: BuildingProps } | null>(null);
  let cellTooltip = $state<
    ({ x: number; y: number } & ReturnType<typeof cellDetailFromProps>) | null
  >(null);

  // Paleta G5 (lib/palette.ts): azul tinta «antes» / bermellón «después»,
  // rampa cálida para cuotas — más saturación que G4, mismo contrato visual.
  const COLORS = {
    bg: PALETTE.paper,
    before: PALETTE.before,
    after: PALETTE.after,
    afterBoth: PALETTE.afterBoth, // DOS AÑOS: posterior a ambos (neutro oscuro)
    noyear: PALETTE.noyear,
    noyearStroke: PALETTE.noyearStroke,
    ramp: PALETTE.ramp,
    neutral: PALETTE.paper2,
    line: '#ffffff',
    muniLine: PALETTE.muniLine
  };

  // G11.2: mapa base oficial de referencia (geoEuskadi KARTOGRAFIA_CAS_EUS):
  // marco + cubierta terrestre + hidrografía + núcleos urbanos + red viaria.
  // El export con `layers=show:` devuelve PNG transparente por tesela
  // ({bbox-epsg-3857}); contenido verificado en evidence/g11/.
  const REFBASE_TILE =
    'https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/KARTOGRAFIA_CAS_EUS/MapServer/export' +
    '?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256' +
    '&format=png32&transparent=true&layers=show:10,12,41,74,63&f=image';

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

  /** DOS AÑOS (gate §5): ≤earlier azul, (earlier,later] carmesí, >later neutro
   *  oscuro, non-VALID sin año. Mismo universo CURRENT_BUILDING_STOCK. */
  function buildingFillCompare(a: number, b: number): unknown {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return [
      'case',
      ['!=', ['get', 'state'], 'VALID'],
      COLORS.noyear,
      ['<=', ['get', 'year'], lo],
      COLORS.before,
      ['<=', ['get', 'year'], hi],
      COLORS.after,
      COLORS.afterBoth
    ];
  }

  function currentBuildingFill(): unknown {
    return app.compareYear !== null && app.year !== null
      ? buildingFillCompare(app.year, app.compareYear)
      : buildingFill(app.year);
  }

  // G10-13: las categorías no dependen solo del tono (rojo/azul ≈ 1,1:1).
  // La opacidad añade un canal de luminancia: «antes» lavado, «después»
  // saturado; en DOS AÑOS el posterior a ambos queda oscuro-intermedio.
  // Non-VALID queda crema claro bajo la capa hatch (estado propio).
  function buildingOpacity(): unknown {
    if (app.compareYear !== null && app.year !== null) {
      const lo = Math.min(app.year, app.compareYear);
      const hi = Math.max(app.year, app.compareYear);
      return [
        'case',
        ['!=', ['get', 'state'], 'VALID'],
        0.55,
        ['<=', ['get', 'year'], lo],
        0.45,
        ['<=', ['get', 'year'], hi],
        0.95,
        0.8
      ];
    }
    const y = app.year ?? 0;
    return ['case', ['!=', ['get', 'state'], 'VALID'], 0.55, ['>', ['get', 'year'], y], 0.95, 0.45];
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
        if (app.cellSeries.has(mun)) {
          // La descarga del municipio terminó y el registro no existe:
          // ausencia declarada (dataState «missing»), no carga indefinida.
          parsedSeries.set(pk, null);
          return null;
        }
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
    // Play (G2): celdas y municipios proyectan su serie canónica hasta
    // playYear (cuota del stock actual constatada hasta P). La serie
    // municipal ya viaja en la tesela — si la vista provincial no
    // respondía al cabezal, Evolución parecía no hacer nada.
    const p = app.playYear;
    const key = p === null ? `a|${src}|${fid}|${app.year}` : `c|${src}|${fid}|${p}`;
    if (!shareCache.has(key)) {
      const m = parsedFor(src, props, fid);
      // La serie puede estar en vuelo: parsedFor devuelve null SIN asentar
      // en parsedSeries. No cachear ese null aquí — envenenaría la celda
      // hasta el próximo cambio de año y el mapa inicial queda vacío.
      if (m === null && !parsedSeries.has(`${src}|${fid}`)) return null;
      shareCache.set(key, p === null ? shareAfterParsed(m, app.year ?? 0) : shareUntilParsed(m, p));
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
        // El denominador de la tesela confirma ausencia. share=null también
        // ocurre con la serie en vuelo o fallida y nunca basta para rayar.
        map.setFeatureState(
          { source: src, sourceLayer: src, id: fid },
          {
            share,
            nodata: cellDataState(Number(f.properties.known), share) === 'no-known'
          }
        );
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
          'fill-color': currentBuildingFill() as never,
          'fill-opacity': buildingOpacity() as never
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
        paint: { 'fill-color': '#182631', 'fill-opacity': 0.55 }
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
        paint: { 'line-color': '#182631', 'line-width': 2.5 }
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
    applyBuildingPlayFilters(); // una fuente nueva en pleno Play hereda el cabezal
    applyEvidenceVisibility(); // y la política de imagen histórica (GV4)
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
    if (f) {
      app.selectedCell = null;
      app.cellInspectNone = false;
      app.selectedBuilding = f.properties as unknown as BuildingProps;
    }
  }

  // ── G3-A MI EDIFICIO: identidad Catastro fail-closed ─────────────────
  // El punto oficial del portal NORA se compara con los polígonos de la
  // misma fuente PMTiles que ve el usuario. 0→NORA_ONLY, 1→EXACT,
  // >1→MULTIPLE (gate §3: nunca se colapsa MULTIPLE→EXACT).
  function ringContains(pt: [number, number], ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }

  function geomContains(pt: [number, number], g: GeoGeometry): boolean {
    if (g.type === 'Polygon') {
      const c = g.coordinates as number[][][];
      return ringContains(pt, c[0]) && !c.slice(1).some((r) => ringContains(pt, r));
    }
    if (g.type === 'MultiPolygon') {
      return (g.coordinates as number[][][][]).some(
        (poly) => ringContains(pt, poly[0]) && !poly.slice(1).some((r) => ringContains(pt, r))
      );
    }
    return false;
  }

  function geomCenter(g: GeoGeometry): [number, number] | null {
    const pts: number[][] = [];
    if (g.type === 'Polygon') pts.push(...(g.coordinates[0] as number[][]));
    else if (g.type === 'MultiPolygon')
      pts.push(...(g.coordinates as number[][][][]).flatMap((p) => p[0]));
    if (pts.length === 0) return null;
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const [x, y] of pts) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
    return [(w + e) / 2, (s + n) / 2];
  }

  function featureJSON(f: unknown): GeoFeature | null {
    const fj = (f as { toJSON?: () => GeoFeature }).toJSON?.();
    return fj ?? (f as GeoFeature);
  }

  function onceIdle(timeoutMs: number): Promise<void> {
    return new Promise((res) => {
      const t = setTimeout(res, timeoutMs);
      map!.once('idle', () => {
        clearTimeout(t);
        res();
      });
    });
  }

  let identityToken = 0;
  async function resolveIdentityPoint(p: { lon: number; lat: number; mun: number }) {
    if (!map) return;
    const tok = ++identityToken;
    ensureBuildingSource(p.mun);
    const src = `b-${p.mun}`;
    // El punto oficial del portal manda: salto a zoom de edificios para
    // materializar la tesela que lo contiene (acción explícita del usuario).
    map.jumpTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 15.5) });
    await onceIdle(6000);
    if (tok !== identityToken) return; // stale: otra resolución en curso
    const feats = map.querySourceFeatures(src, { sourceLayer: 'buildings' });
    const seen: string[] = [];
    const cands: BuildingProps[] = [];
    for (const f of feats) {
      const j = featureJSON(f);
      const props = (j?.properties ?? null) as BuildingProps | null;
      if (!props?.id || seen.includes(props.id)) continue;
      if (j?.geometry && geomContains([p.lon, p.lat], j.geometry)) {
        seen.push(props.id);
        cands.push(props);
      }
    }
    app.identityResult = {
      identity: cands.length === 1 ? 'EXACT' : cands.length > 1 ? 'MULTIPLE' : 'NORA_ONLY',
      candidates: cands
    };
    app.identityPoint = null;
  }

  /** Deep link `building=` (G4 BUG-01/GU2): localización determinista por
   *  índice id→centroide (misma fuente que los pmtiles), nunca depende de
   *  que la cámara compartida contenga el edificio. Tras el salto se
   *  escanean las teselas por id para las props completas. Si el índice no
   *  está disponible se escanea la vista actual; y si nada lo encuentra el
   *  id se consume con aviso explícito (`buildingRestoreFailed`) — jamás
   *  desaparece en silencio. El id se conserva en `pendingBuildingId` hasta
   *  resolver: si se consumiera al entrar, syncUrl borraría `building=` de
   *  la URL durante el restore en vuelo. */
  let restoringId: string | null = null;
  async function restorePendingBuilding() {
    const id = app.pendingBuildingId;
    if (!id || !map || !app.place || restoringId === id) return;
    restoringId = id;
    app.buildingRestoreFailed = null; // nuevo intento: el aviso viejo no aplica
    const cod = app.place.cod;
    const found = () => {
      const feats = map!.querySourceFeatures(`b-${cod}`, { sourceLayer: 'buildings' });
      for (const f of feats) {
        const j = featureJSON(f);
        if (String(j?.properties?.id ?? '') === id) {
          app.selectedBuilding = (j!.properties ?? null) as BuildingProps;
          const c = j!.geometry ? geomCenter(j!.geometry) : null;
          if (c) map!.jumpTo({ center: c, zoom: Math.max(map!.getZoom(), 15.5) });
          return true;
        }
      }
      return false;
    };
    try {
      ensureBuildingSource(cod);
      let indexed: [number, number] | undefined;
      try {
        indexed = (await loadBuildingIndex(cod))[id];
      } catch {
        indexed = undefined; // índice inalcanzable: queda el escaneo de vista
      }
      if (indexed) {
        map.jumpTo({ center: indexed, zoom: Math.max(map.getZoom(), 15.5) });
        await onceIdle(8000);
        // el índice dice que existe: si la tesela no lo sirvió (drop-densest,
        // aún cargando), también es un fallo explícito — nunca silencioso
        if (!found()) app.buildingRestoreFailed = id;
      } else {
        if (map.getZoom() < 13.5) map.jumpTo({ zoom: 15 });
        await onceIdle(8000);
        if (!found()) app.buildingRestoreFailed = id;
      }
    } finally {
      app.pendingBuildingId = null;
      restoringId = null;
    }
  }

  /** Mismo detalle para tooltip hover y selección persistente (clic/tap/teclado).
   *  `after`/`until` son numeradores exactos sobre la misma serie que las
   *  cuotas; `center` permite a la ficha ofrecer «acercar a edificios». */
  function cellDetailFromProps(p: Record<string, unknown>, center: [number, number] | null = null) {
    const mun = Number(p.mun);
    const fid = Number(p.fid);
    const m = parsedFor('cells', p, fid);
    return {
      mun,
      fid,
      known: Number(p.known ?? 0),
      dataState: cellDataState(
        Number(p.known),
        shareAfterParsed(m, app.year ?? 0),
        cellSeriesErrors.has(mun),
        app.cellSeries.has(mun)
      ),
      share: shareAfterParsed(m, app.year ?? 0),
      after: countAfterParsed(m, app.year ?? 0),
      until: app.playYear !== null ? countUntilParsed(m, app.playYear) : null,
      footprint: footprintShareAfter(app.cellSeries.get(mun)?.get(fid)?.ya ?? null, app.year ?? 0),
      center
    };
  }

  function onCellHover(e: MapLayerMouseEvent) {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) {
      cellTooltip = null;
      return;
    }
    const f = e.features?.[0];
    if (!f) {
      cellTooltip = null;
      return;
    }
    const d = cellDetailFromProps(f.properties as Record<string, unknown>);
    cellTooltip = { x: e.point.x, y: e.point.y, ...d };
  }

  function onCellClick(e: MapLayerMouseEvent) {
    cellTooltip = null;
    const f = e.features?.[0];
    if (!f) return;
    selectCell(f.properties as Record<string, unknown>, [e.lngLat.lng, e.lngLat.lat]);
  }

  function selectCell(p: Record<string, unknown>, center: [number, number] | null = null) {
    app.selectedBuilding = null;
    app.selectedCell = cellDetailFromProps(p, center);
    app.cellInspectNone = false;
    const mun = Number(p.mun);
    if (!app.cellSeries.has(mun)) queueCellSeries(mun);
  }

  function clearCellSelection() {
    app.selectedCell = null;
    app.cellInspectNone = false;
  }

  /** Recalcula share/footprint de la celda seleccionada (cambio de año o llegada de serie).
   *  untrack: se invoca desde efectos; leer selectedCell como dependencia y
   *  escribirlo a continuación produciría un ciclo de efectos infinito. */
  function refreshSelectedCell() {
    const c = untrack(() => app.selectedCell);
    if (!c) return;
    const s = app.cellSeries.get(c.mun)?.get(c.fid);
    const m = s?.ys ? parseYs(s.ys) : null;
    app.selectedCell = {
      ...c,
      share: shareAfter(s?.ys ?? null, app.year ?? 0),
      dataState: cellDataState(
        c.known,
        shareAfter(s?.ys ?? null, app.year ?? 0),
        cellSeriesErrors.has(c.mun),
        app.cellSeries.has(c.mun)
      ),
      after: countAfterParsed(m, app.year ?? 0),
      until: app.playYear !== null ? countUntilParsed(m, app.playYear) : null,
      footprint: footprintShareAfter(s?.ya ?? null, app.year ?? 0)
    };
  }

  /** Sonda de teclado: inspecciona la celda en el centro del mapa. */
  async function inspectCenterCell() {
    if (!map || !map.getLayer('cells-fill')) return;
    const cv = map.getCanvas();
    const cx = cv.clientWidth / 2;
    const cy = cv.clientHeight / 2;
    const feats = map.queryRenderedFeatures(
      [
        [cx - 4, cy - 4],
        [cx + 4, cy + 4]
      ],
      { layers: ['cells-fill'] }
    );
    const f = feats?.[0];
    if (f) {
      const ctr = map.getCenter();
      selectCell(f.properties as Record<string, unknown>, [ctr.lng, ctr.lat]);
    } else {
      app.selectedCell = null;
      app.cellInspectNone = true;
    }
    await tick();
    // PERF4-R: CellDetail es lazy — el nodo puede tardar unos ticks en
    // existir. Se espera al nodo (no a un tiempo fijo) y se enfoca igual
    // que antes; si el chunk falla, queda como no-op silencioso.
    for (let i = 0; i < 40 && !document.getElementById('cell-detail'); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    document.getElementById('cell-detail')?.focus();
  }

  function updateCellSelFilter() {
    if (!map || !map.getLayer('cells-selected')) return;
    const c = app.selectedCell;
    map.setFilter(
      'cells-selected',
      c
        ? (['all', ['==', ['get', 'fid'], c.fid], ['==', ['get', 'mun'], c.mun]] as never)
        : (['==', ['get', 'fid'], -1] as never)
    );
  }

  // En serie, no en ráfaga: es trabajo de fondo para tooltips y una descarga
  // simultánea de ~12 JSON saturaría el pool HTTP/1.1, retrasando peticiones
  // interactivas (preview de ortofoto, PERF10).
  let cellSeriesPrefetch: Promise<void> = Promise.resolve();
  const cellSeriesQueued = new SvelteSet<number>();
  const cellSeriesErrors = new SvelteSet<number>();
  function queueCellSeries(cod: number) {
    if (app.cellSeries.has(cod) || cellSeriesQueued.has(cod) || cellSeriesErrors.has(cod)) return;
    cellSeriesQueued.add(cod);
    cellSeriesPrefetch = cellSeriesPrefetch.then(() =>
      ensureCellSeries(cod)
        .then((sm) => {
          app.cellSeries.set(cod, sm);
          refreshShares();
          refreshSelectedCell();
        })
        .catch(() => {
          cellSeriesQueued.delete(cod);
          cellSeriesErrors.add(cod);
          refreshSelectedCell();
        })
    );
  }

  function retryCellSeries() {
    const failed = [...cellSeriesErrors];
    cellSeriesErrors.clear();
    for (const cod of failed) queueCellSeries(cod);
    refreshSelectedCell();
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
    refreshSelectedCell();
    for (const cod of app.loadedBuildingSources) {
      const src = `b-${cod}`;
      if (map.getLayer(`${src}-fill`)) {
        map.setPaintProperty(`${src}-fill`, 'fill-color', currentBuildingFill() as never);
        map.setPaintProperty(`${src}-fill`, 'fill-opacity', buildingOpacity() as never);
      }
    }
  }

  /** Condición temporal del Play para capas de edificios: VALID con
   *  Ano_Constr > playYear se ocultan; UNKNOWN/SUSPICIOUS/INVALID permanecen
   *  visibles fuera de la ordenación temporal (gate T4/SEM). */
  function playCond(): unknown[] {
    return app.playYear === null
      ? []
      : [['any', ['!=', ['get', 'state'], 'VALID'], ['<=', ['get', 'year'], app.playYear]]];
  }

  function applyBuildingPlayFilters() {
    if (!map) return;
    for (const cod of app.loadedBuildingSources) {
      const src = `b-${cod}`;
      for (const suffix of ['fill', 'line']) {
        const layer = `${src}-${suffix}`;
        if (map.getLayer(layer)) {
          const conds = playCond();
          map.setFilter(layer, conds.length ? (conds[0] as never) : null);
        }
      }
    }
    updateDecadeHighlight(); // -hl se recompone incluyendo la condición temporal
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
          ['<', ['get', 'year'], num + 10],
          ...playCond()
        ];
      } else if (d === 'pre1900') {
        filter = [
          'all',
          ['==', ['get', 'state'], 'VALID'],
          ['<', ['get', 'year'], 1900],
          ...playCond()
        ];
      } else if (d === 'none') {
        filter = ['!=', ['get', 'state'], 'VALID']; // UNKNOWN: fuera del orden temporal
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

  // registro imperativo capa→año de campaña mostrada (no reactivo: solo
  // dedupe de addSource/addLayer, nunca se renderiza)
  const orthoShown: Record<string, number> = {};
  function dropOrthoPreview(id: string) {
    const prevId = `${id}-preview`;
    if (map!.getLayer(prevId)) map!.removeLayer(prevId);
    if (map!.getSource(prevId)) map!.removeSource(prevId);
  }

  /**
   * G5 GV4 — en modos de evidencia (foto aérea / mapa 1923–25) la imagen
   * va ENCIMA de los fills de datos y estos se apagan: nada de color
   * semántico pintado sobre la evidencia visual. Queda el contorno del
   * municipio seleccionado (orientación) y, solo si el usuario lo pide,
   * el contorno fino de los edificios actuales (`app.overlayBuildings`).
   */
  const EVIDENCE_HIDDEN = [
    'munis-fill',
    'munis-hl',
    'cells-fill',
    'cells-nodata',
    'cells-smalln',
    'cells-hl',
    'cells-selected',
    'munis-label',
    'munis-line',
    'refbase',
    'munis-label-detail'
  ] as const;
  let evidenceOn = $state(false);

  function setVis(layer: string, on: boolean) {
    if (map?.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', on ? 'visible' : 'none');
  }

  function applyEvidenceVisibility() {
    if (!map || !loaded) return;
    const raster = !!(map.getLayer('ortho') || map.getLayer('histmap'));
    evidenceOn = raster;
    // G11.1: la leyenda ocupa flujo en móvil — al (des)montarla cambia la
    // altura del lienzo y MapLibre no se redimensiona solo.
    requestAnimationFrame(() => map?.resize());
    for (const l of EVIDENCE_HIDDEN) setVis(l, !raster);
    for (const cod of app.loadedBuildingSources) {
      const src = `b-${cod}`;
      setVis(`${src}-fill`, !raster);
      setVis(`${src}-noyear`, !raster);
      // contorno opt-in sobre la imagen; en vista de datos siempre visible
      setVis(`${src}-line`, !raster || app.overlayBuildings);
      setVis(`${src}-hl`, !raster || app.overlayBuildings);
      setVis(`${src}-sel`, !raster || app.overlayBuildings);
      if (raster && app.overlayBuildings) {
        // las líneas se añadieron bajo las celdas: subirlas sobre el raster
        for (const s of ['line', 'hl', 'sel'])
          if (map.getLayer(`${src}-${s}`)) map.moveLayer(`${src}-${s}`);
      }
    }
    // el contorno municipal seleccionado siempre por encima de la imagen
    if (map.getLayer('sel-muni-outline')) map.moveLayer('sel-muni-outline');
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
      // La imagen se añade ENCIMA de los fills de datos (GV4): sin `before`.
      // Preview first-party (misma campaña, baja resolución) bajo las teselas
      // oficiales: cubre el hueco perceptual si el upstream va lento (PERF10).
      const prev = previewSourceDef(campaign);
      if (prev) {
        map.addSource(prevId, prev);
        map.addLayer({
          id: prevId,
          type: 'raster',
          source: prevId,
          paint: { 'raster-fade-duration': 0 }
        });
      }
      map.addLayer({ id, type: 'raster', source: id });
      orthoShown[id] = campaign.year;
    }
  }

  function updateOrtho() {
    if (!map || !loaded || !ml) return;
    // Optimista: al opt-in (clic o deep link) la capa se añade ya y sus
    // teselas cargan en paralelo con la sonda (PERF10). Si la sonda clasifica
    // NOT_COVERED/SERVICE_ERROR la capa se retira y se muestran alternativas.
    const active =
      app.orthoVisible && (app.orthoState === 'AVAILABLE' || app.orthoState === 'UNKNOWN')
        ? app.orthoCampaign
        : null;
    // En lienzo único (pantalla estrecha con comparación) `photoView` elige
    // qué campaña se ve; el panel B corre a cargo de CompareMap (desktop).
    const shown = active && app.photoView === 'b' && app.orthoCompare ? app.orthoCompare : active;
    setOrthoLayer('ortho', shown);
    applyEvidenceVisibility();
  }

  // G3-C/G5-F: mapa histórico 1923–25 — raster encima de los fills de datos
  // (standalone, sin overlay por defecto). Optimista: la capa se añade al
  // opt-in y se retira si la sonda declara UNAVAILABLE.
  function setHistMapLayer(on: boolean) {
    if (!map) return;
    const id = 'histmap';
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    if (on) {
      map.addSource(id, histMapSourceDef());
      map.addLayer({ id, type: 'raster', source: id });
    }
    applyEvidenceVisibility();
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
    // G12: la ficha de zona ofrece «acercar a los edificios» — 14.2 supera
    // el umbral EDIFICIO (13.5); sin reduced-motion se hace instantáneo.
    app.mapFlyTo = (center) => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      map?.easeTo({
        center,
        zoom: Math.max(map.getZoom(), 14.2),
        duration: reduce ? 0 : 900
      });
    };

    map.on('load', () => {
      const m = map!;
      const base = import.meta.env.BASE_URL;
      if (!m.hasImage('noyear-hatch')) m.addImage('noyear-hatch', hatchImage());

      // G11.2: referencia territorial bajo los datos — hidrografía,
      // núcleos urbanos y red viaria del servicio oficial KARTOGRAFIA de
      // geoEuskadi (contenido verificado en evidence/g11/basemap_*).
      // Se añade primero para quedar debajo de todas las capas de datos.
      m.addSource('refbase', {
        type: 'raster',
        tiles: [REFBASE_TILE],
        tileSize: 256,
        // Atribución neutra (nombre propio + licencia): el source se crea
        // una vez; no hay que re-armarlo al cambiar de idioma.
        attribution: 'geoEuskadi · CC BY 4.0'
      });
      m.addLayer({
        id: 'refbase',
        type: 'raster',
        source: 'refbase',
        paint: { 'raster-opacity': 0.55, 'raster-fade-duration': 0 }
      });

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
          paint: { 'line-color': '#182631', 'line-width': 2 }
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
            'text-color': '#182631',
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
            'fill-opacity': 0.8
          }
        });
        // G12: el tono neutro de «sin dato» (#eef1f4) es casi idéntico al
        // extremo 0 % de la rampa (#e3e8ec) — la ausencia se marcaba como
        // cero. Las celdas computadas sin año conocido llevan la misma trama
        // diagonal que los edificios sin año utilizable.
        m.addLayer({
          id: 'cells-nodata',
          type: 'fill',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          paint: {
            'fill-pattern': 'noyear-hatch',
            'fill-opacity': ['case', ['==', ['feature-state', 'nodata'], true], 0.5, 0] as never
          }
        });
        // G5 GV2: sin rejilla de bordes por celda — la lectura es territorial,
        // no de tesela. Solo las celdas con n bajo conservan contorno
        // discontinuo (incertidumbre visible, no decoración).
        m.addLayer({
          id: 'cells-smalln',
          type: 'line',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          filter: ['<', ['get', 'known'], 15],
          paint: {
            'line-color': '#52606d',
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
          paint: { 'line-color': '#182631', 'line-width': 1.6 }
        });
        m.addLayer({
          id: 'cells-selected',
          type: 'line',
          source: 'cells',
          'source-layer': 'cells',
          minzoom: 9,
          maxzoom: 13.5,
          filter: ['==', ['get', 'fid'], -1],
          paint: { 'line-color': '#182631', 'line-width': 2.6 }
        });
        m.on('mousemove', 'cells-fill', onCellHover);
        m.on('mouseleave', 'cells-fill', () => {
          cellTooltip = null;
        });
        m.on('click', 'cells-fill', onCellClick);
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
        paint: { 'line-color': '#182631', 'line-width': 1.8 }
      });

      // G11.2: nombres de municipio también a zoom municipal/celda — la
      // orientación («esa zona la conozco») la dan los vecinos. Misma
      // fuente ligera ya cargada (name + geometría, punto al centroide).
      m.addLayer({
        id: 'munis-label-detail',
        type: 'symbol',
        source: 'sel-muni',
        minzoom: 9,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 13, 12.5],
          'text-font': ['Open Sans Semibold'],
          'symbol-placement': 'point',
          'text-allow-overlap': false,
          'text-padding': 8
        },
        paint: {
          'text-color': '#52606d',
          'text-halo-color': 'rgba(247,248,250,0.9)',
          'text-halo-width': 1.4
        }
      });

      m.on('moveend', () => {
        level = scaleLevel(m.getZoom());
        // la celda seleccionada no puede sobrevivir fuera de su rango de zoom
        if (m.getZoom() < 9 || m.getZoom() >= 13.5) clearCellSelection();
        ensureScaleSources();
        ensureVisibleBuildings();
        ensureVisibleCellSeries();
        refreshShares();
        updateView();
        // G16b: la afirmación de cobertura («cubre / no cubre esta zona»)
        // sigue al lugar mostrado. Si la cámara se aleja >0,5 km del punto
        // sondeado, la sonda se repite en el nuevo centro — discreto por
        // moveend, nunca continuo. La respuesta tardía se descarta por seq.
        if (app.orthoVisible && app.orthoCampaign) {
          const c = m.getCenter();
          const pt = app.orthoPoint;
          if (!pt || distM({ lon: c.lng, lat: c.lat }, { lon: pt[0], lat: pt[1] }) > 500) {
            app.orthoPoint = [c.lng, c.lat];
            void probeOrtho(app.orthoCampaign);
          }
        }
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
      mapSync.main = m; // lienzo de comparación (CompareMap) sincroniza cámara
    });
  });

  // reactivos
  $effect(() => {
    // el aria-label del canvas sigue al idioma — se fija en init, pero el
    // mapa vive más que una conmutación ES↔EU y no se recrea
    void locale.lang;
    if (loaded && map) map.getCanvas().setAttribute('aria-label', t('a11y.map.canvas.main'));
  });
  $effect(() => {
    void app.year;
    void app.compareYear;
    if (loaded) updateYearDependentPaint();
  });
  $effect(() => {
    void app.playYear;
    if (loaded) {
      refreshShares(); // celdas: cuota constatada hasta playYear
      refreshSelectedCell(); // la ficha sigue la misma variable que el color
      applyBuildingPlayFilters(); // edificios: visibles hasta playYear
    }
  });
  // La intro del mapa vive en ResultView (fuera del canvas): necesita el
  // nivel de escala actual para no decir «cuadrados» a nivel edificio.
  $effect(() => {
    app.mapLevel = level;
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
    const p = app.identityPoint;
    // untrack: resolveIdentityPoint toca señales transitivamente (app.view via
    // moveend->updateView->syncUrl, loadedBuildingSources via ensure*) que ese
    // mismo camino escribe — sin untrack el efecto se auto-invalida en bucle
    // (effect_update_depth_exceeded) y tira el flush de finishIdentity.
    if (p && loaded) untrack(() => void resolveIdentityPoint(p));
    // punto a null = cancelación (editar/cerrar la dirección): invalida la
    // resolución en vuelo — antes el token solo rotaba al empezar otra, y la
    // anterior podía escribir identityResult cuando ya no correspondía
    else if (!p) identityToken++;
  });
  $effect(() => {
    const id = app.pendingBuildingId;
    if (id && loaded && app.place) untrack(() => void restorePendingBuilding());
  });
  // Cámara imperativa (G4: historias, «Volver a mi Bizkaia»): se consume
  // por seq — el target se lee con untrack porque el propio salto escribe
  // app.view en moveend y una suscripción directa se auto-invalidaría.
  $effect(() => {
    const seq = app.cameraSeq;
    if (!loaded || !map || seq === 0) return;
    const c = untrack(() => app.cameraTarget);
    if (c) queueMicrotask(() => map?.jumpTo({ center: [c.lon, c.lat], zoom: c.zoom }));
  });
  $effect(() => {
    void app.selectedCell;
    if (loaded) updateCellSelFilter();
  });
  $effect(() => {
    void app.orthoVisible;
    void app.orthoCampaign;
    void app.orthoState;
    void app.orthoCompare;
    void app.photoView;
    if (loaded) updateOrtho();
  });
  $effect(() => {
    void app.overlayBuildings;
    if (loaded) applyEvidenceVisibility();
  });
  $effect(() => {
    void app.histMapVisible;
    void app.histMapState;
    if (loaded) setHistMapLayer(app.histMapVisible && app.histMapState !== 'UNAVAILABLE');
  });
  // G3-B: geometría opt-in — solo los ámbitos/AE del edificio resuelto;
  // nunca una capa de planeamiento global (gate §8/§11).
  $effect(() => {
    const fc = app.planningHighlight;
    if (!loaded || !map) return;
    untrack(() => {
      if (map!.getLayer('planning-ctx-fill')) map!.removeLayer('planning-ctx-fill');
      if (map!.getLayer('planning-ctx-line')) map!.removeLayer('planning-ctx-line');
      if (map!.getSource('planning-ctx')) map!.removeSource('planning-ctx');
      if (fc?.features.length) {
        map!.addSource('planning-ctx', { type: 'geojson', data: fc });
        map!.addLayer({
          id: 'planning-ctx-fill',
          type: 'fill',
          source: 'planning-ctx',
          paint: { 'fill-color': '#5e4210', 'fill-opacity': 0.16 }
        });
        map!.addLayer({
          id: 'planning-ctx-line',
          type: 'line',
          source: 'planning-ctx',
          paint: { 'line-color': '#5e4210', 'line-width': 2, 'line-dasharray': [2, 1] }
        });
      }
    });
  });
  // G3-D: overlay contextual opt-in — una sola activa (gate §15), geometría
  // ya filtrada por el componente al facet del edificio resuelto.
  $effect(() => {
    const ov = app.contextOverlay;
    if (!loaded || !map) return;
    untrack(() => {
      for (const id of [
        'ctx-ruido-fill',
        'ctx-ruido-line',
        'ctx-paradas-circle',
        'ctx-paradas-label',
        'ctx-montes-fill',
        'ctx-montes-line'
      ]) {
        if (map!.getLayer(id)) map!.removeLayer(id);
      }
      for (const id of ['ctx-ruido', 'ctx-paradas', 'ctx-montes']) {
        if (map!.getSource(id)) map!.removeSource(id);
      }
      if (!ov || !ov.fc.features.length) return;
      if (ov.mod === 'ruido') {
        map!.addSource('ctx-ruido', { type: 'geojson', data: ov.fc });
        map!.addLayer({
          id: 'ctx-ruido-fill',
          type: 'fill',
          source: 'ctx-ruido',
          paint: {
            'fill-color': [
              'step',
              ['at', 0, ['get', 'b']],
              '#f6d5a8',
              55,
              '#eda85c',
              65,
              '#d06a1d',
              75,
              '#9c3d05'
            ],
            'fill-opacity': 0.28
          }
        });
        map!.addLayer({
          id: 'ctx-ruido-line',
          type: 'line',
          source: 'ctx-ruido',
          paint: { 'line-color': '#8a4a08', 'line-width': 0.8, 'line-opacity': 0.7 }
        });
      } else if (ov.mod === 'paradas') {
        map!.addSource('ctx-paradas', { type: 'geojson', data: ov.fc });
        map!.addLayer({
          id: 'ctx-paradas-circle',
          type: 'circle',
          source: 'ctx-paradas',
          paint: {
            'circle-radius': 5.5,
            'circle-color': '#1c5d8f',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5
          }
        });
        map!.addLayer({
          id: 'ctx-paradas-label',
          type: 'symbol',
          source: 'ctx-paradas',
          layout: {
            'text-field': ['get', 'n'],
            'text-size': 10.5,
            'text-offset': [0, 1.1],
            'text-anchor': 'top',
            'text-max-width': 10
          },
          paint: {
            'text-color': '#123c5c',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2
          }
        });
      } else {
        map!.addSource('ctx-montes', { type: 'geojson', data: ov.fc });
        map!.addLayer({
          id: 'ctx-montes-fill',
          type: 'fill',
          source: 'ctx-montes',
          paint: { 'fill-color': '#3d7a44', 'fill-opacity': 0.16 }
        });
        map!.addLayer({
          id: 'ctx-montes-line',
          type: 'line',
          source: 'ctx-montes',
          paint: { 'line-color': '#3d7a44', 'line-width': 2, 'line-dasharray': [2, 1] }
        });
      }
    });
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
    mapSync.main = null;
    app.mapFlyTo = null;
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

<!-- G11.1: .mapouter es el marco flexible; la leyenda vive FUERA del
     lienzo — en escritorio sigue superpuesta (absoluta sobre mapouter),
     en móvil pasa a flujo y se coloca debajo del mapa (G11-05). -->
<div class="mapouter">
  <div class="mapwrap" bind:this={container}>
    {#if tooltip}
      <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">
        {buildingText(tooltip.props)}
      </div>
    {/if}
    {#if cellTooltip}
      <div class="tooltip cell-tip" style="left:{cellTooltip.x + 12}px; top:{cellTooltip.y + 12}px">
        <CellData
          share={cellTooltip.share}
          footprint={cellTooltip.footprint}
          known={cellTooltip.known}
          after={cellTooltip.after}
          until={cellTooltip.until}
          dataState={cellTooltip.dataState}
        />
      </div>
    {/if}
    {#if app.pmtilesError}
      <div class="maperror" role="alert">{t('error.pmtiles')}</div>
    {/if}
    {@render overlay?.()}
  </div>
  {#if !evidenceOn}
    {#if level === 'CELDA' && cellSeriesErrors.size > 0}
      <p role="alert" class="series-error">
        {t('map.cell.load_error')}
        <button type="button" onclick={retryCellSeries}>{t('map.cell.retry')}</button>
      </p>
    {/if}
    <div class="legend" aria-live="polite">
      {#snippet legendCore()}
        {#if level === 'BIZKAIA'}
          <p class="legend-title">
            {#if app.playYear !== null}
              {t('map.legend.munis.play', { play_year: app.playYear })}
            {:else}
              {t('map.legend.munis', { selected_year: app.year ?? '' })}
            {/if}
          </p>
        {:else if level === 'CELDA'}
          <p class="legend-title">
            {#if app.playYear !== null}
              {t('map.legend.cells.play', { play_year: app.playYear })}
            {:else}
              {t('map.legend.cells', { selected_year: app.year ?? '' })}
            {/if}
          </p>
          <span><i class="hatch"></i>{t('map.legend.cells.nodata')}</span>
        {:else if app.compareYear !== null && app.year !== null}
          <p class="legend-title">{t('map.legend.title')}</p>
          <span
            ><i class="sw-before"></i>{t('map.legend.compare.before', {
              earlier: Math.min(app.year, app.compareYear)
            })}</span
          >
          <span
            ><i class="sw-after"></i>{t('map.legend.compare.between', {
              earlier: Math.min(app.year, app.compareYear),
              later: Math.max(app.year, app.compareYear)
            })}</span
          >
          <span
            ><i style="background:{COLORS.afterBoth}"></i>{t('map.legend.compare.after', {
              later: Math.max(app.year, app.compareYear)
            })}</span
          >
          <span><i class="hatch"></i>{t('map.legend.noyear')}</span>
          {#if app.playYear !== null}
            <span>{t('map.legend.buildings.play', { play_year: app.playYear })}</span>
          {/if}
        {:else}
          <p class="legend-title">{t('map.legend.title')}</p>
          <span
            ><i class="sw-before"></i>{t('map.legend.before', {
              selected_year: app.year ?? ''
            })}</span
          >
          <span
            ><i class="sw-after"></i>{t('map.legend.after', {
              selected_year: app.year ?? ''
            })}</span
          >
          <span><i class="hatch"></i>{t('map.legend.noyear')}</span>
          {#if app.playYear !== null}
            <span>{t('map.legend.buildings.play', { play_year: app.playYear })}</span>
          {/if}
        {/if}
        {#if level !== 'EDIFICIO'}
          <div class="ramp">
            <i style="background:{COLORS.ramp[0]}"></i><i style="background:{COLORS.ramp[1]}"></i><i
              style="background:{COLORS.ramp[2]}"
            ></i><i style="background:{COLORS.ramp[3]}"></i><i style="background:{COLORS.ramp[4]}"
            ></i>
          </div>
          <p class="ramp-label">
            <!-- G10-03: en play la rampa codifica cuota constatada hasta
                 playYear, no «posteriores» — la variable la nombra el
                 título; los extremos son la escala. -->
            {#if app.playYear !== null}
              <span>{t('map.legend.cells.play.less')}</span><span
                >{t('map.legend.cells.play.more')}</span
              >
            {:else}
              <span>{t('map.legend.cells.less')}</span><span>{t('map.legend.cells.more')}</span>
            {/if}
          </p>
        {/if}
      {/snippet}
      {#snippet legendNotes()}
        {#if level === 'CELDA'}
          <p class="legend-sub">{t('map.legend.cells.universe')}</p>
          <p class="legend-sub">{t('map.legend.cells.pending')}</p>
        {/if}
        {#if level === 'BIZKAIA'}
          <p class="scalehint">{t('map.scale.region')}</p>
        {:else if level === 'CELDA'}
          <p class="scalehint">{t('map.scale.zones')}</p>
        {/if}
        {#if app.place}
          <p class="universe">{t('map.visible_universe', { municipality: app.place.name })}</p>
        {/if}
        {#if level === 'CELDA' && !app.orthoVisible}
          <!-- Consulta la celda del CENTRO del encuadre: vive dentro de la
               leyenda (en flujo bajo el lienzo en móvil) en vez de flotar
               sobre el mapa — no tapa celdas ni intercepta gestos. -->
          <button class="cell-inspect" onclick={inspectCenterCell}>
            {t('map.cell.inspect')}
          </button>
        {/if}
      {/snippet}
      {@render legendCore()}
      {#if app.mode === 'map'}
        {@render legendNotes()}
      {:else}
        <!-- G19: en el visor la leyenda es compacta — título + escala a la
             vista; universo, denominador y consulta tras el desplegable -->
        <details class="legend-more">
          <summary data-action="legend-details">{t('map.legend.details')}</summary>
          {@render legendNotes()}
        </details>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mapouter {
    position: relative;
    width: 100%;
    flex: 1 1 auto; /* ítem flex de .mapcell — llena la celda */
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .mapwrap {
    position: relative;
    width: 100%;
    flex: 1 1 auto;
    min-height: 340px;
  }
  .mapwrap :global(.maplibregl-canvas) {
    outline-offset: -2px;
  }
  .tooltip {
    position: absolute;
    z-index: 20;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    max-width: 240px;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .cell-inspect {
    margin-top: 0.4rem;
    min-height: 44px;
    padding: 0.4rem 0.9rem;
    border: 1px solid var(--ink-2);
    border-radius: 6px;
    background: var(--paper);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
    text-align: left;
  }
  .cell-inspect:hover {
    background: var(--paper);
  }
  .cell-inspect:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .series-error {
    padding: 0.6rem 1rem;
    background: var(--warn-bg);
    color: var(--warn-text);
    border: 1px solid var(--warn-line);
  }
  .series-error button {
    font: inherit;
    min-height: 44px;
    margin-left: 0.5rem;
  }
  .maperror {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    background: var(--warn-bg);
    border: 1px solid var(--warn-line);
    color: var(--warn-text);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  .legend {
    position: absolute;
    left: 0.75rem;
    bottom: calc(0.75rem + var(--tcbh, 0px));
    z-index: 10;
    background: rgba(247, 248, 250, 0.94);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.75rem;
    max-width: 250px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  /* G19: en modos de visor la metodología va tras un desplegable */
  .legend-more summary {
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ink-3);
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    border-bottom: 1px solid var(--line-strong);
  }
  .legend-more summary:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .legend-more[open] summary {
    margin-bottom: 0.3rem;
  }
  /* G11-05: en móvil la leyenda no se superpone al lienzo — va debajo,
     en flujo, dentro del propio marco del mapa */
  @media (max-width: 700px) {
    .mapwrap {
      min-height: 240px;
    }
    .legend {
      position: static;
      max-width: none;
      border: 0;
      border-top: 1px solid var(--line);
      border-radius: 0;
      background: var(--surface);
      padding: 0.5rem 0.9rem;
    }
  }
  .legend-title {
    margin: 0;
    font-weight: 600;
  }
  .legend-sub {
    margin: 0.1rem 0 0.3rem;
    font-size: 0.72rem;
    color: var(--ink-3);
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
    background: repeating-linear-gradient(45deg, #d8dde2, #d8dde2 2px, #5b6874 2px, #5b6874 3px);
    border: 1px dashed #5b6874;
  }
  /* G10-13: los swatches replican la codificación del mapa — «antes»
     lavado (45 %), «después» con trama diagonal sobre el terracota. */
  .legend i.sw-before {
    background: var(--before);
    opacity: 0.45;
  }
  .legend i.sw-after {
    background: repeating-linear-gradient(45deg, #c94f38, #c94f38 3px, #8c2d21 3px, #8c2d21 4.5px);
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
    color: var(--ink-3);
  }
  .scalehint {
    margin: 0.15rem 0 0;
    font-size: 0.7rem;
    color: var(--ink-3);
    font-style: italic;
  }
  .universe {
    margin: 0.3rem 0 0;
    font-size: 0.7rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.3rem;
  }
</style>
