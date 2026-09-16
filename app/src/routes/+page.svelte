<script lang="ts">
  import { onMount } from 'svelte';
  import type { Map as MLMap } from 'maplibre-gl';
  import {
    MUNICIPALITIES,
    type MetricsFile,
    type Campaign,
    cumAt,
    postSelectedYear,
    nearestOrtho,
    orthoTiles,
    attributionOf,
    BUILDINGS_ATTRIBUTION
  } from '$lib/contracts';

  const YEAR_MIN = 1700;
  const YEAR_MAX = 2026;

  let muniCod = $state(54);
  let year = $state(1987);
  let metrics = $state<MetricsFile | null>(null);
  let loadError = $state<string | null>(null);
  let tileWarning = $state<string | null>(null);
  let ready = $state(false);

  let mapEl: HTMLDivElement;

  let map: MLMap | null = null;
  let swipe: { setLeftLayers: (l: string[]) => void } | null = null;
  let currentLeftCampaign: Campaign | null = null;

  const COLORS = {
    before: '#8aa0b4',
    after: '#d1495b',
    unknown: '#3f3f46'
  };

  function cacheBust(url: string) {
    return `${url}${url.includes('?') ? '&' : '?'}v=${muniCod}`;
  }

  async function loadMetrics(cod: number) {
    loadError = null;
    try {
      const res = await fetch(`/data/metrics_${String(cod).padStart(3, '0')}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      metrics = (await res.json()) as MetricsFile;
      ready = true;
    } catch (e) {
      loadError = `No se pudieron cargar los agregados canónicos del municipio (${String(e)}).`;
    }
  }

  function buildingsPaint(y: number): never {
    return [
      'case',
      ['==', ['get', 'state'], 'UNKNOWN'],
      COLORS.unknown,
      ['<=', ['coalesce', ['get', 'year'], 0], y],
      COLORS.before,
      COLORS.after
    ] as never;
  }

  function setLeftCampaign(c: Campaign) {
    if (!map) return;
    currentLeftCampaign = c;
    if (map.getLayer('ortho-left')) map.removeLayer('ortho-left');
    if (map.getSource('ortho-left')) map.removeSource('ortho-left');
    const src = orthoTiles(c);
    map.addSource('ortho-left', {
      type: 'raster',
      tiles: src.tiles,
      tileSize: src.tileSize,
      attribution: attributionOf(c)
    });
    // La orto histórica va por debajo de los edificios.
    map.addLayer({ id: 'ortho-left', type: 'raster', source: 'ortho-left', paint: { 'raster-opacity': 1 } }, 'buildings-fill');
    swipe?.setLeftLayers(['ortho-left']);
    tileWarning = null;
  }

  function selectedMunicipality() {
    return MUNICIPALITIES.find((m) => m.codigo_mun === muniCod)!;
  }

  function stat() {
    if (!metrics) return null;
    return postSelectedYear(metrics, year);
  }

  function orthoInfo() {
    if (!metrics) return null;
    return nearestOrtho(metrics.campaigns, year);
  }

  onMount(async () => {
    const maplibregl = await import('maplibre-gl');
    await import('maplibre-gl/dist/maplibre-gl.css');
    const { Protocol } = await import('pmtiles');
    const { SwipeControl } = await import('maplibre-gl-swipe');
    await import('maplibre-gl-swipe/style.css');

    const protocol = new Protocol();
    (maplibregl as unknown as { addProtocol: (n: string, f: typeof protocol.tile) => void }).addProtocol('pmtiles', protocol.tile);

    await loadMetrics(muniCod);

    const m = new (maplibregl as unknown as { Map: new (o: unknown) => MLMap }).Map({
      container: mapEl,
      style: { version: 8, sources: {}, layers: [] },
      center: [-2.9863, 43.3278],
      zoom: 14,
      hash: false,
      attributionControl: { compact: true }
    });
    map = m;
    const ml = maplibregl as unknown as {
      NavigationControl: new (o?: unknown) => unknown;
      Popup: new (o?: unknown) => { setLngLat: (c: unknown) => { setHTML: (h: string) => { addTo: (mp: MLMap) => void } } };
    };
    m.addControl(new ml.NavigationControl({ showCompass: false }) as never, 'top-right');

    m.on('load', async () => {
      // Ortofoto moderna (derecha del swipe) — geoEuskadi ORTO_2025
      const modern: Campaign = {
        year: 2025, source: 'geoeuskadi', nominal_year: 2025,
        flight_range: '2025-07-09/2025-08-04', verified_image: true
      };
      m.addSource('ortho-modern', {
        type: 'raster', tiles: orthoTiles(modern).tiles, tileSize: 256, attribution: attributionOf(modern)
      });
      m.addLayer({ id: 'ortho-modern', type: 'raster', source: 'ortho-modern' });

      // Edificios (PMTiles)
      m.addSource('buildings', {
        type: 'vector', url: 'pmtiles:///data/buildings.pmtiles', attribution: BUILDINGS_ATTRIBUTION
      });
      m.addLayer({
        id: 'buildings-fill', type: 'fill', source: 'buildings', 'source-layer': 'buildings', minzoom: 10,
        paint: { 'fill-color': buildingsPaint(year), 'fill-opacity': 0.62 }
      });
      m.addLayer({
        id: 'buildings-unknown-outline', type: 'line', source: 'buildings', 'source-layer': 'buildings', minzoom: 13,
        filter: ['==', ['get', 'state'], 'UNKNOWN'],
        paint: { 'line-color': '#18181b', 'line-width': 1.4, 'line-dasharray': [1, 1] }
      });

      const info = orthoInfo();
      if (info) setLeftCampaign(info.campaign);

      swipe = new SwipeControl({
        orientation: 'vertical', position: 50,
        leftLayers: ['ortho-left'], rightLayers: ['ortho-modern'],
        showPanel: false, title: 'Comparar ortofotos'
      });
      m.addControl(swipe as never, 'top-left');

      // Accesibilidad: MapLibre etiqueta sus canvas como role=region "Map".
      // Con dos canvas (mapa + capa de comparación) hay que dar nombres únicos.
      const labelCanvases = () => {
        const canvases = document.querySelectorAll<HTMLCanvasElement>('#map canvas');
        canvases.forEach((c, i) => {
          c.setAttribute('aria-label', i === 0
            ? 'Mapa principal: edificios actuales y ortofoto seleccionada'
            : 'Capa de comparación de ortofotos (swipe)');
        });
      };
      labelCanvases();
      setTimeout(labelCanvases, 300);

      m.on('error', (e) => {
        const msg = String((e as { error?: { message?: string } })?.error?.message ?? e);
        if (/ortho|ORTO|tile/i.test(msg)) {
          tileWarning =
            'La ortofoto oficial no está disponible temporalmente para esta zona o campaña. El resto de la visualización sigue funcionando.';
        }
      });

      m.on('click', 'buildings-fill', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = (f.properties ?? {}) as Record<string, unknown>;
        const y = p.year ?? null;
        const txt = y
          ? `Este edificio consta como terminado en ${y}.`
          : 'El Catastro no indica un año de construcción para este edificio.';
        new ml.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${txt}</strong><br><span>Uso: ${p.uso ?? '—'} · Alturas: ${p.alturas ?? '—'} · Huella: ${p.area_m2 ? Math.round(Number(p.area_m2)) + ' m²' : '—'}</span>`
          )
          .addTo(m);
      });
      m.on('mouseenter', 'buildings-fill', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'buildings-fill', () => (m.getCanvas().style.cursor = ''));
    });
  });

  // Reacciones a cambios de estado
  $effect(() => {
    const info = orthoInfo();
    if (map && info && ready) {
      if (!currentLeftCampaign || currentLeftCampaign.year !== info.campaign.year) {
        if (map.isStyleLoaded() && map.getSource('ortho-modern')) setLeftCampaign(info.campaign);
      }
    }
  });

  $effect(() => {
    const y = year;
    if (map && ready && map.getLayer('buildings-fill')) {
      map.setPaintProperty('buildings-fill', 'fill-color', buildingsPaint(y));
    }
  });

  $effect(() => {
    const cod = muniCod;
    if (ready && map) {
      loadMetrics(cod).then(() => {
        const c = MUNICIPALITIES.find((m) => m.codigo_mun === cod)!;
        const centers: Record<number, [number, number]> = {
          20: [-2.9349, 43.2566],
          54: [-2.9863, 43.3278],
          908: [-2.6872, 43.356]
        };
        const zooms: Record<number, number> = { 20: 13, 54: 14, 908: 14 };
        // prefers-reduced-motion: sin animación de cámara.
        const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
          map!.jumpTo({ center: centers[c.codigo_mun], zoom: zooms[c.codigo_mun] });
        } else {
          map!.flyTo({ center: centers[c.codigo_mun], zoom: zooms[c.codigo_mun], duration: 600 });
        }
      });
    }
  });
