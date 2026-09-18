<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmtPct } from '$lib/domain/format';

  /**
   * Contraste C-05 / C-08 (gate §C): el recuento de edificios frente a la
   * huella en planta que ocupan. No es una métrica nueva — proyecta las dos
   * constantes canónicas con sus denominadores explícitos. El copy no
   * interpreta (ni «dispersión» ni «densificación»): afirma que ambos
   * recuentos cuentan historias distintas.
   */

  let h = $derived(app.headline);
  let c06 = $derived(app.metrics?.constants.c06 ?? 0);
  let fpShare = $derived(h !== null && c06 > 0 ? (h.footprintAfterM2 / c06) * 100 : null);
</script>

{#if h && app.year !== null && fpShare !== null}
  <section class="contrast" aria-label={t('contrast.title')}>
    <h3>{t('contrast.title')}</h3>
    <p class="row">
      <span class="num">{fmtPct(h.sharePct)}</span>
      <span class="txt"
        >{t('contrast.buildings', { post_share: fmtPct(h.sharePct), selected_year: app.year })}</span
      >
    </p>
    <p class="row">
      <span class="num">{fmtPct(fpShare)}</span>
      <span class="txt"
        >{t('contrast.footprint', {
          fp_share: fmtPct(fpShare),
          selected_year: app.year
        })}</span
      >
    </p>
    <p class="note">{t('contrast.note')}</p>
  </section>
{/if}

<style>
  .contrast {
    margin-top: 1rem;
    border-top: 1px solid #eeece6;
    padding-top: 0.8rem;
  }
  h3 {
    font-size: 0.85rem;
    margin: 0 0 0.5rem;
    color: #33312c;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    margin: 0.25rem 0;
  }
  .num {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 1.15rem;
    color: #8e2f4c;
    min-width: 4.5rem;
  }
  .txt {
    font-size: 0.85rem;
    color: #33312c;
    max-width: 62ch;
  }
  .note {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: #6b6b63;
    font-style: italic;
  }
</style>
