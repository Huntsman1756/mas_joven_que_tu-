<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import CellData from '$lib/map/CellData.svelte';

  function clear() {
    const focusInCard = document.getElementById('cell-detail')?.contains(document.activeElement);
    app.selectedCell = null;
    app.cellInspectNone = false;
    if (focusInCard) (document.querySelector('.cell-inspect') as HTMLElement | null)?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && (app.selectedCell || app.cellInspectNone)) clear();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if app.selectedCell || app.cellInspectNone}
  <aside class="card" id="cell-detail" tabindex="-1" aria-label={t('map.cell.detail')}>
    <button class="x" onclick={clear} aria-label={t('map.cell.close')}>✕</button>
    <p class="main">{t('map.cell.detail')}</p>
    {#if app.cellInspectNone}
      <p class="fields">{t('map.cell.none')}</p>
    {:else if app.selectedCell}
      <CellData
        share={app.selectedCell.share}
        footprint={app.selectedCell.footprint}
        known={app.selectedCell.known}
      />
    {/if}
  </aside>
{/if}

<style>
  .card {
    position: relative;
    background: #fff;
    border: 1px solid #d6d3cb;
    border-left: 4px solid #3a3835;
    border-radius: 8px;
    padding: 0.7rem 2rem 0.7rem 0.9rem;
    margin-top: 0.6rem;
    font-size: 0.85rem;
  }
  .card:focus {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
  .main {
    margin: 0;
    font-weight: 600;
  }
  .fields {
    margin: 0.3rem 0 0;
    color: #55534b;
  }
  .x {
    position: absolute;
    top: 0.4rem;
    right: 0.5rem;
    border: 0;
    background: none;
    cursor: pointer;
    color: #605e56;
    font-size: 0.9rem;
  }
  @media (max-width: 700px) {
    .card {
      padding-right: 3.4rem;
    }
    .x {
      top: 0.2rem;
      right: 0.3rem;
    }
  }
</style>