</script>

<svelte:head>
  <title>Más joven que tú — G0 (Bilbao, Leioa, Murueta)</title>
</svelte:head>

<header>
  <div class="brand">
    <h1>Más joven que tú</h1>
    <p class="tag">70 años construyendo Bizkaia · <b>vertical slice G0</b> (no es el producto final)</p>
  </div>
</header>

<main>
  <section class="panel" aria-label="Controles y estadística">
    <div class="fields">
      <label for="muni">Municipio</label>
      <select id="muni" bind:value={muniCod}>
        {#each MUNICIPALITIES as m}
          <option value={m.codigo_mun}>{m.name} · {m.profile}</option>
        {/each}
      </select>

      <label for="year">Año de nacimiento</label>
      <div class="yearrow">
        <input id="year" type="range" min={YEAR_MIN} max={YEAR_MAX} step="1" bind:value={year}
          aria-valuetext={`año ${year}`} />
        <output for="year">{year}</output>
      </div>
    </div>

    {#if loadError}
      <p class="error" role="alert">{loadError}</p>
    {:else if metrics && stat()}
      {@const s = stat()!}
      {@const o = orthoInfo()!}
      <div class="stat" aria-live="polite">
        <p class="headline">
          Eres de <b>{year}</b>. En <b>{selectedMunicipality().name}</b>, <b>{s.share === null ? '—' : (Math.round(s.share * 10) / 10)} de cada 100</b>
          edificios actuales <b>con año de construcción conocido</b> se terminaron después de ese año.
        </p>
        <p class="coverage">
          Cobertura del dato: <b>{s.c02_known}</b> de {s.c01_total} edificios actuales de {selectedMunicipality().name}
          tienen año conocido ({metrics.constants.coverage_pct} %). La cifra anterior se calcula solo sobre esos {s.c02_known}.
          {#if metrics.constants.coverage_pct !== null && metrics.constants.coverage_pct < 90}
            <b class="warn">En este municipio falta el año en una parte relevante del parque: consulta cómo afecta al cálculo.</b>
          {/if}
        </p>
        <p class="caveat">
          Esto no significa que antes no hubiese construcción en ese entorno. El Catastro que usamos
          describe los edificios que existen actualmente, no los que existieron.
        </p>
        <details>
          <summary>¿Cómo se calcula?</summary>
          <p>
            Numerador: edificios con año conocido y <code>Ano_Constr &gt; {year}</code> = <b>{s.after}</b>.
            Denominador: edificios actuales con año conocido = <b>{s.c02_known}</b>.
            Estado de las geometrías inválidas: {metrics.constants.invalid_geom} (excluidas de la huella).
            Contrato <code>DATA_SEMANTICS §11 C-04/C-05</code>.
          </p>
        </details>
      </div>

      <div class="ortho">
        <p>
          Año seleccionado: <b>{year}</b> ·
          Ortofoto oficial más próxima disponible: <b>{o.campaign.year}</b>
          {#if !o.isExact}(a {o.delta} años de distancia){/if}
          · fuente {o.campaign.source}
          {#if o.campaign.flight_range}(vuelo {o.campaign.flight_range}){/if}
        </p>
        <label for="campaign">Campaña de ortofoto (lado izquierdo del swipe)</label>
        <select id="campaign" value={o.campaign.year} onchange={(e) => {
          const y = Number((e.currentTarget as HTMLSelectElement).value);
          const c = metrics!.campaigns.find((x: Campaign) => x.year === y);
          if (c) setLeftCampaign(c);
        }}>
          {#each metrics.campaigns as c}
            <option value={c.year}>{c.year} · {c.source}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="legend" aria-label="Leyenda">
      <span><i style="background:{COLORS.before}"></i> Ya existían en {year}</span>
      <span><i style="background:{COLORS.after}"></i> Terminados después de {year}</span>
      <span><i class="unknown" style="background:{COLORS.unknown}"></i> Año de construcción no consta</span>
    </div>

    {#if tileWarning}<p class="warn" role="status">{tileWarning}</p>{/if}
  </section>

  <div class="mapwrap">
    <div id="map" bind:this={mapEl} role="application"
      aria-label="Mapa de edificios actuales y ortofotos. El resumen textual equivalente está en el panel de la izquierda."></div>
  </div>
</main>

<footer>
  <p>
    Fuente principal: <b>Open Data Bizkaia — Diputación Foral de Bizkaia</b> (Catastro y ortofotos 1956–2002, CC BY 4.0).
    Complemento: <b>geoEuskadi / Gobierno Vasco</b> (ortofotos 2004–2025, CC BY 4.0).
    Código: MIT. Herramientas: MapLibre · PMTiles · tippecanoe · DuckDB.
  </p>
</footer>

<style>
  :global(html, body) { margin: 0; height: 100%; }
  :global(body) {
    font: 16px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #18181b; background: #f6f7f9;
  }
  header { padding: 0.6rem 1rem; background: #18181b; color: #fff; }
  h1 { margin: 0; font-size: 1.15rem; letter-spacing: 0.02em; }
  .tag { margin: 0.15rem 0 0; font-size: 0.78rem; color: #d4d4d8; }
  main { display: grid; grid-template-rows: auto 1fr; gap: 0; }
  .panel { padding: 0.7rem 1rem 0.9rem; background: #fff; border-bottom: 1px solid #e4e4e7; }
  .fields { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; align-items: center; }
  label { font-weight: 600; font-size: 0.85rem; }
  select, input[type='range'] { font: inherit; }
  select { padding: 0.25rem 0.4rem; border: 1px solid #a1a1aa; border-radius: 4px; background: #fff; }
  .yearrow { display: flex; align-items: center; gap: 0.5rem; }
  input[type='range'] { width: 15rem; }
  output { font-variant-numeric: tabular-nums; font-weight: 700; }
  .stat { margin-top: 0.6rem; }
  .headline { margin: 0; font-size: 1.02rem; }
  .coverage { margin: 0.35rem 0 0; font-size: 0.85rem; color: #3f3f46; }
  .caveat { margin: 0.35rem 0 0; font-size: 0.8rem; color: #52525b; font-style: italic; }
  details { margin-top: 0.35rem; font-size: 0.82rem; }
  summary { cursor: pointer; color: #1d4ed8; }
  .ortho { margin-top: 0.6rem; font-size: 0.85rem; }
  .ortho p { margin: 0 0 0.3rem; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; margin-top: 0.6rem; font-size: 0.8rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .legend i { width: 0.85rem; height: 0.85rem; display: inline-block; border-radius: 2px; }
  .legend i.unknown { outline: 2px dashed #18181b; outline-offset: 1px; }
  .error { color: #b91c1c; font-weight: 600; }
  .warn { color: #92400e; }
  .mapwrap { position: relative; min-height: 60vh; }
  #map { position: absolute; inset: 0; }
  footer { padding: 0.6rem 1rem 1rem; font-size: 0.72rem; color: #52525b; }
  @media (min-width: 900px) {
    main { grid-template-columns: 30rem 1fr; grid-template-rows: 1fr; height: calc(100vh - 4.1rem); }
    .panel { border-bottom: none; border-right: 1px solid #e4e4e7; overflow: auto; }
    .mapwrap { min-height: 0; height: 100%; }
    footer { position: fixed; right: 0.5rem; bottom: 0.2rem; max-width: 55vw; text-align: right; }
  }
</style>
