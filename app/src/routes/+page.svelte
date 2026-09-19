<script module lang="ts">
  import { browser } from '$app/environment';
  import { preloadMapEngine } from '$lib/map/engine';
  import { warmMetrics } from '$lib/domain/catalog';

  // Deep link a RESULT (?place=…): el mapa y las métricas son inevitables →
  // arrancar el motor al evaluar el módulo (antes de onMount) y solapar el
  // chunk de MapLibre con catálogo + métricas (PERF4/7). El slug de la URL
  // coincide con el fichero de métricas → se calienta sin esperar al catálogo.
  const urlPlace = browser ? new URLSearchParams(location.search).get('place') : null;
  if (urlPlace) {
    void preloadMapEngine();
    if (/^[a-z0-9-]+$/.test(urlPlace)) warmMetrics(`metrics/${urlPlace}.json`);
  }
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { pushState, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { app } from '$lib/state/app.svelte';
  import { parseUrl, serializeUrl, placeFromCatalog } from '$lib/domain/url';
  import { storyDef } from '$lib/domain/stories';
  import { loadCatalog, loadMunicipalities } from '$lib/domain/catalog';
  import Hero from '$lib/components/Hero.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import { t } from '$lib/i18n/t';

  let ready = $state(false);
  let bootError = $state<string | null>(null);
  let suppressSync = false;

  function applyCampaign(year: number | null): void {
    if (year === null) return;
    const c = app.allCampaigns.find((c) => c.year === year);
    if (c) {
      app.orthoCampaign = c;
      app.orthoVisible = true;
    }
  }

  async function applyUrl(s: ReturnType<typeof parseUrl>) {
    suppressSync = true;
    try {
      const def = storyDef(s.story);
      // story= ancla su propio municipio; un place= distinto junto a story=
      // se trata como estado personal preservable («volver a mi Bizkaia»).
      const personalSlug = def && s.place && s.place !== def.place ? s.place : null;
      const placeSlug = personalSlug ?? (def ? def.place : s.place);
      const p = placeFromCatalog(placeSlug, app.municipalityCatalog);
      if (p) {
        const resolving = app.resolvePlace(p);
        if (s.lat !== null && s.lon !== null && s.z !== null) {
          app.view = { lat: s.lat, lon: s.lon, zoom: s.z };
          app.viewFromUrl = true;
        }
        if (s.year !== null || def) {
          app.year = s.year ?? def?.year ?? null;
          app.phase = 'result';
        }
        await resolving;
        if (s.play !== null) {
          // deep link temporal: cabezal pausado en P, nunca autoplay
          app.playYear = s.play;
          app.playing = false;
        }
        // vista MAPA·TIEMPO·FOTO·1923-25 (G2-B/G4): 'map' es el default;
        // `ortho=` sin `view=` implica FOTO (contrato de escena unificada).
        app.mode = s.view ?? (s.ortho !== null ? 'photo' : 'map');
        // DOS AÑOS (G3-A): `compare` es independiente de `year` (GA6);
        // compare == year es una partición vacía — se rechaza como en UI
        app.compareYear = s.compare !== null && s.compare === s.year ? null : s.compare;
        // MI EDIFICIO (G3-A): `building=` restaura la selección por id
        // catastral — nunca texto de dirección (privacidad, GA4)
        app.pendingBuildingId = s.building;
        if (def && app.story !== def.id) {
          await app.enterStory(def, { snapshot: personalSlug !== null });
        } else if (!def && app.story) {
          // la URL describe un estado nuevo: salir de la historia sin
          // restaurar el snapshot (que pisaría lo que la URL pide)
          app.closeStory({ restore: false });
        }
        // Reaplicar tras cualquier resolvePlace/enterStory: la URL manda.
        if (def) {
          if (s.lat !== null && s.lon !== null && s.z !== null) {
            app.view = { lat: s.lat, lon: s.lon, zoom: s.z };
            app.cameraTarget = { lat: s.lat, lon: s.lon, zoom: s.z };
            app.cameraSeq++;
          }
          // Con place= personal (≠ ancla), year= describe ese estado
          // personal — ya capturado en el snapshot; la escena conserva el
          // año de referencia del capítulo. Sin él, year= sí es de escena.
          if (s.year !== null && !personalSlug) app.year = s.year;
          if (s.play !== null) app.playYear = s.play;
          if (s.view) app.mode = s.view;
          app.compareYear = s.compare !== null && s.compare === s.year ? null : s.compare;
          app.pendingBuildingId = s.building;
        }
        // exclusividad de escena (G4): hist⟺view=hist; ortho solo en FOTO
        app.histMapVisible = app.mode === 'hist';
        if (app.mode === 'photo') {
          applyCampaign(s.ortho);
          if (s.ortho2 !== null) {
            const c2 = app.allCampaigns.find((c) => c.year === s.ortho2);
            if (c2 && c2.year !== app.orthoCampaign?.year) app.orthoCompare = c2;
          }
        } else {
          app.orthoVisible = false;
          app.orthoCompare = null;
        }
        return;
      }
      if (s.year !== null) app.year = s.year;
      if (app.story) app.closeStory({ restore: false });
    } finally {
      suppressSync = false;
    }
  }

  const onPop = () => {
    if (app.catalog) applyUrl(parseUrl(location.search, app.catalog.snapshot_year));
  };

  onMount(() => {
    window.addEventListener('popstate', onPop);
    // handle de QA (mismo patrón que __mjtMap): los harness leen estado real,
    // nunca escriben — T1 se mide observando mutaciones de `year`.
    (window as unknown as Record<string, unknown>).__mjtApp = app;
    void (async () => {
      try {
        const [catalog, munis] = await Promise.all([loadCatalog(), loadMunicipalities()]);
        app.catalog = catalog;
        app.municipalityCatalog = munis;

        await applyUrl(parseUrl(location.search, catalog.snapshot_year));
        ready = true;
      } catch (e) {
        bootError = String(e);
      }
    })();
    return () => window.removeEventListener('popstate', onPop);
  });

  // sincronización URL → history (replace para la vista, push al entrar en RESULT)
  let lastPhase = 'intro';
  function syncUrl(push = false) {
    if (suppressSync || !ready) return;
    const q = serializeUrl({
      year: app.year,
      place: app.place?.slug ?? null,
      lat: app.view.lat,
      lon: app.view.lon,
      z: app.view.zoom,
      ortho:
        app.mode === 'photo' && app.orthoVisible && app.orthoCampaign
          ? app.orthoCampaign.year
          : null,
      ortho2: app.mode === 'photo' && app.orthoCompare ? app.orthoCompare.year : null,
      // `pendingBuildingId` mantiene `building=` mientras el restore del deep
      // link está en vuelo; si falla cerrado, el id se consume y cae el param.
      building: app.selectedBuilding?.id ?? app.pendingBuildingId ?? null,
      // untrack: leer playYear aquí no debe suscribir el efecto al tick (G2 §8)
      play: untrack(() => app.playYear),
      view: app.mode,
      compare: app.compareYear,
      story: app.story
    });
    // shallow routing de SvelteKit (no el history API nativo, que entra en
    // conflicto con el router y emite warning en dev); resolve() valida que
    // la ruta pertenece a la app y respeta paths.base
    const url = resolve(
      (q ? `${location.pathname}${q}` : location.pathname) as '/' | `/?${string}`
    );
    if (push) pushState(url, {});
    else replaceState(url, {});
  }

  function onViewChange() {
    syncUrl(false);
  }

  let lastStory: string | null = null;
  $effect(() => {
    const ph = app.phase;
    void app.year;
    void app.place;
    void app.selectedBuilding;
    void app.pendingBuildingId;
    void app.orthoVisible;
    void app.mode;
    void app.compareYear;
    void app.orthoCompare;
    const st = app.story;
    // playUrlSeq sube solo en eventos discretos del Play (nunca por frame):
    // la URL captura el cabezal pausado, no la animación en curso (G2 §8).
    void app.playUrlSeq;
    if (!ready) return;
    // abrir/cerrar un capítulo es un evento discreto y compartible: push,
    // para que Back/Forward recorra historia ↔ estado personal.
    const push = (ph === 'result' && lastPhase === 'intro') || st !== lastStory;
    lastPhase = ph;
    lastStory = st;
    syncUrl(push);
  });
</script>

<svelte:head>
  <title>{t('hero.title')} — {t('hero.tagline')}</title>
</svelte:head>

<a class="skip" href="#main">{t('a11y.skip')}</a>
<main id="main">
  {#if bootError}
    <p class="boot-err" role="alert">{t('error.generic')}</p>
  {:else if !ready}
    <p class="boot" role="status" aria-live="polite">…</p>
  {:else if app.phase === 'intro'}
    <Hero snapshotYear={app.catalog?.snapshot_year ?? 2026} />
  {:else}
    <ResultView {onViewChange} />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family:
      'Source Sans 3',
      'Segoe UI',
      system-ui,
      -apple-system,
      sans-serif;
    color: #1c1a17;
  }
  .skip {
    position: absolute;
    left: -9999px;
    top: 0;
    background: #18181b;
    color: #fff;
    padding: 0.5rem 1rem;
    z-index: 100;
  }
  .skip:focus {
    left: 0;
  }
  .boot {
    padding: 3rem;
    text-align: center;
    color: #605e56;
  }
  .boot-err {
    padding: 3rem;
    color: #7a1f2e;
  }
  /* A9/U6: todo objetivo táctil ≥ 44×44 px en móvil (390×844) */
  @media (max-width: 700px) {
    :global(button),
    :global(input),
    :global([role='option']) {
      min-height: 44px;
      min-width: 44px;
    }
    :global(a[href]) {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
    :global(.maplibregl-ctrl-group button) {
      width: 44px;
      height: 44px;
    }
  }
</style>
