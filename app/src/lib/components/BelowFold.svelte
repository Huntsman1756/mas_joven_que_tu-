<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, fmtHa } from '$lib/domain/format';
  import { resolve } from '$app/paths';
  import { Building2, Database, Camera, Layers, Users, Map, ExternalLink } from '@lucide/svelte';
  import Lazy from './Lazy.svelte';
  import DecadeDistribution from './DecadeDistribution.svelte';
  import PlaceContext from './PlaceContext.svelte';
  import StoriesSection from './StoriesSection.svelte';
  import AddressInvite from './AddressInvite.svelte';
  import CompareInvite from './CompareInvite.svelte';
  import Hotspots from './Hotspots.svelte';

  /**
   * Todo el contenido below-fold de RESULT en un único chunk lazy
   * (PERF4-R3): CUÁNDO, contexto, historias, profundidad personal y pie.
   * Lo monta `LazyView` al acercarse al viewport o al interactuar.
   */
  let h = $derived(app.headline);
</script>

<!-- G11.2: el recorrido personal va primero — concentraciones de tu
     municipio y tu edificio antes de la distribución, el contexto y las
     historias de otros lugares. -->
<section class="tramo" aria-labelledby="place-h">
  <h2 id="place-h" class="kicker">{t('section.place')}</h2>
  <Hotspots />
  {#if app.buildingRestoreFailed}
    <p class="notice" role="status">{t('building.restore_failed')}</p>
  {/if}
  <AddressInvite />
  {#if app.selectedBuilding}
    <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.BuildingCard }))} />
    <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.PlanningLocal }))} />
    <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.ContextModules }))} />
  {/if}
  <CompareInvite />
</section>

