<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtHa } from '$lib/domain/format';
  import { loadPopulation, type PopulationFile } from '$lib/domain/catalog';

  /**
   * «Qué más sabemos del lugar» (G5-G): máx. 3 hechos editoriales en
   * línea de texto, cada uno con fuente y fecha. Nada de tarjetas KPI.
   *
   *   1. Población municipal (Eustat — snapshot propio, lazy).
   *   2. Planeamiento vigente (ODB — capacidad registrada, nunca
   *      predicción; reusa la tabla municipal ya auditada).
   *
   * Carga: un solo sentinel con IntersectionObserver + focusin (mismo
   * patrón que PlanningContext en G3-B). Ninguna petición en el
   * critical path; ambos ficheros son L4/below-fold.
   *
   * También conserva la limpieza que PlanningContext hacía en eager:
   * al deseleccionar el edificio se retiran facets y overlays
   * residuales del mapa (el componente perezoso ya no corre).
   */

  let sentinel = $state<HTMLElement>();
  let pop = $state<PopulationFile | null>(null);
  let popError = $state(false);

  $effect(() => {
    const el = sentinel;
    if (!el || !app.place) return;
    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      io.disconnect();
      document.removeEventListener('focusin', onFocus, true);
      app.ensurePlanningMuni();
      loadPopulation()
        .then((p) => (pop = p))
        .catch(() => (popError = true));
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) trigger();
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    const onFocus = (e: FocusEvent) => {
      if (
        e.target instanceof HTMLElement &&
        el.compareDocumentPosition(e.target) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        trigger();
      }
    };
    document.addEventListener('focusin', onFocus, true);
    if (app.selectedBuilding) trigger();
    return () => {
      io.disconnect();
      document.removeEventListener('focusin', onFocus, true);
    };
  });

  $effect(() => {
    if (!app.selectedBuilding && app.planningLocal) {
      app.planningLocal = null;
      app.planningLocalBid = null;
    }
  });
  $effect(() => {
    if (!app.selectedBuilding && (app.contextLocal || app.contextOverlay)) {
      app.contextLocal = null;
      app.contextLocalBid = null;
      app.contextOverlay = null;
    }
  });

  let muni = $derived(app.place ? app.planningMuni?.[String(app.place.cod)] : undefined);

  /** código INE 48xxx a partir del cod municipal corto del catálogo */
  let ine = $derived(app.place ? `48${String(app.place.cod).padStart(3, '0')}` : null);
  let popEntry = $derived(ine && pop ? (pop.munis[ine] ?? null) : null);
  let popYear = $derived(pop?.padron_period.slice(0, 4) ?? '');

  /** censo más cercano al año personal que tenga dato (sin interpolar) */
  let censusFact = $derived.by(() => {
    if (!popEntry || app.year === null || !pop) return null;
    let best: { y: number; v: number } | null = null;
    for (const p of pop.census_periods) {
      const v = popEntry.census[p];
      if (v === null || v === undefined) continue;
      const y = Number(p);
      if (best === null || Math.abs(y - app.year!) < Math.abs(best.y - app.year!)) {
        best = { y, v };
      }
    }
    // solo si el censo difiere claramente del dato de padrón mostrado
    if (best && best.y.toString() !== popYear) return best;
    return null;
  });
</script>

{#if app.place}
  <div bind:this={sentinel} class="plan-sent" aria-hidden="true"></div>
{/if}
{#if app.place}
  <div class="ctx plan">
    {#if popError && app.planningMuniError}
      <p class="note">{t('place.context.unavailable')}</p>
    {:else}
      {#if popEntry?.padron}
        <p class="fact">
          {t('place.population', {
            municipality: app.place.name,
            pop: fmt(popEntry.padron),
            pop_year: popYear
          })}
          {#if censusFact}
            {t('place.population.hist', {
              census_year: censusFact.y,
              pop: fmt(censusFact.v)
            })}
          {/if}
        </p>
      {/if}
      {#if muni}
        <p class="fact">
          {t('planning.intro', {
            ref_date: muni.ext.slice(0, 10),
            municipality: app.place.name
          })}
          {#if muni.viv_ej !== null}
            {fmt(muni.viv_ej)} {t('planning.viv')};
          {/if}
          {#if muni.res_v !== null}
            {fmtHa(muni.res_v)} {t('planning.res_v')};
          {/if}
          {#if muni.ae_v !== null}
            {fmtHa(muni.ae_v)} {t('planning.ae_v')}.
          {/if}
        </p>
        <details class="meaning">
          <summary>{t('planning.meaning.summary')}</summary>
          <p>{t('planning.meaning')}</p>
          <p class="src">{t('planning.source', { ej: muni.ej })}</p>
        </details>
      {:else if app.planningMuniError}
        <p class="note">{t('planning.unavailable')}</p>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .plan-sent {
    height: 0;
  }
  .ctx {
    font-size: 0.95rem;
    max-width: 68ch;
  }
  .fact {
    margin: 0 0 0.6rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .meaning {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin-top: 0.4rem;
  }
  .meaning summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .meaning p {
    margin: 0.3rem 0;
    max-width: 65ch;
  }
  .src {
    color: var(--ink-3);
  }
  .note {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.85rem;
  }
</style>
