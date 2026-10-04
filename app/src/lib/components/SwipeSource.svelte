<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { flightSuffix, resolveSwipeBefore } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';
  import { locale } from '$lib/i18n/lang.svelte';

  /**
   * Atribución por lado del comparador (G11.3): organismo, año nominal y vuelo
   * de cada campaña. Una sola fuente para el overlay de escritorio y la línea
   * en flujo bajo el lienzo en móvil, donde el overlay no cabe.
   */
  let { variant }: { variant: 'overlay' | 'flow' } = $props();

  let after = $derived(app.orthoCampaign ?? app.latest ?? null);
  let before = $derived(resolveSwipeBefore(app.swipeBefore, app.allCampaigns, app.year, after));
  let afterFailed = $derived(
    app.orthoState === 'NOT_COVERED' || app.orthoState === 'SERVICE_ERROR'
  );
</script>

{#if before && after}
  <p class="src {variant}">
    {#if afterFailed}
      {t('swipe.src_map', {
        before_year: before.year,
        before_pub: t(`ortho.publisher.${before.source}`),
        before_flight: flightSuffix(before, t, locale.lang),
        after_year: after.year
      })}
    {:else}
      {t('swipe.src', {
        before_year: before.year,
        before_pub: t(`ortho.publisher.${before.source}`),
        before_flight: flightSuffix(before, t, locale.lang),
        after_year: after.year,
        after_pub: t(`ortho.publisher.${after.source}`),
        after_flight: flightSuffix(after, t, locale.lang)
      })}
    {/if}
  </p>
{/if}

<style>
  .src {
    margin: 0;
  }
  .overlay {
    position: absolute;
    /* G11.1: bajo el chip «actualidad», despejada de la atribución MapLibre
       (abajo-derecha), de la fila de presets y del zoom (arriba-derecha) */
    top: 7.4rem;
    right: 0.6rem;
    background: rgba(24, 38, 49, 0.6);
    color: var(--paper);
    font-size: 0.68rem;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    max-width: 60%;
    text-align: right;
  }
  .flow {
    display: none;
    padding: 0.5rem 0.9rem;
    border-top: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-3);
    font-size: 0.75rem;
    line-height: 1.45;
  }
  /* En estrecho el overlay no cabe sobre el lienzo: la atribución de ambas
     campañas pasa a una línea en flujo bajo el mapa, nunca desaparece. */
  @media (max-width: 700px) {
    .overlay {
      display: none;
    }
    .flow {
      display: block;
    }
  }
</style>
