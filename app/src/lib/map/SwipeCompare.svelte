<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import {
    rasterSourceDef,
    previewSourceDef,
    probeCampaign,
    flightSuffix,
    defaultSwipeBefore
  } from '$lib/domain/ortho';
  import type { Campaign } from '$lib/domain/ortho';
  import { probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { preloadMapEngine } from '$lib/map/engine';
  import { mapSync } from '$lib/map/sync';
  import { PALETTE } from '$lib/palette';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';
  import type * as maplibregl from 'maplibre-gl';
  import type { Map as MLMap, RasterTileSource, ImageSource } from 'maplibre-gl';

  /**
   * G6 — comparador antes/después con cortina («swipe»). Un segundo mapa
   * MapLibre no interactivo muestra la campaña de referencia recortada
   * con clip-path a la izquierda del divisor; el lienzo principal muestra
   * la última («hoy», activada por ViewSwitch/applyUrl con la maquinaria
   * ortho habitual: optimista + sonda fail-closed).
   *
   * G11: la referencia «antes» es la campaña más cercana al año del
   * usuario (la pareja relevante primero); si coincide con la última o
   * no existe, se usa la campaña inmediatamente anterior, y como último
   * recurso la BFA 1956 — la primera BFA, no la primera del catálogo
   * (el registry G6 añade geoEuskadi 1945–46 por delante).
   *
   * Control: divisor arrastrable con `role="slider"` (teclado: ←/→/Inicio/
   * Fin), botones de extremo (G10.1: puntero sin arrastrar) y pointer
   * events solo en el handle — el resto del lienzo sigue panéando el
   * mapa. Sincronización unidireccional desde `mapSync.main`.
   * Evidencia visual (GV4): no deriva métricas ni data fechas.
   */

  // G16: las dos imágenes son elegibles. «Después» = orthoCampaign (el
  // lienzo principal; entra como la última y el selector puede cambiarla).
  // «Antes» = `swipeBefore` si la persona la eligió; si no, la heurística
  // compartida (más cercana al año, nunca igual a la «después»).
  let after = $derived(app.orthoCampaign ?? app.latest ?? null);
  let before = $derived.by(() => {
    const sel = app.swipeBefore;
    if (sel && sel.year !== after?.year) return sel;
    return defaultSwipeBefore(app.allCampaigns, app.year, after);
  });

  let wrap = $state<HTMLDivElement | null>(null);
  let paneEl = $state<HTMLDivElement | null>(null);
  let map: MLMap | null = null;
  let pct = $state(50);
  let dragging = $state(false);
  // 'probing' → sonda de contenido en curso; 'ready' → cortina visible;
  // 'error' → campaña «antes» no verificable aquí: cortina oculta.
  // El estado vive en `app` (G16c): el aviso y el reintento se muestran
  // en el panel en flujo (SwipeControls), nunca sobre chips ni controles.
  let beforeState = $derived(app.swipeBeforeState);
  // Campaña realmente cargada en la fuente raster del overlay. `before`
  // es reactivo (cambia al editar el año); la fuente se creaba solo en
  // `load` y quedaba desincronizada (G11.3: etiqueta 1956 con teselas
  // 1989). El efecto de abajo la re-sincroniza.
  let loadedCampaign: Campaign | null = null;

  let afterFailed = $derived(
    app.orthoState === 'NOT_COVERED' || app.orthoState === 'SERVICE_ERROR'
  );

  // La sonda del «después» reutiliza la orquestación única (última gana).
  $effect(() => {
    if (app.mode === 'swipe' && after && app.orthoState === 'UNKNOWN' && !probeStatus.probing) {
      void probeOrtho(after);
    }
  });

  // Sonda propia del «antes»: la capa del overlay no comparte orthoState.
  // Mismo contrato que la sonda principal (G16b): `orthoPoint` es el
  // punto donde rige la afirmación — lo fijan la acción, la URL y la
  // sonda principal, y el moveend lo actualiza si la cámara se aleja;
  // este efecto re-sondea la imagen 1 en el mismo punto (respuestas
  // tardías mueren con `live=false`). Antes de la primera sonda cae al
  // centroide municipal.
  $effect(() => {
    const c = before;
    const p = app.place;
    const retry = app.swipeBeforeRetry; // el botón «Reintentar» re-sondea
    if (!c || !p) return;
    const [lon, lat] = app.orthoPoint ?? [p.lon, p.lat];
    let live = true;
    void retry;
    app.swipeBeforeState = 'probing';
    void probeCampaign(c, lon, lat).then((st) => {
      if (live) app.swipeBeforeState = st === 'AVAILABLE' ? 'ready' : 'error';
    });
    return () => {
      live = false;
    };
  });

  // Fuente/etiqueta conjuntas (G11.3): al cambiar la campaña «antes» se
  // actualizan las teselas raster y el preview de la fuente; la cortina
  // se mantiene oculta hasta que la sonda verifica la NUEVA campaña, así
  // la etiqueta nunca anuncia una imagen que no es la que se ve. La
  // cámara y la posición del divisor no se tocan.
  function applyCampaignSource(c: Campaign) {
    if (!map) return;
    const src = map.getSource('swipe') as RasterTileSource | undefined;
    if (!src) return; // pre-load: el handler de 'load' aplica `before` vigente
    src.setTiles(rasterSourceDef(c).tiles);
    const prev = previewSourceDef(c);
    const psrc = map.getSource('swipe-preview') as ImageSource | undefined;
    if (psrc && prev) {
      psrc.updateImage({ url: prev.url, coordinates: prev.coordinates });
    } else if (psrc && !prev) {
      if (map.getLayer('swipe-preview')) map.removeLayer('swipe-preview');
      map.removeSource('swipe-preview');
    } else if (!psrc && prev) {
      map.addSource('swipe-preview', prev);
      map.addLayer(
        {
          id: 'swipe-preview',
          type: 'raster',
          source: 'swipe-preview',
          paint: { 'raster-fade-duration': 0 }
        },
        'swipe'
      );
    }
    loadedCampaign = c;
    app.swipeTilesReady = false;
    map.once('idle', () => (app.swipeTilesReady = true));
  }

  $effect(() => {
    const c = before;
    if (c && map && map.getSource('swipe') && loadedCampaign !== c) applyCampaignSource(c);
  });

  // ── mapa overlay (1956), sincronizado desde el principal ────────────
  let detach: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setInterval> | null = null;
  function attachSync() {
    const main = mapSync.main;
    if (!main || !map || detach) return;
    const sync = () => {
      map?.jumpTo({
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
      container: paneEl!,
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
      const cv = map!.getCanvas();
      cv.removeAttribute('role');
      cv.removeAttribute('tabindex');
      cv.setAttribute('aria-hidden', 'true');
      const c = before;
      if (c) {
        const prev = previewSourceDef(c);
        if (prev) {
          map!.addSource('swipe-preview', prev);
          map!.addLayer({
            id: 'swipe-preview',
            type: 'raster',
            source: 'swipe-preview',
            paint: { 'raster-fade-duration': 0 }
          });
        }
        map!.addSource('swipe', rasterSourceDef(c));
        map!.addLayer({ id: 'swipe', type: 'raster', source: 'swipe' });
        loadedCampaign = c;
      }
      attachSync();
      map!.once('idle', () => (app.swipeTilesReady = true));
      // handle de QA (mismo patrón que __mjtMap): los harness leen la
      // cámara del overlay para verificar la sincronización.
      (window as unknown as Record<string, unknown>).__mjtSwipe = map;
    });
    let tries = 0;
    retryTimer = setInterval(() => {
      if (detach || !map || ++tries > 100) {
        if (retryTimer) clearInterval(retryTimer);
        retryTimer = null;
      } else attachSync();
    }, 100);
  });

  onDestroy(() => {
    if (retryTimer) clearInterval(retryTimer);
    detach?.();
    map?.remove();
    map = null;
    delete (window as unknown as Record<string, unknown>).__mjtSwipe;
    app.swipeBeforeState = 'probing';
    app.swipeTilesReady = true;
  });

  // ── divisor ─────────────────────────────────────────────────────────
  function setFromClientX(x: number) {
    const r = wrap?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    pct = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100));
  }
  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragging = true;
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: PointerEvent) {
    if (dragging) setFromClientX(e.clientX);
  }
  function onKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') pct = Math.max(0, pct - step);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') pct = Math.min(100, pct + step);
    else if (e.key === 'Home') pct = 0;
    else if (e.key === 'End') pct = 100;
    else return;
    e.preventDefault();
  }
