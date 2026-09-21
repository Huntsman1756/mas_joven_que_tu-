<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { rasterSourceDef, previewSourceDef, probeCampaign } from '$lib/domain/ortho';
  import { probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { preloadMapEngine } from '$lib/map/engine';
  import { mapSync } from '$lib/map/sync';
  import { PALETTE } from '$lib/palette';
  import { t } from '$lib/i18n/t';
  import type * as maplibregl from 'maplibre-gl';
  import type { Map as MLMap } from 'maplibre-gl';

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

  let after = $derived(app.latest ?? null);
  let before = $derived.by(() => {
    const latest = app.latest;
    const nearest = app.nearest;
    if (nearest && latest && nearest.year !== latest.year) return nearest;
    // caso degenerado (nacido cerca de la última campaña) o sin
    // referencia personal: la campaña anterior a la última; si no hay,
    // la BFA 1956 como ancla histórica.
    const li = app.allCampaigns.findIndex((c) => c === latest);
    return (
      (li > 0 ? app.allCampaigns[li - 1] : null) ??
      app.allCampaigns.find((c) => c.year === 1956 && c.source === 'bizkaia') ??
      app.allCampaigns[0] ??
      null
    );
  });

  let wrap = $state<HTMLDivElement | null>(null);
  let paneEl = $state<HTMLDivElement | null>(null);
  let map: MLMap | null = null;
  let pct = $state(50);
  let dragging = $state(false);
  // 'probing' → sonda de contenido en curso; 'ready' → cortina visible;
  // 'error' → campaña «antes» no verificable aquí: cortina oculta + nota honesta.
  let beforeState = $state<'probing' | 'ready' | 'error'>('probing');
  let tilesReady = $state(false);

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
  $effect(() => {
    const c = before;
    const p = app.place;
    if (!c || !p) return;
    let live = true;
    beforeState = 'probing';
    void probeCampaign(c, p.lon, p.lat).then((st) => {
      if (live) beforeState = st === 'AVAILABLE' ? 'ready' : 'error';
    });
    return () => {
      live = false;
    };
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
      }
      attachSync();
      map!.once('idle', () => (tilesReady = true));
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
    {#if beforeState === 'ready'}
      <div class="divider" style:left="{pct}%" aria-hidden="true"></div>
      <span class="chip left" aria-hidden="true">{before.year}</span>
      <span class="chip right" aria-hidden="true"
        >{t('swipe.today', { year: after?.year ?? '' })}</span
      >
      <div
        class="handle"
        role="slider"
        tabindex="0"
        aria-label={t('swipe.slider', { before_year: before.year })}
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
           — botones que la llevan a cada extremo. El arrastre y el teclado
           del slider siguen disponibles. -->
      <div class="presets" role="group" aria-label={t('swipe.presets')}>
        <button type="button" onclick={() => (pct = 100)}>
          {t('swipe.only_before', { year: before.year })}
        </button>
        <button type="button" onclick={() => (pct = 0)}>
          {t('swipe.only_after')}
        </button>
      </div>
    {:else if beforeState === 'error'}
      <p class="swipe-msg" role="status">{t('swipe.error', { year: before.year })}</p>
    {:else}
      <p class="swipe-msg" role="status">{t('swipe.loading', { year: before.year })}</p>
    {/if}
    {#if beforeState === 'ready' && !tilesReady}
      <p class="swipe-msg" role="status">{t('swipe.tiles', { year: before.year })}</p>
    {/if}
    {#if afterFailed}
      <p class="swipe-msg top" role="status">
        {t('swipe.after_error', { year: after?.year ?? '' })}
      </p>
    {/if}
    {#if after}
      <p class="src">{t('swipe.src', { before_year: before.year, after_year: after.year })}</p>
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
    font-size: 0.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
  }
  .chip.left {
    left: 0.6rem;
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
    bottom: 2.4rem; /* sobre la fila presets/fuente (G11) */
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.7rem;
    padding: 0.2rem 0.55rem;
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
    font-size: 0.72rem;
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
  .swipe-msg {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    background: rgba(24, 38, 49, 0.78);
    color: var(--paper);
    font-size: 0.75rem;
    padding: 0.3rem 0.7rem;
    border-radius: 4px;
    white-space: nowrap;
    max-width: 92%;
  }
  .swipe-msg.top {
    top: 0.6rem;
    bottom: auto;
    background: var(--warn-bg);
    color: var(--warn-text);
    border: 1px solid var(--warn-line);
    white-space: normal;
    text-align: center;
  }
  .src {
    position: absolute;
    right: 0.6rem;
    bottom: 0.5rem;
    margin: 0;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.68rem;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    max-width: 60%;
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
