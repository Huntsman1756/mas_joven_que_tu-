<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { parseUrl, serializeUrl, placeFromCatalog } from '$lib/domain/url';
  import { loadCatalog, loadMunicipalities } from '$lib/domain/catalog';
  import Hero from '$lib/components/Hero.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import { t } from '$lib/i18n/t';

  let ready = $state(false);
  let bootError = $state<string | null>(null);
  let suppressSync = false;

  async function applyUrl(s: ReturnType<typeof parseUrl>) {
    suppressSync = true;
    try {
      if (s.place) {
        const p = placeFromCatalog(s.place, app.municipalityCatalog);
        if (p) {
          const resolving = app.resolvePlace(p);
          if (s.lat !== null && s.lon !== null && s.z !== null) {
            app.view = { lat: s.lat, lon: s.lon, zoom: s.z };
            app.viewFromUrl = true;
          }
          if (s.year !== null) {
            app.year = s.year;
            app.phase = 'result';
            await resolving;
          }
          if (s.ortho !== null) {
            const c = app.allCampaigns.find((c) => c.year === s.ortho);
            if (c) {
              app.orthoCampaign = c;
              app.orthoVisible = true;
            }
          }
          return;
        }
      }
      if (s.year !== null) app.year = s.year;
    } finally {
      suppressSync = false;
    }
  }

  const onPop = () => {
    if (app.catalog) applyUrl(parseUrl(location.search, app.catalog.snapshot_year));
  };

  onMount(() => {
    window.addEventListener('popstate', onPop);
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
      ortho: app.orthoVisible && app.orthoCampaign ? app.orthoCampaign.year : null,
      building: app.selectedBuilding?.id ?? null,
    });
    const url = q || location.pathname;
    if (push) history.pushState({}, '', url);
    else history.replaceState({}, '', url);
  }

  function onViewChange() {
    syncUrl(false);
  }

  $effect(() => {
    const ph = app.phase;
    void app.year;
    void app.place;
    void app.selectedBuilding;
    void app.orthoVisible;
    if (!ready) return;
    const push = ph === 'result' && lastPhase === 'intro';
    lastPhase = ph;
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
      'Source Sans 3', 'Segoe UI', system-ui, -apple-system, sans-serif;
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
</style>
