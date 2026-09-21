<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, relYearShort } from '$lib/domain/format';
  import { ArrowRight } from '@lucide/svelte';
  import { activateOrtho } from '$lib/domain/ortho-probe.svelte';
  import { parseYearInput } from '$lib/domain/url';
  import { approxOfTen, approxKind } from '$lib/domain/human';
  import { tick } from 'svelte';
  import MapView from '$lib/map/MapView.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import Lazy from './Lazy.svelte';
  import LazyView from './LazyView.svelte';
  import ShareButton from './ShareButton.svelte';
  import PlaceSearch from './PlaceSearch.svelte';

  let {
    onViewChange = () => {}
  }: { onViewChange?: (v: { lat: number; lon: number; zoom: number }) => void } = $props();

  let changing = $state(false);
  let yearStr = $state('');
  let yearErr = $state(false);

  let h = $derived(app.headline);
  let lowCoverage = $derived(h !== null && h.coveragePct < 70);

  // G5-R2 (prioridad humana 1): al entrar en «En el tiempo» el eje se
  // inserta sobre el mapa y puede quedar fuera de pantalla — se lleva a
  // la vista. Solo en cambios de modo por el usuario, no en la carga
  // inicial (un deep link ?view=time no debe secuestrar el scroll).
  let sceneEl = $state<HTMLElement | null>(null);
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
  let narrow = $state(false);
  $effect(() => {
    const mq = matchMedia('(max-width: 700px)');
    const apply = () => (narrow = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
  let photoDuo = $derived(app.mode === 'photo' && !!app.orthoCompare && !narrow);

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
    yearErr = false;
    app.year = y;
    await app.ensureMetrics();
    changing = false;
  }
</script>

<div class="result">
  <header class="topbar">
    <span class="brand">{t('hero.title')}</span>
    {#if app.year !== null && app.place && !changing}
      <span class="ctx" aria-hidden="true">{app.year} · {app.place.name}</span>
    {/if}
    <div class="controls">
      <button
        class="change"
        onclick={() => {
          changing = !changing;
          // G10.1: al abrir, el año vigente es el valor editable (no un
          // placeholder fantasma); al cerrar, se limpia el error.
          if (changing) {
            yearStr = String(app.year ?? '');
            yearErr = false;
          }
        }}
      >
        {t('result.change')}
      </button>
      <ShareButton />
    </div>
  </header>
  {#if changing}
    <form
      class="changeform"
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
        <PlaceSearch compact />
      </div>
      <button class="cf-submit" type="submit">{t('result.change.apply')}</button>
    </form>
  {/if}

  {#if app.place}
    <!-- G11 — dato y territorio en la misma primera vista: panel
         narrativo (340–400 px) a la izquierda, escena/mapa a la
         derecha. Sin fila de KPI duplicada: población y década viven
         en sus capítulos below-fold. -->
    <div class="stage">
      {#if h && app.year !== null}
        <!-- RESPUESTA: la cifra ES el titular; el municipio es dato
             secundario, nunca parte del display. -->
        <section class="headline-block panel">
          <h1>
            <span class="pre">{t('result.headline.pre')}</span>
            <span class="bignum">{fmtPct(h.sharePct)} %</span>
            <span class="post"
              >{t('result.headline.post', {
                municipality: app.place.name,
                selected_year: app.year
              })}</span
            >
          </h1>
          <!-- G10-02/G11.2: el universo (parque con año conocido) vive en
               el propio titular; abajo, una sola aproximación llana. -->
          <p class="plain">
            {#if approxKind(h.sharePct) === 'none'}
              {t('result.plain.none', { municipality: app.place.name })}
            {:else if approxKind(h.sharePct) === 'all'}
              {t('result.plain.all', { municipality: app.place.name })}
            {:else}
              {t('result.plain.some', { approx: approxOfTen(h.sharePct) })}
            {/if}
          </p>
          <p class="lead2">
            {t('result.lead', { known: fmt(h.known), after: fmt(h.after) })}
          </p>
          <p class="coverage">
            {t('result.coverage', { coverage_pct: fmtPct(h.coveragePct) })}
          </p>
          {#if h.unknown > 0 || h.suspicious > 0}
            <details class="anom">
              <summary>{t('result.coverage.detail')}</summary>
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
                {:else}
                  {t('result.coverage.suspicious_only', { suspicious: fmt(h.suspicious) })}
                {/if}
              </p>
            </details>
          {/if}
          {#if lowCoverage}
            <p class="warn" role="note">{t('result.low_coverage')}</p>
          {/if}
          {#if app.nearest}
            <button class="cta-era" onclick={goSeeHowItWas}>
              {t('view.cta_era')}
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
            <p class="photo-rel">
              {t('view.cta_era.note', { campaign_year: app.nearest.year })}
              {#if relYearShort(app.nearest.year, app.year, t)}
                · {relYearShort(app.nearest.year, app.year, t)}{/if}
            </p>
          {/if}
        </section>

        <p class="sr-summary">
          {t('result.text_summary', {
            municipality: app.place.name,
            total: fmt(h.total),
            known: fmt(h.known),
            after: fmt(h.after),
            selected_year: app.year
          })}
        </p>
      {:else if app.metricsError}
        <p class="resolving" role="alert">{t('error.metrics')}</p>
      {:else}
        <p class="resolving" role="status">{t('search.searching')}</p>
      {/if}

      <!-- ESCENA ÚNICA (G5/G8): un lienzo, cinco modos en una sola
           jerarquía. La toolbar (selector de modo) va inmediatamente
           encima del mapa y es sticky; cada modo muestra solo sus
           controles contextuales entre la toolbar y el lienzo. -->
      <div id="scene" bind:this={sceneEl}>
        <ViewSwitch />

        {#if app.mode === 'time'}
          <Timeline />
        {:else if app.mode === 'photo'}
          <Lazy loader={() => import('./PhotoPanel.svelte')} />
        {:else if app.mode === 'hist'}
          <Lazy loader={() => import('./HistMapControls.svelte')} />
        {/if}

        <div class="mapband" class:duo={photoDuo}>
          <section class="mapcell" aria-label={t('result.map_label')}>
            <MapView {onViewChange} />
            {#if app.mode === 'swipe'}
              <Lazy loader={() => import('$lib/map/SwipeCompare.svelte')} />
            {/if}
          </section>
          {#if photoDuo}
            <section class="mapcell cmp">
              <Lazy loader={() => import('$lib/map/CompareMap.svelte')} />
            </section>
          {/if}
        </div>

        {#if app.mode === 'map'}
          <Timeline />
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
  .ctx + .controls {
    margin-left: 0;
  }
  .change {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--ink-3);
    background: transparent;
    cursor: pointer;
    color: var(--ink-2);
    white-space: nowrap;
    min-height: 44px;
  }
  .change:hover {
    border-color: var(--ink);
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

  /* G11 — escena principal: panel narrativo | mapa, misma vista */
  .stage {
    display: grid;
    grid-template-columns: minmax(20rem, 25rem) minmax(0, 1fr);
    min-height: 72svh;
    border-bottom: 1px solid var(--line);
  }
  .panel {
    border-right: 1px solid var(--line);
  }
  #scene {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .resolving {
    padding: 1.4rem clamp(1rem, 4vw, 2.4rem) 0.8rem;
    font-size: 0.95rem;
    color: var(--ink-2);
    margin: 0;
  }

  /* RESPUESTA — el dato como titular editorial dentro del panel */
  .headline-block {
    padding: clamp(1.2rem, 2.5vw, 2rem) clamp(1rem, 2vw, 1.8rem);
    max-width: none;
  }
  h1 {
    font-family: var(--serif);
    font-weight: 400;
    margin: 0 0 0.7rem;
    color: var(--ink);
    text-wrap: balance;
  }
  /* G7: jerarquía partida — fórmula pequeña, cifra display, municipio
     como subtítulo propio (los nombres largos ya no rompen el titular) */
  .pre {
    display: block;
    font-family: inherit;
    font-size: clamp(1.15rem, 2.2vw, 1.5rem);
    line-height: 1.2;
    color: var(--ink-2);
  }
  /* G11: la cifra protagonista es sans (Source Sans 3 600), no serif */
  .bignum {
    display: block;
    white-space: nowrap;
    font-family: var(--sans);
    font-variant-numeric: tabular-nums;
    font-size: var(--fs-figure);
    line-height: 0.95;
    color: var(--accent);
    font-weight: 600;
    margin: 0.08em 0;
    letter-spacing: -0.02em;
  }
  /* G7: entrada discreta del número — explica «éste es el resultado»;
     desactivada con prefers-reduced-motion */
  @media (prefers-reduced-motion: no-preference) {
    .bignum {
      animation: figure-in 0.5s ease-out both;
    }
    @keyframes figure-in {
      from {
        opacity: 0;
        transform: translateY(0.25em);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  }
  /* G11.1: la explicación acompaña a la cifra (22–26 px), no compite
     con ella — el protagonismo lo lleva .bignum */
  .post {
    display: block;
    font-size: clamp(1.375rem, 1.9vw, 1.625rem);
    line-height: 1.15;
    color: var(--ink);
  }
  .plain {
    font-size: 1.08rem;
    margin: 0 0 0.55rem;
    color: var(--ink);
    max-width: 62ch;
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
    margin: 0 0 0.4rem;
    max-width: 70ch;
  }
  /* G11.2: el desglose sin-año/anómalos cuelga de la línea de cobertura */
  .anom {
    font-size: 0.8rem;
    color: var(--ink-3);
    margin: -0.2rem 0 0.4rem;
    max-width: 70ch;
  }
  .anom summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .anom p {
    margin: 0.3rem 0 0;
    color: var(--ink-3);
    max-width: 68ch;
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

  .below {
    padding: 0 clamp(1rem, 4vw, 2.4rem) 2.5rem;
  }

  /* G11 — apilado: resultado compacto y mapa inmediatamente después */
  @media (max-width: 1023px) {
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
    .bignum {
      font-size: clamp(3rem, 12vw, 4.5rem);
    }
    .mapband {
      min-height: 0;
      height: 56svh;
    }
  }
  @media (max-width: 700px) {
    /* G11.1/G11.2: resultado compacto en móvil — cifra, universo (en el
       propio titular), aproximación, recuento y cobertura caben en la
       primera pantalla junto al mapa. */
    .headline-block {
      padding: 1rem 1rem 0.8rem;
    }
    .headline-block h1 {
      margin-bottom: 0.4rem;
    }
    .plain {
      font-size: 0.95rem;
      margin-bottom: 0.4rem;
    }
    .lead2 {
      font-size: 0.98rem;
      margin-bottom: 0.25rem;
    }
    .coverage {
      font-size: 0.8rem;
      margin-bottom: 0.3rem;
    }
    .cta-era {
      margin-top: 0.4rem;
    }
    .mapband {
      height: 50svh;
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
