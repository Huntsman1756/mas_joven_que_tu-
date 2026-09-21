<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { loadPlanningGeom } from '$lib/domain/catalog';
  import { CLASIF_LABEL, USO_LABEL, AMBITO_T_LABEL } from '$lib/domain/planning';

  /**
   * Contexto local de planeamiento del edificio resuelto (extraído de
   * PlanningContext para la frontera perezosa PERF4-R). La parte municipal
   * sigue en PlanningContext (eager): es contenido siempre visible.
   */

  $effect(() => {
    if (app.selectedBuilding) app.ensurePlanningLocal();
  });

  let local = $derived(app.planningLocal);
  let geomBusy = $state(false);
  let geomShown = $derived(app.planningHighlight !== null);

  function ambitoTipo(tipo: string): string {
    const k = AMBITO_T_LABEL[tipo];
    return k ? t(`planning.${k}`) : tipo;
  }

  /**
   * Visual opt-in (gate §8): resalta solo los ámbitos/AE del edificio,
   * filtrados del GeoJSON municipal. Nunca una capa de planeamiento global.
   */
  async function toggleGeom(): Promise<void> {
    if (app.planningHighlight) {
      app.planningHighlight = null;
      return;
    }
    const b = app.selectedBuilding;
    const l = app.planningLocal;
    if (!b || !l || (l.kind !== 'inside' && l.kind !== 'multiple_ambito')) return;
    geomBusy = true;
    try {
      const fc = await loadPlanningGeom(b.mun);
      const ambKeys = new Set(l.ambitos.map((a) => `${a.ref.n}|${a.ref.t}`));
      const aeIds = new Set(l.kind === 'inside' ? l.ae.map((a) => a.ref.id) : []);
      // gate G3-D §15: una sola overlay contextual a la vez
      app.contextOverlay = null;
      app.planningHighlight = {
        type: 'FeatureCollection',
        features: fc.features.filter((f) => {
          const p = f.properties as { k?: string; n?: string; t?: string; id?: number };
          if (p.k === 'ae') return aeIds.has(p.id ?? -1);
          if (p.k === 'amb') return ambKeys.has(`${p.n}|${p.t}`);
          return false;
        })
      };
      // gate G3-D §15: una sola overlay contextual a la vez
      app.contextOverlay = null;
    } catch {
      app.planningHighlight = null;
    } finally {
      geomBusy = false;
    }
  }
</script>

{#if local && local.kind !== 'not_covered'}
  <div class="local">
    {#if local.kind === 'unavailable'}
      <p class="note">{t('planning.local.unavailable')}</p>
    {:else if local.kind === 'outside'}
      <p class="note">{t('planning.local.outside')}</p>
    {:else}
      <ul class="facts">
        {#if local.clasif > 0}
          <li>
            {#if local.clasifShare >= 100}
              {t('planning.local.clasif', {
                clasif: t(`planning.${CLASIF_LABEL[local.clasif]}`)
              })}
            {:else}
              {t('planning.local.clasif_partial', {
                clasif: t(`planning.${CLASIF_LABEL[local.clasif]}`),
                pct: local.clasifShare
              })}
            {/if}
          </li>
        {/if}
        {#if local.kind === 'inside' && local.usos.length}
          <li>
            {t('planning.local.uso', {
              usos: local.usos.map((u) => t(`planning.${USO_LABEL[u.uso]}`)).join(', ')
            })}
          </li>
        {/if}
        {#if local.kind === 'multiple_ambito'}
          <li>{t('planning.local.ambito_multi', { n: local.ambitos.length })}</li>
          {#each local.ambitos as a (a.ref.n + String(a.share))}
            <li class="sub">
              «{a.ref.n ?? '—'}» · {ambitoTipo(a.ref.t)} ({a.share} %)
            </li>
          {/each}
        {:else}
          {#each local.ambitos as a (a.ref.n + String(a.share))}
            <li>
              {t('planning.local.ambito', {
                name: a.ref.n ?? '—',
                tipo: ambitoTipo(a.ref.t)
              })}
            </li>
          {/each}
        {/if}
        {#if local.kind === 'inside'}
          {#each local.ae as a (a.ref.id)}
            <li>
              {t('planning.local.ae', { name: a.ref.n })}
            </li>
          {/each}
        {/if}
      </ul>
      {#if local.ambitos.length > 0 || (local.kind === 'inside' && local.ae.length > 0)}
        <button
          type="button"
          class="geom"
          aria-pressed={geomShown}
          disabled={geomBusy}
          onclick={toggleGeom}
        >
          {t(geomShown ? 'planning.local.map_hide' : 'planning.local.map_show')}
        </button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .note {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .local {
    margin-top: 0.6rem;
    border-left: 3px solid var(--line-strong);
    padding-left: 0.7rem;
  }
  .facts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.2rem;
  }
  .facts .sub {
    padding-left: 1rem;
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .geom {
    margin-top: 0.45rem;
    padding: 0.4rem 0.8rem;
    min-height: 44px;
    background: none;
    border: 1px solid var(--line-strong);
    border-radius: 2px;
    color: var(--ink);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .geom[aria-pressed='true'] {
    background: var(--warn-bg);
    border-color: var(--warn-text);
    color: var(--warn-text);
  }
  .geom:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .geom:disabled {
    opacity: 0.55;
    cursor: wait;
  }
</style>
