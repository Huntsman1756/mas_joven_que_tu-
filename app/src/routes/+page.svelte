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
  import { base, resolve } from '$app/paths';
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
        // G11.3: la cámara solo se aplica si es válida completa; si el
        // enlace la traía rota se conserva municipio/año, se encuadra el
        // municipio (viewFromUrl queda false → MapView hace fit al
        // municipio) y se muestra un aviso. Se fija tras resolvePlace
        // porque selectPlace la limpia.
        if (s.camera === 'valid') {
          app.view = { lat: s.lat!, lon: s.lon!, zoom: s.z! };
          app.viewFromUrl = true;
        } else if (s.camera === 'invalid') {
          app.urlNotice = 'camera';
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
          if (s.camera === 'valid') {
            app.view = { lat: s.lat!, lon: s.lon!, zoom: s.z! };
            app.cameraTarget = { lat: s.lat!, lon: s.lon!, zoom: s.z! };
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
        // view=time sin play= explícito: el cabezal arranca pausado en
        // el año personal (mismo default que ViewSwitch.setMode) — entrar
        // en Evolución por enlace directo nunca muestra un modo vacío.
        if (app.mode === 'time' && s.play === null) {
          app.playYear = app.year;
          app.playing = false;
        }
        // exclusividad de escena (G4): hist⟺view=hist; ortho solo en FOTO
        app.histMapVisible = app.mode === 'hist';
        if (app.mode === 'photo') {
          applyCampaign(s.ortho);
          if (s.ortho2 !== null) {
            const c2 = app.allCampaigns.find((c) => c.year === s.ortho2);
            if (c2 && c2.year !== app.orthoCampaign?.year) app.orthoCompare = c2;
          }
        } else if (app.mode === 'swipe') {
          // G6/G16 SWIPE: imagen 2 (lienzo) = `ortho` o la última campaña;
          // imagen 1 (cortina) = `ortho2` o la heurística compartida.
          // Optimista: la capa se añade ya y la sonda la retira si falla.
          const c2 =
            s.ortho !== null ? app.allCampaigns.find((c) => c.year === s.ortho) : undefined;
          app.orthoCampaign = c2 ?? app.latest;
          app.orthoVisible = true;
          app.orthoState = 'UNKNOWN';
          app.orthoAlternatives = [];
          app.orthoCompare = null;
          app.photoView = 'a';
          const c1 =
            s.ortho2 !== null ? app.allCampaigns.find((c) => c.year === s.ortho2) : undefined;
          app.swipeBefore = c1 && c1.year !== app.orthoCampaign?.year ? c1 : null;
        } else {
          app.orthoVisible = false;
          app.orthoCompare = null;
        }
        // G16b: en modos con ortofoto la cámara de la URL ES el lugar
        // mostrado — la sonda comprueba ahí, no en el centroide municipal.
        // Sin cámara válida, null → la sonda cae al centro de `app.view`.
        if (app.mode === 'photo' || app.mode === 'swipe') {
          app.orthoPoint = s.camera === 'valid' ? [s.lon!, s.lat!] : null;
        }
        return;
      }
      // URL de portada (sin place ni story válido): fase intro explícita.
      // Sin esto, Atrás tras volver a casa dejaba phase=result con URL
      // limpia — la app mostraba el resultado contra una URL de portada.
      // La sesión conserva year/place: el formulario los precarga.
      if (!p) app.phase = 'intro';
      if (s.year !== null) app.year = s.year;
      if (app.story) app.closeStory({ restore: false });
    } finally {
      suppressSync = false;
    }
  }

  let lastSearch = '';
  const onPop = () => {
    // Un ancla del pie no es otra búsqueda: no reiniciar el visor.
    if (location.search === lastSearch) return;
    lastSearch = location.search;
    if (app.catalog) applyUrl(parseUrl(location.search, app.catalog.snapshot_year));
  };

  onMount(() => {
    lastSearch = location.search;
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
    // Durante el commit síncrono de una búsqueda, un moveend del mapa
    // llegaría aquí con el estado a medias y un replaceState pisaría la
    // entrada de history previa (lugar nuevo + URL de la búsqueda
    // anterior). El pushState del efecto sí pasa: es la entrada nueva.
    if (app.searchCommitting && !push) return;
    // La portada no serializa estado: volver a intro deja la URL limpia
    // (si conservara ?year&place, recargar la portada re-entraría al
    // resultado). El estado sí persiste en `app` — el formulario lo
    // precarga para modificarlo.
    const q =
      app.phase === 'result'
        ? serializeUrl({
            year: app.year,
            place: app.place?.slug ?? null,
            lat: app.view.lat,
            lon: app.view.lon,
            z: app.view.zoom,
            // `ortho`/`ortho2` sirven a los dos comparadores: en FOTO son
            // campaña activa + pareja del dúo; en SWIPE son imagen 2
            // (lienzo) e imagen 1 (cortina, solo si la eligió la persona —
            // la heurística por defecto se re-deriva sola).
            ortho:
              (app.mode === 'photo' || app.mode === 'swipe') &&
              app.orthoVisible &&
              app.orthoCampaign
                ? app.orthoCampaign.year
                : null,
            ortho2:
              app.mode === 'photo' && app.orthoCompare
                ? app.orthoCompare.year
                : app.mode === 'swipe'
                  ? (app.swipeBefore?.year ?? null)
                  : null,
            // `pendingBuildingId` mantiene `building=` mientras el restore del
            // deep link está en vuelo; si falla cerrado, el id se consume y cae
            // el param.
            building: app.selectedBuilding?.id ?? app.pendingBuildingId ?? null,
            // untrack: leer playYear aquí no debe suscribir el efecto al tick (G2 §8)
            play: untrack(() => app.playYear),
            view: app.mode,
            compare: app.compareYear,
            story: app.story
          })
        : '';
    // shallow routing de SvelteKit (no el history API nativo, que entra en
    // conflicto con el router y emite warning en dev); resolve() valida que
    // la ruta pertenece a la app y añade paths.base — por eso hay que pasarle
    // el pathname SIN base (con base no vacío, location.pathname ya lo lleva
    // y la URL se duplicaba: /mas_joven_que_tu-/mas_joven_que_tu-/…).
    const path =
      base && location.pathname.startsWith(base)
        ? location.pathname.slice(base.length) || '/'
        : location.pathname;
    const url = resolve((q ? `${path}${q}` : path) as '/' | `/?${string}`);
    lastSearch = q;
    if (push) pushState(url, {});
    else replaceState(url, {});
  }

  function onViewChange() {
    syncUrl(false);
  }

  let lastStory: string | null = null;
  let lastNavSeq = 0;
  let lastSearchSeq = 0;
  $effect(() => {
    const ph = app.phase;
    void app.year;
    void app.place;
    void app.selectedBuilding;
    void app.pendingBuildingId;
    void app.orthoVisible;
    void app.orthoCampaign;
    void app.swipeBefore;
    void app.mode;
    void app.compareYear;
    void app.orthoCompare;
    const st = app.story;
    // playUrlSeq sube solo en eventos discretos del Play (nunca por frame):
    // la URL captura el cabezal pausado, no la animación en curso (G2 §8).
    void app.playUrlSeq;
    // modeNavSeq sube solo en cambios de modo explícitos del usuario
    // (G8): cada cambio de vista es una entrada de history — Back/Forward
    // recorre modos; los restores de URL no lo tocan (sin rebote).
    const navSeq = app.modeNavSeq;
    // searchNavSeq sube solo al confirmar una búsqueda (año+lugar) desde
    // el editor: año, lugar y cámara ya están en su estado final en el
    // mismo tick → una única entrada lógica, sin estados transitorios.
    const searchSeq = app.searchNavSeq;
    if (!ready) return;
    // abrir/cerrar un capítulo, volver a la portada y confirmar una
    // búsqueda nueva son eventos discretos y compartibles: push, para que
    // Back/Forward recorra historia ↔ estado personal y resultado ↔
    // portada ↔ búsquedas confirmadas.
    const push =
      (ph === 'result' && lastPhase === 'intro') ||
      (ph === 'intro' && lastPhase === 'result') ||
      st !== lastStory ||
      navSeq !== lastNavSeq ||
      searchSeq !== lastSearchSeq;
    lastPhase = ph;
    lastStory = st;
    lastNavSeq = navSeq;
    lastSearchSeq = searchSeq;
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
  /* G11.3: tokens/reset/globales viven en app.css (layout compartido);
     aquí solo lo específico de esta ruta. */
  .skip {
    position: absolute;
    left: -9999px;
    top: 0;
    background: #182631;
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
    color: var(--ink-3);
  }
  .boot-err {
    padding: 3rem;
    color: var(--accent-deep);
  }
</style>
