<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtHa } from '$lib/domain/format';
  import { loadPlanningGeom } from '$lib/domain/catalog';
  import { CLASIF_LABEL, USO_LABEL, AMBITO_T_LABEL } from '$lib/domain/planning';

  /**
   * G3-B — «¿Y qué está previsto?» (municipal) + contexto local (edificio).
   * Planeamiento = capacidad registrada, no predicción (DATA_SEMANTICS §9.2).
   * Sin edificio resuelto el contexto local se omite — nunca se suplanta.
   */

  $effect(() => {
    if (app.place) app.ensurePlanningMuni();
  });
  $effect(() => {
    if (app.selectedBuilding) app.ensurePlanningLocal();
    else if (app.planningLocal) {
      app.planningLocal = null;
      app.planningLocalBid = null;
    }
  });

  let muni = $derived(app.place ? app.planningMuni?.[String(app.place.cod)] : undefined);
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
      app.planningHighlight = {
        type: 'FeatureCollection',
        features: fc.features.filter((f) => {
          const p = f.properties as { k?: string; n?: string; t?: string; id?: number };
          if (p.k === 'ae') return aeIds.has(p.id ?? -1);
          if (p.k === 'amb') return ambKeys.has(`${p.n}|${p.t}`);
          return false;
        })
      };
    } catch {
      app.planningHighlight = null;
    } finally {
      geomBusy = false;
    }
  }
</script>

{#if app.place && (muni || app.planningMuniError || local)}
  <section class="plan" aria-label={t('planning.title')}>
    <h3>{t('planning.title')}</h3>

    {#if app.planningMuniError}
      <p class="note">{t('planning.unavailable')}</p>
    {:else if muni}
      <p class="intro">
        {t('planning.intro', {
          ref_date: muni.ext.slice(0, 10),
          municipality: app.place.name
        })}
      </p>
      <ul class="figs">
        {#if muni.viv_ej !== null}
          <li><strong>{fmt(muni.viv_ej)}</strong> {t('planning.viv')}</li>
        {/if}
        {#if muni.res_v !== null}
          <li><strong>{fmtHa(muni.res_v)}</strong> {t('planning.res_v')}</li>
        {/if}
        {#if muni.ae_v !== null}
          <li><strong>{fmtHa(muni.ae_v)}</strong> {t('planning.ae_v')}</li>
        {/if}
      </ul>
      <details class="meaning">
        <summary>{t('planning.meaning.summary')}</summary>
        <p>{t('planning.meaning')}</p>
        <p class="src">{t('planning.source', { ej: muni.ej })}</p>
      </details>
    {/if}

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
  </section>
{/if}

<style>
  .plan {
    margin-top: 0.9rem;
    padding-top: 0.7rem;
    border-top: 1px solid #eeece6;
    font-size: 0.85rem;
  }
  .plan h3 {
    font-size: 0.92rem;
    margin: 0 0 0.4rem;
    color: #33312c;
  }
  .intro {
    margin: 0 0 0.4rem;
    color: #55534b;
  }
  .figs {
    list-style: none;
    margin: 0 0 0.4rem;
    padding: 0;
    display: grid;
    gap: 0.15rem;
  }
  .figs strong {
    font-variant-numeric: tabular-nums;
    font-size: 1.05rem;
    color: #1c1a17;
  }
  .meaning {
    font-size: 0.78rem;
    color: #55534b;
  }
  .meaning summary {
    cursor: pointer;
    font-weight: 600;
  }
  .meaning p {
    margin: 0.3rem 0;
    max-width: 65ch;
  }
  .src {
    color: #6b6b63;
  }
  .note {
    margin: 0;
    color: #55534b;
    font-size: 0.8rem;
  }
  .local {
    margin-top: 0.6rem;
    border-left: 3px solid #b9b5aa;
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
    color: #55534b;
    font-size: 0.8rem;
  }
  .geom {
    margin-top: 0.45rem;
    padding: 0.4rem 0.8rem;
    min-height: 44px;
    background: none;
    border: 1px solid #b9b5aa;
    border-radius: 2px;
    color: #33312c;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .geom[aria-pressed='true'] {
    background: #f2ead9;
    border-color: #7a4d00;
    color: #4a3a1a;
  }
  .geom:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
  .geom:disabled {
    opacity: 0.55;
    cursor: wait;
  }
</style>
