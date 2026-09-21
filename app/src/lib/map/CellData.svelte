<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct } from '$lib/domain/format';
  import { CELL_SMALL_DENOMINATOR } from '$lib/domain/cells';

  let {
    share,
    footprint,
    known,
    after = null,
    until = null
  }: {
    share: number | null;
    footprint: number | null;
    known: number;
    after?: number | null;
    until?: number | null;
  } = $props();
</script>

<!-- G12: la ficha responde a la pregunta que genera el color con la forma
     «N de K». Con el cabezal activo la variable es la acumulada hasta
     playYear — la misma que pinta el mapa. -->
{#if app.playYear !== null && until !== null}
  <p class="tip-main">
    {t('map.cell.sentence.play', {
      until: fmt(until),
      known: fmt(known),
      play_year: app.playYear
    })}
  </p>
  <p class="tip-sub">{fmtPct((until / known) * 100)} %</p>
{:else if share !== null}
  {#if after !== null}
    <p class="tip-main">
      {t('map.cell.sentence', { after: fmt(after), known: fmt(known) })}
    </p>
    <p class="tip-sub">{fmtPct(share * 100)} %</p>
  {:else}
    <p class="tip-main">
      {t('map.tooltip.cell.share', { share: fmtPct(share * 100), selected_year: app.year ?? '' })}
    </p>
    <p class="tip-sub">{t('map.tooltip.cell.denominator', { known: fmt(known) })}</p>
  {/if}
  {#if footprint !== null}
    <p class="tip-sub">
      {t('map.tooltip.cell.footprint', {
        share: fmtPct(footprint * 100),
        selected_year: app.year ?? ''
      })}
    </p>
  {/if}
  {#if known < CELL_SMALL_DENOMINATOR}
    <p class="tip-warn">{t('map.legend.cells.small_n', { n: known })}</p>
  {/if}
{:else if known === 0}
  <p class="tip-main">{t('map.tooltip.cell.no_known')}</p>
{:else}
  <p class="tip-sub">{t('map.tooltip.cell.denominator', { known: fmt(known) })}</p>
{/if}

<style>
  .tip-main {
    margin: 0;
    color: var(--ink);
  }
  .tip-sub {
    margin: 0.2rem 0 0;
    color: var(--ink-2);
    font-size: 0.75rem;
  }
  .tip-warn {
    margin: 0.35rem 0 0;
    color: var(--warn-text);
    font-size: 0.72rem;
    border-top: 1px dashed var(--warn-line);
    padding-top: 0.3rem;
  }
</style>
