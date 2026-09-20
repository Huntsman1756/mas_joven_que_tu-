<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, fmtHa } from '$lib/domain/format';
  import { resolve } from '$app/paths';
  import Lazy from './Lazy.svelte';
  import DecadeDistribution from './DecadeDistribution.svelte';
  import PlaceContext from './PlaceContext.svelte';
  import StoriesSection from './StoriesSection.svelte';
  import AddressInvite from './AddressInvite.svelte';
  import CompareInvite from './CompareInvite.svelte';

  /**
   * Todo el contenido below-fold de RESULT en un único chunk lazy
   * (PERF4-R3): CUÁNDO, contexto, historias, profundidad personal y pie.
   * Lo monta `LazyView` al acercarse al viewport o al interactuar.
   */
  let h = $derived(app.headline);
</script>

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

<!-- TU CALLE: profundidad personal por demanda -->
<section class="tramo" aria-labelledby="place-h">
  <h2 id="place-h" class="kicker">{t('section.place')}</h2>
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

<footer class="foot">
  <p>{t('footer.sources')}</p>
  <p>
    {t('footer.code')}
    {t('footer.snapshot', { snapshot_date: app.catalog?.snapshot_year ?? '—' })}
    <a href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
  </p>
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
  .foot {
    max-width: 840px;
    margin: 2.4rem auto 0;
    font-size: 0.74rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.7rem;
  }
  .foot a {
    color: var(--accent-deep);
    margin-left: 0.5rem;
  }
</style>
