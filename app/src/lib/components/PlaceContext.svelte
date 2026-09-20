<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtHa, fmtDateEs, obsLabel, joinEs } from '$lib/domain/format';
  import { loadPopulation, type PopulationFile } from '$lib/domain/catalog';
  import { resolvePopulationObs, resolveHousingObs } from '$lib/domain/sincebirth';

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

  /** «registraba X, Y ha de… y Z ha de…» — una frase, no una lista de campos. */
  let planningItems = $derived.by(() => {
    if (!muni) return [] as string[];
    const items: string[] = [];
    if (muni.viv_ej !== null) items.push(t('planning.item.viv', { n: fmt(muni.viv_ej) }));
    if (muni.res_v !== null) items.push(t('planning.item.res_v', { n: fmtHa(muni.res_v) }));
    if (muni.ae_v !== null) items.push(t('planning.item.ae_v', { n: fmtHa(muni.ae_v) }));
    return items;
  });

  /**
   * «Cuando naciste» (G6-F): la observación oficial más próxima al año
   * personal, resuelta sobre censo (1900–2001) + padrón anual (2001–2025)
   * sin interpolar. La familia metodológica viaja en el copy.
   */
  let popThen = $derived.by(() => {
    if (!popEntry || app.year === null || !pop) return null;
    const o = resolvePopulationObs(
      popEntry,
      pop.census_periods,
      pop.padron_periods ?? [],
      app.year
    );
    // solo si difiere del dato de padrón actual ya mostrado
    if (o && o.period !== pop.padron_period) return o;
    return null;
  });

  /** Vivienda censal (v02a) cercana al nacimiento + última comparable. */
  let housingFact = $derived.by(() => {
    if (!popEntry || app.year === null || !pop?.housing_periods?.length) return null;
    const then = resolveHousingObs(popEntry, pop.housing_periods, app.year);
    const lastP = pop.housing_periods[pop.housing_periods.length - 1];
    const now = popEntry.housing?.total?.[lastP];
    if (!then || now === null || now === undefined || then.year === Number(lastP)) {
      return then ? { then, now: null, lastP: null } : null;
    }
    return { then, now, lastP };
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
            ref_date: fmtDateEs(pop!.padron_period)
          })}
          {#if popThen}
            {#if popThen.exact}
              {t('place.pop.then.exact', {
                year: popThen.year,
                municipality: app.place.name,
                pop: fmt(popThen.population),
                family: t(`place.family.${popThen.family}`)
              })}
            {:else}
              {t('place.pop.then.near', {
                obs: obsLabel(popThen.family, popThen.period, t),
                municipality: app.place.name,
                pop: fmt(popThen.population)
              })}
            {/if}
          {/if}
        </p>
      {/if}
      {#if housingFact}
        <p class="fact">
          {#if housingFact.now !== null && housingFact.lastP !== null}
            {t('place.housing.then_now', {
              then_year: housingFact.then.year,
              then: fmt(housingFact.then.total),
              now_year: housingFact.lastP,
              now: fmt(housingFact.now)
            })}
          {:else}
            {t('place.housing.then', {
              then_year: housingFact.then.year,
              then: fmt(housingFact.then.total)
            })}
          {/if}
        </p>
      {/if}
      {#if popEntry?.padron || housingFact}
        <p class="src">{t('place.context.src')}</p>
      {/if}
      {#if muni}
        <p class="fact">
          {t('planning.intro', {
            ref_date: fmtDateEs(muni.ext.slice(0, 10)),
            municipality: app.place.name
          })}
          {#if planningItems.length}{joinEs(planningItems)}.{/if}
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