</script>

<div class="swipe" bind:this={wrap}>
  {#if before}
    <div
      class="pane"
      bind:this={paneEl}
      style:clip-path={beforeState === 'ready' ? `inset(0 ${100 - pct}% 0 0)` : 'inset(0 100% 0 0)'}
      aria-hidden="true"
    ></div>
    <!-- G16c: el chip derecho etiqueta lo que el lienzo muestra DE VERDAD.
         Si la campaña pedida falló, el lienzo es el mapa de edificios
         (respaldo) y se declara — nunca se anuncia como ortofoto. -->
    {#if after}
      <span class="chip right" class:miss={afterFailed} aria-hidden="true">
        {#if afterFailed}{t('swipe.after_missing', { year: after.year })}
        {:else if app.latest && after.year === app.latest.year}{t('swipe.today', {
            year: after.year
          })}
        {:else}{after.year}{/if}
      </span>
    {/if}
    {#if beforeState === 'ready'}
      <div class="divider" style:left="{pct}%" aria-hidden="true"></div>
      <span class="chip left" aria-hidden="true">{before.year}</span>
      {#if before.coverageGaps}
        <!-- G11.3b: el mosaico oficial tiene zonas sin imagen (causa de
             origen no confirmada); se declara para no leerlas como fallo. -->
        <p class="gaps">{t('swipe.gaps')}</p>
      {/if}
      <div
        class="handle"
        role="slider"
        tabindex="0"
        aria-label={afterFailed
          ? t('swipe.slider_map', { before_year: before.year })
          : t('swipe.slider', {
              before_year: before.year,
              after_year: after?.year ?? ''
            })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-orientation="horizontal"
        style:left="{pct}%"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={() => (dragging = false)}
        onpointercancel={() => (dragging = false)}
        onkeydown={onKeydown}
      >
        <span class="grip" aria-hidden="true">◀ ▶</span>
      </div>
      <p class="hint" aria-hidden="true">{t('swipe.hint')}</p>
      <!-- G10.1: la cortina también es manejable con puntero sin arrastrar
           — botones que la llevan a cada extremo. Si la campaña derecha
           falló el extremo muestra el mapa de respaldo y lo dice — no
           promete una imagen inexistente. -->
      <div class="presets" role="group" aria-label={t('swipe.presets')}>
        <button type="button" onclick={() => (pct = 100)}>
          {t('swipe.only_before', { year: before.year })}
        </button>
        <button type="button" onclick={() => (pct = 0)}>
          {#if afterFailed}{t('swipe.only_map')}{:else}{t('swipe.only_after', {
              year: after?.year ?? ''
            })}{/if}
        </button>
      </div>
    {/if}
    <!-- G16c: los estados de sonda/fallo de cada imagen se declaran en el
         panel en flujo (SwipeControls), no aquí — un aviso absoluto dentro
         del lienzo taparía chips, presets u orientación en móvil. -->
    {#if after}
      <!-- G11.3: atribución por lado desde la campaña real (organismo,
           año nominal y vuelo si se conoce) — no una fuente genérica.
           Con la derecha en respaldo se atribuye solo lo verificado. -->
      <p class="src">
        {#if afterFailed}
          {t('swipe.src_map', {
            before_year: before.year,
            before_pub: t(`ortho.publisher.${before.source}`),
            before_flight: flightSuffix(before, t, locale.lang),
            after_year: after.year
          })}
        {:else}
          {t('swipe.src', {
            before_year: before.year,
            before_pub: t(`ortho.publisher.${before.source}`),
            before_flight: flightSuffix(before, t, locale.lang),
            after_year: after.year,
            after_pub: t(`ortho.publisher.${after.source}`),
            after_flight: flightSuffix(after, t, locale.lang)
          })}
        {/if}
      </p>
    {/if}
  {/if}
</div>

<style>
  .swipe {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
  }
  .pane {
    position: absolute;
    inset: 0;
  }
  .divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--paper);
    box-shadow: 0 0 0 1px rgba(24, 38, 49, 0.35);
  }
  .chip {
    position: absolute;
    top: 0.6rem;
    background: rgba(24, 38, 49, 0.78);
    color: var(--paper);
    /* G11.2: el año es dato interpretativo, no decoración → ~14 px */
    font-size: 0.875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
  }
  .chip.left {
    left: 0.6rem;
  }
  .gaps {
    position: absolute;
    top: 2.3rem;
    left: 0.6rem;
    margin: 0;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.8rem;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
  }
  .chip.right {
    right: 0.6rem;
    top: 5.4rem; /* bajo los controles de zoom de MapLibre (top-right) */
  }
  .handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 44px;
    margin-left: -22px;
    pointer-events: auto;
    cursor: ew-resize;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .handle:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: -2px;
  }
  .grip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--paper);
    border: 1.5px solid var(--ink);
    color: var(--ink);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    box-shadow: 0 1px 4px rgba(24, 38, 49, 0.4);
    user-select: none;
  }
  .hint {
    position: absolute;
    bottom: 2.6rem; /* sobre la fila presets/fuente (G11) */
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.85rem;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    white-space: nowrap;
  }
  .presets {
    position: absolute;
    bottom: 0.5rem;
    left: 0.6rem;
    display: flex;
    gap: 0.4rem;
    pointer-events: auto;
  }
  .presets button {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.45rem 0.7rem;
    border-radius: 4px;
    border: 1px solid rgba(247, 248, 250, 0.35);
    background: rgba(24, 38, 49, 0.78);
    color: var(--paper);
    cursor: pointer;
    min-height: 32px;
  }
  .presets button:hover {
    background: rgba(24, 38, 49, 0.92);
  }
  .presets button:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 1px;
  }
  /* G16c: la derecha en respaldo (campaña pedida sin imagen) se marca
     con el chip de aviso — no con el chip de fotografía verificada. */
  .chip.miss {
    background: var(--warn-bg);
    color: var(--warn-text);
    border: 1px solid var(--warn-line);
    font-weight: 600;
  }
  .src {
    position: absolute;
    /* G11.1: la fuente bajo el chip «actualidad», despejada de la
       atribución MapLibre (abajo-derecha), de la fila de presets y del
       control de zoom (top-right ~0.6–5rem) */
    top: 7.4rem;
    right: 0.6rem;
    margin: 0;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.68rem;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    max-width: 60%;
    text-align: right;
  }
  @media (max-width: 700px) {
    .src {
      display: none; /* en estrecho la fuente vive en la ficha del modo */
    }
    .hint {
      bottom: 1.9rem; /* despeja la atribución del mapa principal */
    }
    .chip.right {
      top: 7rem; /* controles de zoom de 44px en móvil */
    }
  }
</style>
