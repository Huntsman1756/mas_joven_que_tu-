<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import Lazy from './Lazy.svelte';

  /**
   * Mapa histórico 1923–25 — propuesta eager (PERF4-R). El clic activa
   * `histMapVisible` (estado propio de la escena) y pide el control real;
   * HistMapControls sondea al montar. 0 requests de implementación ni de
   * raster antes de la acción explícita.
   */
  function show() {
    app.histMapVisible = true;
    if (app.histMapState === 'UNAVAILABLE') app.histMapState = 'UNKNOWN'; // retry
  }
</script>

{#if app.place && !app.histMapVisible}
  <section class="histmap" aria-label={t('histmap.section_label')}>
    <p class="proposal">{t('histmap.proposal')}</p>
    <button class="btn" onclick={show}>{t('histmap.view')}</button>
  </section>
{:else if app.place}
  <Lazy loader={() => import('./HistMapControls.svelte')} />
{/if}

<style>
  .histmap {
    margin-top: 0.6rem;
  }
  .proposal {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
    color: #44423c;
  }
  .btn {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid #5a4632;
    background: #5a4632;
    color: #fff;
    cursor: pointer;
    margin-right: 0.4rem;
  }
  .btn:focus-visible {
    outline: 2px solid #18181b;
    outline-offset: 2px;
  }
</style>