<!-- CUÁNDO: la distribución por periodo sobre el eje único -->
<section class="tramo" aria-labelledby="reading-h">
  <h2 id="reading-h" class="kicker">{t('section.reading')}</h2>
  <DecadeDistribution />
  {#if app.selectedCell || app.cellInspectNone}
    <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.CellDetail }))} />
  {/if}
  <p class="caveat">{t('result.caveat')}</p>
  {#if h && app.year !== null}
    <details class="calc">
      <summary>{t('result.calc.summary')}</summary>
      <p>
        {t('result.calc', {
          selected_year: app.year,
          after: fmt(h.after),
          known: fmt(h.known),
          post_share: fmtPct(h.sharePct)
        })}
      </p>
      <p class="area">{t('result.area', { area: fmtHa(h.footprintAfterM2) })}</p>
      <p class="tech">
        {t('result.calc.technical')}
        <a href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
      </p>
    </details>
  {/if}
</section>

<!-- QUÉ MÁS SABEMOS DEL LUGAR: líneas editoriales con fuente+fecha -->
<section class="tramo" aria-labelledby="context-h">
  <h2 id="context-h" class="kicker">{t('section.context')}</h2>
  <PlaceContext />
</section>

<!-- CASOS QUE MERECE LA PENA MIRAR -->
<section class="tramo" aria-labelledby="more-h">
  <h2 id="more-h" class="kicker">{t('section.more')}</h2>
  <StoriesSection />
</section>

<!-- SOBRE EL PROYECTO + DATOS UTILIZADOS (G7-H) -->
<section class="tramo" aria-labelledby="about-h">
  <h2 id="about-h" class="kicker">{t('about.title')}</h2>
  <p class="about">{t('about.body')}</p>
  <p class="about contest">{t('about.contest')}</p>
</section>

<section class="tramo" aria-labelledby="sources-h">
  <h2 id="sources-h" class="kicker">{t('sources.title')}</h2>
  <p class="src-intro">{t('sources.intro')}</p>
  <ul class="srcs">
    <li>
      <Building2 size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.catastro.org')}</strong>
        <span
          >{t('sources.catastro.what')} · {t('sources.catastro.cov', {
            snapshot_year: app.catalog?.snapshot_year ?? '—'
          })}</span
        >
      </div>
      <a href="https://www.opendatabizkaia.eus/es/catalogo/parcelario-catastral"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
    <li>
      <Camera size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.orto.org')}</strong>
        <span>{t('sources.orto.what')} · {t('sources.orto.cov')}</span>
      </div>
      <a href="https://opengis.bizkaia.eus"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
    <li>
      <Layers size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.geoeuskadi.org')}</strong>
        <span>{t('sources.geoeuskadi.what')} · {t('sources.geoeuskadi.cov')}</span>
      </div>
      <a href="https://www.geo.euskadi.eus"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
    <li>
      <Users size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.eustat.org')}</strong>
        <span>{t('sources.eustat.what')} · {t('sources.eustat.cov')}</span>
      </div>
      <a href="https://www.eustat.eus"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
    <li>
      <Map size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.hist.org')}</strong>
        <span>{t('sources.hist.what')} · {t('sources.hist.cov')}</span>
      </div>
      <a href="https://opengis.bizkaia.eus"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
    <li>
      <Database size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <strong>{t('sources.planning.org')}</strong>
        <span>{t('sources.planning.what')} · {t('sources.planning.cov')}</span>
      </div>
      <a href="https://opengis.bizkaia.eus/Planificacion"
        >{t('sources.link')}<ExternalLink size={12} aria-hidden="true" /></a
      >
    </li>
  </ul>
</section>

<footer class="foot">
  <nav class="fnav" aria-label={t('foot.nav.a11y')}>
    <strong>{t('hero.title')}</strong>
    <a href={resolve('/')}>{t('foot.nav.project')}</a>
    <a href={resolve('/como-lo-sabemos')}>{t('foot.nav.how')}</a>
    <a href="#sources-h">{t('foot.nav.sources')}</a>
  </nav>
  <p>
    {t('footer.sources')}
    {t('footer.snapshot', { snapshot_date: app.catalog?.snapshot_year ?? '—' })}
  </p>
  <p>{t('foot.legal')}</p>
  <p>{t('foot.made', { snapshot_year: app.catalog?.snapshot_year ?? '—' })}</p>
</footer>

<style>
  .tramo {
    max-width: 840px;
    margin: 2.2rem auto 0;
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }
  .kicker {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-deep);
    margin: 0 0 0.8rem;
  }
  .caveat {
    margin: 0.8rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-3);
    font-style: italic;
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
    max-width: 68ch;
  }
  .calc {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.5rem 0;
    max-width: 68ch;
  }
  .calc summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .calc .tech {
    font-size: 0.75rem;
    color: var(--ink-3);
  }
  .calc .tech a {
    color: var(--accent-deep);
  }
  .area {
    margin: 0.3rem 0 0;
    color: var(--ink-3);
  }
  .notice {
    margin: 0.3rem 0 0.5rem;
    font-size: 0.82rem;
    color: var(--warn-text);
    background: var(--warn-bg);
    border-left: 3px solid var(--warn-line);
    padding: 0.4rem 0.7rem;
    max-width: 62ch;
  }
  /* G7-H — sobre el proyecto / fuentes / pie */
  .about {
    margin: 0 0 0.6rem;
    font-size: var(--fs-body, 1rem);
    color: var(--ink-2);
    max-width: 68ch;
    line-height: 1.55;
  }
  .about.contest {
    font-size: 0.85rem;
    color: var(--accent-deep);
    border-left: 3px solid var(--accent);
    padding-left: 0.7rem;
  }
  .src-intro {
    margin: 0 0 0.9rem;
    font-size: 0.85rem;
    color: var(--ink-2);
    max-width: 65ch;
  }
  .srcs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
  }
  .srcs li {
    display: flex;
    gap: 0.7rem;
    align-items: flex-start;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0.7rem 0.85rem;
    color: var(--carto);
  }
  .srcs li > :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.15rem;
  }
  .srcs div {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .srcs strong {
    font-size: 0.85rem;
    color: var(--ink);
    font-weight: 650;
  }
  .srcs span {
    font-size: 0.76rem;
    color: var(--ink-3);
    line-height: 1.35;
  }
  .srcs a {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--accent-deep);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    white-space: nowrap;
  }
  .srcs a:hover {
    border-bottom-color: var(--accent-deep);
  }
  .srcs a:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .srcs {
      grid-template-columns: 1fr;
    }
  }
  .foot {
    max-width: 840px;
    margin: 2.4rem auto 0;
    font-size: 0.74rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.9rem;
  }
  .fnav {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.4rem 1.1rem;
    margin-bottom: 0.8rem;
    font-size: 0.85rem;
  }
  .fnav strong {
    font-family: var(--serif);
    font-size: 1.05rem;
    color: var(--ink);
    margin-right: 0.4rem;
  }
  .fnav a {
    color: var(--accent-deep);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .fnav a:hover {
    border-bottom-color: var(--accent-deep);
  }
  .fnav a:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .foot p {
    margin: 0.25rem 0;
  }
</style>
