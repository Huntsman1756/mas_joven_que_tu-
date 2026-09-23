<script lang="ts">
  import { Layers } from '@lucide/svelte';
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho } from '$lib/domain/ortho-probe.svelte';
  import { t } from '$lib/i18n/t';
  import type { Campaign } from '$lib/domain/ortho';

  /**
   * G19 — controles cartográficos agrupados («layers» del visor): un
   * popover flotante junto al zoom con los toggles de capa. Familia
   * distinta del chrome temporal: capas ≠ tiempo.
   * `ortho` = campaña que activa el toggle «Fotografía aérea» (solo se
   * pasa en modos con ortofoto activable).
   */
  let { ortho = null }: { ortho?: Campaign | null } = $props();

  function toggleOrtho(on: boolean) {
    if (!on) {
      app.orthoVisible = false;
      return;
    }
    if (app.orthoCampaign) app.orthoVisible = true;
    else if (ortho) activateOrtho(ortho);
  }
</script>

<details class="layerbox">
  <summary data-action="layers" aria-label={t('layers.label')} title={t('layers.label')}>
    <Layers size={17} strokeWidth={2} aria-hidden="true" />
  </summary>
  <div class="lyr-body" role="group" aria-label={t('layers.label')}>
    {#if ortho}
      <label class="lyr-item">
        <input
          type="checkbox"
          data-action="ortho-toggle"
          checked={app.orthoVisible}
          onchange={(e) => toggleOrtho(e.currentTarget.checked)}
        />
        {t('layers.ortho')}
      </label>
    {/if}
    <label class="lyr-item">
      <input type="checkbox" data-action="overlay" bind:checked={app.overlayBuildings} />
      {t('layers.buildings')}
    </label>
  </div>
</details>

<style>
  .layerbox {
    position: absolute;
    /* bajo el grupo de zoom de MapLibre (top-right, ~98px) — familia
       cartográfica, junto a los controles del mapa */
    top: 6.6rem;
    right: 0.65rem;
    z-index: 13;
    pointer-events: auto;
  }
  .layerbox summary {
    list-style: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(24, 38, 49, 0.22);
    color: var(--ink-2);
    cursor: pointer;
  }
  .layerbox summary::-webkit-details-marker {
    display: none;
  }
  .layerbox summary:hover {
    color: var(--ink);
    border-color: var(--ink-3, var(--line));
  }
  .layerbox summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .lyr-body {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 15rem;
    padding: 0.45rem 0.6rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(24, 38, 49, 0.22);
    font-size: 0.78rem;
    color: var(--ink);
  }
  .lyr-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.2rem;
    cursor: pointer;
    line-height: 1.3;
  }
  .lyr-item input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }
</style>
