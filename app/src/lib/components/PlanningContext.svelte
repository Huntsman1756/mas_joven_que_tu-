<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtHa } from '$lib/domain/format';
  import Lazy from './Lazy.svelte';

  /**
   * G3-B — «¿Y qué está previsto?» (municipal) + contexto local (edificio).
   * Planeamiento = capacidad registrada, no predicción (DATA_SEMANTICS §9.2).
   * Sin edificio resuelto el contexto local se omite — nunca se suplanta.
   *
   * PERF4-R: la parte municipal es siempre visible → eager. El contexto
   * local vive en PlanningLocal (lazy/depth, solo con edificio resuelto).
   * La limpieza al deseleccionar se hace aquí (eager): el efecto del
   * componente perezoso no correría tras desmontar y quedarían facets y
   * overlays residuales pintados en el mapa.
   *
   * PERF4-R2: la tabla municipal es L4/below-fold — no puede competir en la
   * ventana de `t_result_ready`. La petición se dispara solo cuando la
   * sección se acerca al viewport (IntersectionObserver sobre un centinela
   * en su posición) o cuando el foco llega a un elemento posterior en el
   * orden de lectura (navegación por teclado). Sin timers ni idle.
   */

  let sentinel = $state<HTMLElement>();

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
    // `building=` es demanda explícita: la sección se monta por `local` y
    // PlanningLocal necesita la tabla cargándose ya, no al hacer scroll.
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
  let local = $derived(app.planningLocal);
</script>

{#if app.place}
  <div bind:this={sentinel} class="plan-sent" aria-hidden="true"></div>
{/if}
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

    {#if app.selectedBuilding}
      <Lazy loader={() => import('$lib/lazy/depth').then((m) => ({ default: m.PlanningLocal }))} />
    {/if}
  </section>
{/if}

<style>
  .plan-sent {
    height: 0;
  }
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
</style>
