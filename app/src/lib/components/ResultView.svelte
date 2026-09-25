<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';
  import { fmt, fmtPct, relYearShort } from '$lib/domain/format';
  import { ArrowRight, Pencil } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import { activateOrtho } from '$lib/domain/ortho-probe.svelte';
  import { parseYearInput } from '$lib/domain/url';
  import { approxOfTen, approxKind } from '$lib/domain/human';
  import { tick } from 'svelte';
  import type { Place } from '$lib/domain/types';
  import MapView from '$lib/map/MapView.svelte';
  import Timeline from './EvolutionTimePlayer.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import CellDetail from './CellDetail.svelte';
  import Lazy from './Lazy.svelte';
  import LazyView from './LazyView.svelte';
  import ShareButton from './ShareButton.svelte';
  import PlaceSearch from './PlaceSearch.svelte';
  import LangSwitch from './LangSwitch.svelte';

  let {
    onViewChange = () => {}
  }: { onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void } = $props();

  let changing = $state(false);
  let yearStr = $state('');
  let yearErr = $state(false);
  // Borrador del editor: el municipio candidato vive aquí hasta
  // confirmar — nunca en `app` (cancelar = descartar estas tres líneas).
  let draftPlace = $state<Place | null>(null);
  let draftText = $state('');
  let placeErr = $state(false);

  let h = $derived(app.headline);
  let lowCoverage = $derived(h !== null && h.coveragePct < 70);

  // G5-R2 (prioridad humana 1): al entrar en «En el tiempo» el eje se
  // inserta sobre el mapa y puede quedar fuera de pantalla — se lleva a
  // la vista. Solo en cambios de modo por el usuario, no en la carga
  // inicial (un deep link ?view=time no debe secuestrar el scroll).
  let sceneEl = $state<HTMLElement | null>(null);
  let stageEl = $state<HTMLElement | null>(null);
  let selectionEl = $state<HTMLElement | null>(null);
  let previousSelection = '';
  $effect(() => {
    const key = app.selectedBuilding?.id
      ? `building:${app.selectedBuilding.id}`
      : app.selectedCell
        ? `cell:${app.selectedCell.mun}:${app.selectedCell.fid}`
        : app.cellInspectNone
          ? 'empty'
          : '';
    if (key === previousSelection) return;
    previousSelection = key;
    if (!key) return;
    let cancelled = false;
    void tick().then(() => {
      if (cancelled || !selectionEl || !matchMedia('(min-width: 1024px)').matches) return;
      const rect = selectionEl.getBoundingClientRect();
      if (rect.bottom > innerHeight || rect.top < 0)
        selectionEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => {
      cancelled = true;
    };
  });
  let prevMode: string | null = null;
  let modeInit = false;
  $effect(() => {
    const m = app.mode;
    if (!modeInit) {
      modeInit = true;
      prevMode = m;
      return;
    }
    if (m === prevMode) return;
    prevMode = m;
    if (m === 'time') {
      void tick().then(() => {
        const el = sceneEl?.querySelector('.timeband');
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    }
  });

  // G5-E: comparación lado a lado solo en pantalla ancha; en estrecha el
  // toggle del panel elige la campaña del lienzo único (photoView).
  // Lectura inmediata (no solo en $effect): si esperásemos al primer
  // efecto, la escena montaría los controles en posición de escritorio
  // y los remontaría al instante — perdiendo estado y foco (G15b).
  let narrow = $state(typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches);
  // G15: escena apilada (≤1023): la invitación a explorar cierra el
  // bloque tras el mapa, no antes — el lienzo entra en primera pantalla.
  let stacked = $state(
    typeof matchMedia === 'function' && matchMedia('(max-width: 1023px)').matches
  );

  /** Selector estable del control equivalente tras un remontaje:
   *  identidad de ACCIÓN (`data-action`), no clases compartidas ni
   *  texto traducido. `data-year` (campaña, alternativa) distingue el
   *  miembro dentro de una familia de acciones. */
  function controlFocusSel(el: HTMLElement): string | null {
    const a = el.dataset.action;
    if (!a) return null;
    if (el.dataset.year) return `[data-action="${a}"][data-year="${el.dataset.year}"]`;
    return `[data-action="${a}"]`;
  }

  $effect(() => {
    const mq = matchMedia('(max-width: 700px)');
    const ms = matchMedia('(max-width: 1023px)');
    const apply = () => {
      const nextStacked = ms.matches;
      // G15b: cruzar el breakpoint remonta los controles contextuales en
      // otra posición del DOM. Si el foco estaba dentro de uno, se anota
      // ANTES del cambio (al destruirse ya es tarde: activeElement ya es
      // body) y se devuelve al control equivalente tras el remontaje.
      let focusSel: string | null = null;
      if (nextStacked !== stacked) {
        const ae = document.activeElement;
        if (ae instanceof HTMLElement && ae.closest('.timeband, .photo, .histmap, .swipectl')) {
          focusSel = controlFocusSel(ae);
        }
      }
      narrow = mq.matches;
      stacked = nextStacked;
      if (focusSel) {
        const sel = focusSel;
        void tick().then(() => {
          // el panel puede tardar unos frames (chunk perezoso): reintenta
          // hasta 30 frames (no es un tiempo fijo: depende de la tasa de
          // refresco y la planificación). Solo devuelve el foco si sigue
          // en body — si el usuario ya movió el foco no se le pisa.
          const tryFocus = (n: number) => {
            const ctl = sceneEl?.querySelector<HTMLElement>(
              '.timeband, .photo, .histmap, .swipectl'
            );
            if (!ctl) {
              if (n > 0) requestAnimationFrame(() => tryFocus(n - 1));
              return;
            }
            // si el usuario ya movió el foco, no se le pisa
            if (document.activeElement && document.activeElement !== document.body) return;
            // la acción equivalente; si ya no existe (p. ej. cambió el
            // estado entre medias), el primer control del panel
            const target =
              ctl.querySelector<HTMLElement>(sel) ??
              ctl.querySelector<HTMLElement>('[data-action]');
            target?.focus();
          };
          tryFocus(30);
        });
      }
    };
    apply();
    mq.addEventListener('change', apply);
    ms.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      ms.removeEventListener('change', apply);
    };
  });
  let photoDuo = $derived(app.mode === 'photo' && !!app.orthoCompare && !narrow);

  // G19-R2 — shell común: los cinco modos comparten la misma geometría
  // (columna de resultado + visor) en desktop; cambiar de modo cambia
  // el contenido/control del mapa, no la arquitectura de la página.
  // En pantalla apilada los modos de visor siguen yendo a lienzo pleno
  // y «‹ Resultado» recupera la pantalla narrativa.
  let viewer = $derived(app.mode !== 'map');
  let showSidebar = $derived(!viewer || !stacked);
  // variable de posición del chrome: --tcbh = alto de la barra temporal
  // anclada al borde inferior del lienzo (≤1023px)
  // G19-R4: el reproductor solo existe en los modos temporales — un
  // playYear persistido en Edificios es estado guardado, no chrome.
  let hasBottomChrome = $derived(app.mode === 'time' || app.mode === 'photo');
  let hasSelection = $derived(!!(app.selectedCell || app.cellInspectNone || app.selectedBuilding));

  // G19 §13/§17 (solo pantalla apilada): el lienzo llena la primera
  // pantalla cuando no hay columna lateral. `.result` es una columna
  // flex que crece con `.below` — `flex:1` no tiene espacio libre que
  // repartir, así que medimos la posición real del stage y le damos
  // `min-height` = viewport − su borde superior. En desktop el visor
  // usa clamp() (G19-R2) y este ajuste no aplica.
  $effect(() => {
    if (!viewer || !stacked || !stageEl) return;
    const el = stageEl;
    const fit = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.minHeight = `max(20rem, ${Math.round(vh - top)}px)`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      el.style.minHeight = '';
    };
  });

  // PERF4-R3: los deep links que restauran contenido below-fold
  // (?story=, ?building=, ?compare=, restauración fallida) montan el
  // chunk inmediatamente; sin deep link espera a viewport/focusin.
  let forceBelow = $derived(
    !!(app.story || app.selectedBuilding || app.compareYear !== null || app.buildingRestoreFailed)
  );
  $effect(() => {
    if (photoDuo) app.photoView = 'a'; // en dúo el lienzo principal es siempre A
  });

  // G8 — «Ver cómo era» ya no es una categoría del selector: es un CTA
  // narrativo que lleva a FOTOS con la campaña más próxima al año del
  // usuario, sondeada en el acto, y trae el visor a la vista.
  async function goSeeHowItWas() {
    const c = app.nearest;
    if (!c) return;
    const wasPhoto = app.mode === 'photo';
    activateOrtho(c);
    if (!wasPhoto) app.modeNavSeq++; // el CTA es un cambio de modo explícito (G8)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    sceneEl?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // PhotoPanel es un chunk lazy: espera a que monte antes de enfocar.
    for (let i = 0; i < 40; i++) {
      await tick();
      const el = sceneEl?.querySelector<HTMLElement>('.photo');
      if (el) {
        el.focus();
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  function openEditor() {
    changing = true;
    app.pausePlayback();
    yearStr = String(app.year ?? '');
    yearErr = false;
    draftPlace = app.place;
    draftText = app.place?.name ?? '';
    placeErr = false;
  }

  /** Cancelar: el borrador se descarta entero — app/URL/historial intactos. */
  function cancelChange() {
    changing = false;
    yearErr = false;
    placeErr = false;
  }

  // El error de municipio se limpia en cuanto el borrador vuelve a ser
  // una opción elegida — no hace falta otro intento de envío.
  $effect(() => {
    if (placeErr && draftPlace && draftText.trim() === draftPlace.name) placeErr = false;
  });

  // G10-01: año inválido nunca cierra el editor ni toca estado/URL —
  // error visible + aria-invalid/describedby + foco de vuelta al campo.
  // Mismo dominio válido que Hero/URL: parseYearInput (entero 1900..snapshot).
  async function applyChange() {
    const max = app.catalog?.snapshot_year ?? app.metrics?.snapshot_year ?? 2026;
    const y = parseYearInput(yearStr, max);
    if (y === null) {
      yearErr = true;
      await tick();
      document.getElementById('edit-year')?.focus();
      return;
    }
    // El borrador solo vale si el texto corresponde a una opción elegida
    // de la lista: un nombre escrito sin seleccionar bloquea la
    // confirmación (misma regla que la portada).
    const p = draftPlace;
    if (!p || draftText.trim() !== p.name) {
      placeErr = true;
      await tick();
      document.getElementById('place-input')?.focus();
      return;
    }
    yearErr = false;
    placeErr = false;
    if (p.slug === app.place?.slug && y === app.year) {
      // confirmar sin cambios: no muta estado ni crea entrada de history
      changing = false;
      return;
    }
    changing = false;
    await app.commitSearch(p, y);
  }
</script>

<div class="result">
  <header class="topbar">
    <!-- La marca vuelve a la portada sin borrar año/municipio: el estado
         queda en `app` y el formulario lo precarga. href real para que el
         enlace sea reconocible (menú contextual, lector); el click se
         intercepta para no perder la sesión. -->
    <a
      class="brand"
      href={resolve('/')}
      onclick={(e) => {
        e.preventDefault();
        app.phase = 'intro';
      }}>{t('hero.title')}</a
    >
    {#if app.year !== null && app.place && !changing}
      <span class="ctx" aria-hidden="true">{app.year} · {app.place.name}</span>
    {/if}
    <div class="controls">
      <button
        class="change"
        aria-expanded={changing}
        aria-label={changing ? t('result.change.cancel') : t('result.change')}
        title={changing ? t('result.change.cancel') : t('result.change')}
        onclick={() => (changing ? cancelChange() : openEditor())}
      >
        {#if changing}
          {t('result.change.cancel')}
        {:else}
          <Pencil size={14} strokeWidth={2} aria-hidden="true" />{t('result.change.short')}
        {/if}
      </button>
      <ShareButton />
      <LangSwitch />
    </div>
  </header>
  {#if app.urlNotice === 'camera'}
    <p class="urlnotice" role="status">
      {t('url.camera_reset')}
      <button type="button" onclick={() => (app.urlNotice = null)}>{t('ui.dismiss')}</button>
    </p>
  {/if}
  {#if changing}
    <!-- novalidate: la validación «escrito ≠ seleccionado» se muestra en
         línea (cf-err) como el error de año, no solo con burbuja nativa -->
    <form
      class="changeform"
      novalidate
      onsubmit={(e) => {
        e.preventDefault();
        applyChange();
      }}
    >
      <div class="cf">
        <label class="cf-lbl" for="edit-year">{t('hero.label.year')}</label>
        <input
          id="edit-year"
          bind:value={yearStr}
          oninput={() => (yearErr = false)}
          inputmode="numeric"
          maxlength="4"
          placeholder={String(app.year ?? '')}
          aria-invalid={yearErr}
          aria-describedby={yearErr ? 'edit-year-err' : undefined}
        />
        {#if yearErr}
          <p id="edit-year-err" class="cf-err" role="alert">
            {t('hero.year.invalid', {
              snapshot_year: app.catalog?.snapshot_year ?? app.metrics?.snapshot_year ?? 2026
            })}
          </p>
        {/if}
      </div>
      <div class="cf grow">
        <span class="cf-lbl">{t('hero.label.place')}</span>
        <PlaceSearch
          compact
          draft
          bind:value={draftText}
          bind:picked={draftPlace}
          invalid={placeErr}
          errId="edit-place-err"
        />
        {#if placeErr}
          <p id="edit-place-err" class="cf-err" role="alert">
            {t('search.choose_from_list')}
          </p>
        {/if}
      </div>
      <div class="cf-actions">
        <button class="cf-cancel" type="button" onclick={cancelChange}>
          {t('result.change.cancel')}
        </button>
        <button class="cf-submit" type="submit">{t('result.change.apply')}</button>
      </div>
    </form>
  {/if}

  {#if app.place}
    <!-- G11 — dato y territorio en la misma primera vista: panel
         narrativo (300–340 px) a la izquierda, escena/mapa a la
         derecha. Sin fila de KPI duplicada: población y década viven
         en sus capítulos below-fold.
         G19-R2 — la columna de resultado permanece en los cinco modos
         en desktop (el visor cambia de contenido, no de geometría).
         En apilado los modos de visor van a lienzo pleno y la columna
         se recupera con «‹ Resultado». -->
    <div class="stage" class:viewer bind:this={stageEl}>
      {#if showSidebar}
        <div class="sidebar">
          {#if h && app.year !== null}
            <!-- RESPUESTA: la frase llana ES el titular; el porcentaje
             exacto y el desglose quedan como apoyo. -->
            <section class="headline-block panel">
              <!-- G13: la frase llana ES el titular; el porcentaje exacto
               queda como cifra de apoyo. Municipio + año en el kicker. -->
              <p class="kicker">
                {t('result.kicker', { municipality: app.place.name, selected_year: app.year })}
              </p>
              <h1 class="lead">
                {#if approxKind(h.sharePct) === 'none'}
                  {t('result.lead.none')}
                {:else}
                  {t('result.lead.some', { approx: approxOfTen(h.sharePct, locale.lang) })}
                {/if}
              </h1>
              <p class="support">
                {t('result.support')}
                <strong>{t('result.pct_value', { pct: fmtPct(h.sharePct) })}</strong>
              </p>
              {#if !stacked}
                <p class="invite">{t('result.invite')}</p>
              {/if}
              {#if lowCoverage}
                <p class="warn" role="note">{t('result.low_coverage')}</p>
              {/if}
              {#if app.nearest && !stacked}
                <button class="cta-era" onclick={goSeeHowItWas}>
                  {t('view.cta_era')}
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </button>
                <p class="photo-rel">
                  {t('view.cta_era.note', { campaign_year: app.nearest.year })}
                  {#if relYearShort(app.nearest.year, app.year, t, locale.lang)}
                    · {relYearShort(app.nearest.year, app.year, t, locale.lang)}{/if}
                </p>
              {/if}
              <!-- Recuento y cobertura visibles; el detalle metodológico se despliega. -->
              <p class="lead2">
                {t('result.lead', { known: fmt(h.known), after: fmt(h.after) })}
              </p>
              <p class="coverage">
                {t('result.coverage', { coverage_pct: fmtPct(h.coveragePct) })}
              </p>
              <details class="about-data">
                <summary>{t('result.about_data')}</summary>
                <p>
                  {t('result.coverage.detail.body', {
                    known: fmt(h.known),
                    total: fmt(h.total)
                  })}
                  {#if h.unknown > 0 && h.suspicious > 0}
                    {t('result.coverage.unknown_note', {
                      unknown: fmt(h.unknown),
                      suspicious: fmt(h.suspicious)
                    })}
                  {:else if h.unknown > 0}
                    {t('result.coverage.unknown_only', { unknown: fmt(h.unknown) })}
                  {:else if h.suspicious > 0}
                    {t('result.coverage.suspicious_only', { suspicious: fmt(h.suspicious) })}
                  {/if}
                </p>
              </details>
            </section>
          {:else if app.metricsError}
            <p class="resolving" role="alert">{t('error.metrics')}</p>
          {:else}
            <p class="resolving" role="status">{t('search.searching')}</p>
          {/if}

          {#if hasSelection}
            <div class="selection-panel" bind:this={selectionEl} aria-live="polite">
              <CellDetail />
              {#if app.selectedBuilding}
                <Lazy loader={() => import('./BuildingCard.svelte')} />
              {/if}
            </div>
          {/if}
        </div>
      {:else if !h}
        <!-- en visor apilado (sin columna) el resultado sigue
             resolviéndose — el estado de carga/error no se traga el
             lienzo -->
        {#if app.metricsError}
          <p class="resolving" role="alert">{t('error.metrics')}</p>
        {:else}
          <p class="resolving" role="status">{t('search.searching')}</p>
        {/if}
      {/if}

      {#snippet modeControls()}
        {#if app.mode === 'time'}
          <!-- G19-R4: el reproductor solo existe dentro de Evolución —
               playYear persistido en Edificios no monta el chrome. -->
          <Timeline />
        {:else if app.mode === 'photo'}
          <Lazy loader={() => import('./PhotoPanel.svelte')} />
        {:else if app.mode === 'hist'}
          <Lazy loader={() => import('./HistMapControls.svelte')} />
        {:else if app.mode === 'swipe'}
          <Lazy loader={() => import('./SwipeControls.svelte')} />
        {/if}
      {/snippet}

      <!-- ESCENA ÚNICA (G5/G8, G19): un lienzo, cinco modos en una sola
           jerarquía. En los modos de visor el mapa es el producto: el
           selector de modo sigue arriba y después empieza el canvas —
           los controles contextuales son chrome flotante DENTRO del
           lienzo (capa .tclayer del overlay de MapView), no filas de
           página. -->
      <div id="scene" bind:this={sceneEl}>
        <ViewSwitch />

        {#if h && app.year !== null}
          <!-- En visor apilado (sin columna) el titular editorial no se
               monta: el resumen sr-only pasa a ser el h1 de la página
               (axe page-has-heading-one). Cuando la columna está
               presente queda como párrafo de apoyo junto al h1.lead
               visible. -->
          <svelte:element this={viewer && stacked ? 'h1' : 'p'} class="sr-summary">
            {t('result.text_summary', {
              municipality: app.place.name,
              total: fmt(h.total),
              known: fmt(h.known),
              after: fmt(h.after),
              selected_year: app.year
            })}
          </svelte:element>
        {/if}

        <!-- G12 + G19-R3 — ModeIntroSlot: la misma franja estructural
             en los cinco modos, entre el selector y el lienzo, así el
             mapa empieza siempre en el mismo sitio (geometría compartida,
             contenido distinto). En «Edificios» es la explicación
             completa del G12 (qué pinta cada color); en los modos de
             visor una línea de contexto breve y la explicación detallada
             sigue tras el ⓘ del reproductor. Nunca lleva controles
             temporales: la barra vive dentro del lienzo. -->
        <div class="mapintro">
          {#if app.mode === 'map'}
            <p>
              <strong>{t('map.intro.title')}</strong>
              {#if app.mapLevel === 'BIZKAIA'}
                {t('map.intro.munis', { selected_year: app.year ?? '' })}
              {:else if app.mapLevel === 'CELDA'}
                {t('map.intro.cells', { selected_year: app.year ?? '' })}
              {:else}
                {t('map.intro.buildings', { selected_year: app.year ?? '' })}
              {/if}
            </p>
          {:else if app.mode === 'time'}
            <p>
              <strong>{t('view.intro.time.title')}</strong>
              {t('view.intro.time.body')}
            </p>
          {:else if app.mode === 'photo'}
            <p>
              <strong>{t('view.intro.photo.title')}</strong>
              {t('view.intro.photo.body')}
            </p>
          {:else if app.mode === 'hist'}
            <p>
              <strong>{t('view.intro.hist.title')}</strong>
              {t('view.intro.hist.body')}
            </p>
          {:else if app.mode === 'swipe'}
            <p>
              <strong>{t('view.intro.swipe.title')}</strong>
              {t('view.intro.swipe.body')}
            </p>
          {/if}
        </div>

        <div class="mapband" class:duo={photoDuo}>
          <section class="mapcell" class:tcb={hasBottomChrome} aria-label={t('result.map_label')}>
            <!-- G16c: el comparador se monta DENTRO del lienzo (overlay de
                 .mapwrap), no sobre .mapcell — así su caja es exactamente
                 la del canvas y en móvil no cubre la leyenda en flujo.
                 G19: el chrome temporal y la ficha de selección también
                 son overlay — .tclayer atraviesa punteros fuera de sus
                 paneles para no bloquear el mapa. -->
            <MapView {onViewChange}>
              {#snippet overlay()}
                {#if app.mode === 'swipe'}
                  <Lazy loader={() => import('$lib/map/SwipeCompare.svelte')} />
                {/if}
                <div class="tclayer">
                  {@render modeControls()}
                  {#if viewer && stacked && hasSelection}
                    <div class="sel-float" bind:this={selectionEl} aria-live="polite">
                      <CellDetail />
                      {#if app.selectedBuilding}
                        <Lazy loader={() => import('./BuildingCard.svelte')} />
                      {/if}
                    </div>
                  {/if}
                </div>
              {/snippet}
            </MapView>
          </section>
          {#if photoDuo}
            <section class="mapcell cmp">
              <Lazy loader={() => import('$lib/map/CompareMap.svelte')} />
            </section>
          {/if}
        </div>

        <!-- G15: en pantalla estrecha la invitación a explorar/cierra el
             bloque DESPUÉS del mapa — solo en la pantalla narrativa; en
             los modos de visor no compite con el canvas. -->
        {#if stacked && !viewer && h && app.year !== null}
          <div class="explore-tail">
            <p class="invite">{t('result.invite')}</p>
            {#if app.nearest}
              <button class="cta-era" onclick={goSeeHowItWas}>
                {t('view.cta_era')}
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              <p class="photo-rel">
                {t('view.cta_era.note', { campaign_year: app.nearest.year })}
                {#if relYearShort(app.nearest.year, app.year, t, locale.lang)}
                  · {relYearShort(app.nearest.year, app.year, t, locale.lang)}{/if}
              </p>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="below">
      <!-- Todo lo below-fold (CUÁNDO/contexto/historias/tu calle/pie) es
           un único chunk lazy: se importa al acercarse al viewport, al
           primer focusin (teclado/clic) o si un deep link lo fuerza.
           Nada de ese grafo JS entra en el critical path (PERF4-R3). -->
      <LazyView loader={() => import('./BelowFold.svelte')} force={forceBelow} />
    </div>
  {/if}
</div>

<style>
  .result {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.7rem clamp(1rem, 4vw, 2.4rem);
    border-bottom: 1px solid var(--line);
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--accent-deep);
    white-space: nowrap;
    text-decoration: none;
    border-bottom: 1.5px solid transparent;
    padding: 0.4rem 0;
  }
  .brand:hover {
    border-bottom-color: var(--accent-deep);
  }
  .brand:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }
  /* G7: el contexto (año · lugar) es un chip informativo, no un formulario */
  .ctx {
    margin-inline: auto;
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.3rem 0.9rem;
    max-width: 46vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-left: auto;
  }
  /* G11.3: aviso de enlace con cámara inválida — se conserva el estado
     útil y se informa, nunca se rompe el mapa en silencio */
  .urlnotice {
    margin: 0;
    padding: 0.45rem clamp(1rem, 4vw, 2.4rem);
    font-size: 0.85rem;
    background: var(--warn-bg);
    color: var(--warn-text);
    border-bottom: 1px solid var(--warn-line);
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .urlnotice button {
    font: inherit;
    font-size: 0.78rem;
    margin-left: auto;
    padding: 0.25rem 0.7rem;
    border: 1px solid var(--warn-line);
    border-radius: 6px;
    background: transparent;
    color: var(--warn-text);
    cursor: pointer;
  }
  .ctx + .controls {
    margin-left: 0;
  }
  @media (min-width: 701px) {
    /* año·lugar ya lo lleva la vhead (vctx en todos los modos en
       desktop; vback-ctx en visor apilado); el chip queda solo en
       ≤700px, donde vhead está oculta y es la única referencia global */
    .ctx {
      display: none;
    }
    .ctx + .controls {
      margin-left: auto;
    }
  }
  /* G19-R4: chrome ligero — icono + texto corto, borde fino, misma
     altura que Compartir/idioma; el hitbox ≥44px se conserva */
  .change {
    font: inherit;
    font-size: 0.78rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: transparent;
    cursor: pointer;
    color: var(--ink-2);
    white-space: nowrap;
    min-height: 44px;
  }
  .change:hover {
    border-color: var(--ink-3);
    color: var(--ink);
  }
  /* G7: la edición es un container centrado, no una franja de 1900 px */
  .changeform {
    display: flex;
    gap: 0.75rem;
    padding: 0.9rem clamp(1rem, 4vw, 2.4rem);
    margin: 0 auto;
    width: 100%;
    max-width: 46rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
    align-items: end;
    /* G11.3: contexto propio por encima de .vtoolbar (sticky, z-30) — sin
       esto el desplegable de municipio quedaba tapado e inclicable */
    position: relative;
    z-index: 40;
  }
  .cf {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  .cf.grow {
    flex: 1 1 auto;
  }
  .cf-lbl {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .changeform input {
    width: 6.5rem;
    height: 2.5rem;
    padding: 0 0.7rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    font: inherit;
  }
  .changeform input[aria-invalid='true'] {
    border-color: var(--accent-deep);
  }
  .cf-err {
    margin: 0;
    font-size: 0.78rem;
    color: var(--accent-deep);
    max-width: 16rem;
  }
  .cf-submit {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    height: 2.5rem;
    padding: 0 1.1rem;
    border-radius: 8px;
    border: 0;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
  }
  .cf-submit:hover {
    background: var(--accent-deep);
  }
  .cf-actions {
    display: flex;
    gap: 0.4rem;
    align-items: end;
  }
  .cf-cancel {
    font: inherit;
    font-size: 0.85rem;
    height: 2.5rem;
    padding: 0 0.9rem;
    border-radius: 8px;
    border: 1px solid var(--ink-3);
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
  }
  .cf-cancel:hover {
    border-color: var(--ink);
    color: var(--ink);
  }
  @media (max-width: 700px) {
    .topbar {
      flex-wrap: wrap;
      gap: 0.45rem 0.7rem;
    }
    /* el chip de contexto baja a su propia fila y no estrangula los botones */
    .ctx {
      order: 3;
      flex-basis: 100%;
      margin-inline: 0;
      max-width: none;
      text-align: center;
    }
    .controls {
      margin-left: auto;
    }
    .changeform {
      flex-wrap: wrap;
    }
    .cf-submit {
      flex: 1 1 100%;
    }
  }

  /* G11/G19-R2 — escena principal: columna de resultado compacta
     (300–340 px) | visor. La misma geometría en los cinco modos. */
  .stage {
    display: grid;
    grid-template-columns: minmax(18.75rem, 21.25rem) minmax(0, 1fr);
    min-height: 72svh;
    border-bottom: 1px solid var(--line);
  }
  @media (min-width: 1024px) {
    /* G19-R4: la escena llena la primera pantalla (topbar + stage ≥
       viewport) — `.below` queda siempre bajo el pliegue: ni asomo
       visual ni prefetch del chunk lazy en la carga. El lienzo crece
       para ocupar la escena (flex), idéntico en los cinco modos. */
    .stage {
      min-height: calc(100svh - 4rem);
    }
  }
  .panel {
    border-right: 0;
  }
  .sidebar {
    min-width: 0;
    border-right: 1px solid var(--line);
  }
  .selection-panel {
    position: sticky;
    top: 4rem;
    padding: 0.5rem 1rem 1rem;
    max-height: calc(100svh - 5rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--paper);
    z-index: 20;
  }
  .selection-panel :global(.card) {
    margin-top: 0;
    scroll-margin-block: 5rem;
  }
  #scene {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  /* G12 + G19-R3: franja de contexto entre el selector y el lienzo —
     existe en los cinco modos con altura estructural común para que el
     mapa empiece siempre en el mismo sitio. Contenido centrado
     verticalmente: el texto de cada modo es breve y no empuja el
     lienzo. */
  .mapintro {
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    padding: 0.45rem clamp(1rem, 2vw, 1.4rem);
  }
  @media (min-width: 1024px) {
    .mapintro {
      min-height: 7.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
  }
  .mapintro p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.45;
    color: var(--ink-2);
    max-width: 76ch;
  }
  .mapintro strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--ink);
  }
  .resolving {
    padding: 1.4rem clamp(1rem, 4vw, 2.4rem) 0.8rem;
    font-size: 0.95rem;
    color: var(--ink-2);
    margin: 0;
  }

  /* RESPUESTA — la frase llana como titular editorial del panel */
  .headline-block {
    padding: clamp(1.2rem, 2.5vw, 2rem) clamp(1rem, 2vw, 1.8rem);
    max-width: none;
  }
  .kicker {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  h1.lead {
    font-family: var(--serif);
    font-weight: 400;
    /* G19-R4: el titular cede ~10% para no competir con el lienzo —
       sigue siendo la voz editorial del panel */
    font-size: clamp(1.4rem, 2.3vw, 1.9rem);
    line-height: 1.18;
    margin: 0 0 0.6rem;
    color: var(--ink);
    text-wrap: balance;
    max-width: 26ch;
  }
  /* cifra de apoyo: la proporción exacta, sin protagonismo */
  .support {
    margin: 0 0 0.7rem;
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .support strong {
    font-size: 1.5rem;
    color: var(--accent-deep);
    font-weight: 600;
  }
  .invite {
    margin: 0 0 0.2rem;
    font-size: 0.98rem;
    color: var(--ink-2);
    max-width: 52ch;
  }
  /* «Sobre este dato»: recuento exacto, cobertura y desglose en un
     único desplegable — el universo queda en la frase principal. */
  .about-data {
    margin: 0.7rem 0 0;
    font-size: 0.875rem;
    color: var(--ink-2);
  }
  .about-data summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .about-data > p {
    margin: 0.4rem 0 0;
    max-width: 68ch;
  }
  .lead2 {
    font-size: 1.08rem;
    margin: 0 0 0.3rem;
    color: var(--ink-2);
    max-width: 62ch;
  }
  .photo-rel {
    margin: 0.2rem 0 0;
    font-size: 0.875rem;
    color: var(--ink-3);
  }
  .coverage {
    font-size: 0.875rem;
    color: var(--ink-3);
    max-width: 70ch;
  }
  .warn {
    background: var(--warn-bg);
    border-left: 3px solid var(--warn-line);
    color: var(--warn-text);
    font-size: 0.82rem;
    padding: 0.45rem 0.8rem;
    max-width: 62ch;
  }
  .sr-summary {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  /* G8 — «Ver cómo era» como CTA narrativo (acción, no categoría) */
  .cta-era {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--accent-deep);
    background: transparent;
    border: 0;
    border-bottom: 1.5px solid var(--accent);
    padding: 0.4rem 0.1rem;
    min-height: 44px;
    cursor: pointer;
  }
  .cta-era:hover {
    /* G10-12: accent/papel = 4,35:1 no llega a AA en texto normal;
       el hover marca con acento oscuro + subrayado reforzado */
    color: var(--accent-deep);
    border-bottom-color: var(--accent-deep);
    border-bottom-width: 2px;
  }
  .cta-era:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }

  /* G11 — el lienzo llena la escena: la escena es tan alta como el
     stage (72svh en escritorio); el mapa crece hasta ocuparla */
  .mapband {
    flex: 1 1 auto;
    min-height: min(62svh, 640px);
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-direction: column;
  }
  .mapcell {
    flex: 1 1 auto;
    min-height: 0;
    position: relative; /* SwipeCompare se superpone al lienzo principal */
    display: flex; /* G11.1: .mapouter (lienzo+leyenda) llena la celda */
    flex-direction: column;
  }
  .mapband.duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .mapband.duo .mapcell:first-child {
    border-right: 1px solid var(--line);
  }

  /* ── G19-R3 — mismo lienzo en los cinco modos: la columna no se
     desmonta en desktop, la franja de contexto tiene altura estructural
     común y .mapband comparte min-height — el bounding box del mapa es
     el mismo sea cual sea el modo (±2px). El reproductor es overlay
     dentro del lienzo, no consume flujo. En apilado (≤1023px) el lienzo
     sí llena la primera pantalla. ── */
  /* capa de chrome sobre el lienzo: atraviesa punteros fuera de sus
     paneles (los paneles llevan pointer-events propio) */
  .tclayer {
    position: absolute;
    inset: 0;
    z-index: 12;
    pointer-events: none;
  }
  .tclayer :global(.lazy-load) {
    position: absolute;
    top: 0.6rem;
    left: 0.7rem;
    margin: 0;
    padding: 0.4rem 0.7rem;
    background: rgba(24, 38, 49, 0.9);
    color: var(--paper);
    border-radius: 8px;
    font-size: 0.78rem;
    pointer-events: auto;
  }
  @media (min-width: 1024px) {
    /* la barra temporal ocupa el borde superior del lienzo en desktop:
       el placeholder del chunk cede ese hueco (en apilado la barra va
       abajo; en hist/swipe no hay barra) */
    .mapcell.tcb .tclayer :global(.lazy-load) {
      top: 3.6rem;
    }
  }
  /* ficha de selección flotante: solo se monta en visor apilado (sin
     columna) — en desktop vive en la sidebar como en «Edificios» */
  .sel-float {
    position: absolute;
    overflow-y: auto;
    overscroll-behavior: contain;
    pointer-events: auto;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(24, 38, 49, 0.24);
    z-index: 13;
  }
  .sel-float :global(.card) {
    margin-top: 0;
  }
  @media (max-width: 1023px) {
    /* en pantalla estrecha el stage visor vuelve a ser flex: el lienzo
       llena la primera pantalla — la barra temporal queda anclada al
       borde inferior del mapa */
    .stage.viewer {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    .stage.viewer #scene {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .stage.viewer .mapband {
      min-height: 20rem;
    }
    .mapcell.tcb {
      --tcbh: 60px;
    }
    /* la barra temporal anclada abajo cubre el borde inferior del lienzo:
       la atribución y la escala suben por encima — nunca quedan tapadas */
    .mapcell.tcb :global(.maplibregl-ctrl-bottom-left),
    .mapcell.tcb :global(.maplibregl-ctrl-bottom-right) {
      bottom: calc(var(--tcbh, 0px) + 0.7rem);
    }
    .sel-float {
      top: auto;
      left: 0.5rem;
      right: 0.5rem;
      width: auto;
      bottom: calc(0.55rem + var(--tcbh, 0px) + env(safe-area-inset-bottom));
      max-height: 46%;
    }
  }

  .below {
    /* el padding-top también es margen de seguridad del sentinel lazy:
       con la escena a plena pantalla, el chunk nunca entra en el primer
       viewport por unos píxeles de borde (PERF4-R3/G19-R4) */
    padding: 2.5rem clamp(1rem, 4vw, 2.4rem) 2.5rem;
  }

  /* G11 — apilado: resultado compacto y mapa inmediatamente después */
  @media (max-width: 1023px) {
    .sidebar {
      border-right: 0;
    }
    .selection-panel {
      position: fixed;
      inset: auto 0 0;
      max-height: 40svh;
      padding: 0.6rem 1rem max(0.6rem, env(safe-area-inset-bottom));
      border-top: 2px solid var(--line-strong);
      box-shadow: 0 -6px 20px #0002;
    }
    .stage {
      display: block;
      min-height: 0;
    }
    .panel {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
    .headline-block {
      padding: clamp(1.2rem, 4vw, 1.8rem) clamp(1rem, 4vw, 2rem);
    }
    /* G15 — en pantalla apilada el orden DOM ya es el visual (selector →
       explicación → lienzo → controles → invitación); aquí solo quedan
       tamaños y la presentación del cierre explorador. `min-height`, no
       `height`: la banda crece si leyenda/notas necesitan más — una
       altura fija haría desbordar `.universe` sobre el control
       siguiente. */
    .mapband {
      min-height: 56svh;
    }
    .explore-tail {
      padding: 0.6rem 1rem 0.9rem;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }
    .explore-tail .invite {
      font-size: 0.9rem;
    }
  }
  @media (max-width: 700px) {
    /* G13: resultado compacto en móvil — la frase llana es el titular
       (siempre visible); recuento y cobertura tras «Sobre este dato». */
    .headline-block {
      padding: 0.75rem 1rem 0.6rem;
    }
    .headline-block .kicker {
      margin-bottom: 0.3rem;
    }
    .headline-block h1.lead {
      font-size: 1.22rem;
      margin-bottom: 0.35rem;
    }
    .support {
      margin-bottom: 0.35rem;
      font-size: 0.95rem;
    }
    .support strong {
      font-size: 1.25rem;
    }
    .invite {
      font-size: 0.9rem;
    }
    .lead2 {
      font-size: 0.95rem;
      margin-bottom: 0.2rem;
    }
    .coverage {
      font-size: 0.8rem;
    }
    .about-data {
      margin-top: 0.4rem;
    }
    .cta-era {
      margin-top: 0.3rem;
    }
    .topbar {
      padding: 0.5rem 1rem;
    }
    .ctx {
      padding: 0.2rem 0.7rem;
      font-size: 0.8rem;
    }
    .mapintro {
      padding: 0.35rem 1rem;
    }
    .mapintro p {
      /* suelo de legibilidad del gate G12 (explanation_readable ≥15px):
         la explicación del mapa es texto clave, no copy secundario */
      font-size: 0.95rem;
      line-height: 1.4;
    }
    .mapband {
      /* G16c: `height` fijo desbordaba la leyenda en flujo (~60px sobre el
         contenido siguiente) cuando su contenido superaba 50svh; la regla
         ya documentada a ≤1023px es `min-height` por ese motivo. */
      min-height: 50svh;
    }
    .mapband.duo {
      grid-template-columns: 1fr;
      height: auto;
    }
    .mapband.duo .mapcell {
      min-height: 50svh;
    }
    .mapband.duo .mapcell:first-child {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
  }
</style>
