<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt } from '$lib/domain/format';

  let p = $derived(app.selectedBuilding);
</script>

{#if p}
  <aside class="card" aria-label={t('building.title')}>
    <button class="x" onclick={() => (app.selectedBuilding = null)} aria-label={t('building.close')}
      >✕</button
    >
    <p class="main">
      {#if p.state === 'VALID' && p.year !== null}
        {t('building.year', { year: p.year })}
      {:else if p.state === 'SUSPICIOUS' || p.state === 'INVALID'}
        {t('building.suspicious', { raw_value: p.year ?? '—' })}
      {:else}
        {t('building.unknown')}
      {/if}
    </p>
    <p class="fields">
      {t('building.fields', {
        uso: p.uso ?? '—',
        alturas: p.alturas ?? '—',
        area: fmt(p.area_m2 ?? 0)
      })}
    </p>
    <p class="note">{t('building.fields.note')}</p>
  </aside>
{/if}

<style>
  .card {
    position: relative;
    background: #fff;
    border: 1px solid #d6d3cb;
    border-left: 4px solid #c63b4f;
    border-radius: 8px;
    padding: 0.7rem 2rem 0.7rem 0.9rem;
    margin-top: 0.6rem;
    font-size: 0.85rem;
  }
  .main {
    margin: 0;
    font-weight: 600;
  }
  .fields {
    margin: 0.3rem 0 0;
    color: #55534b;
  }
  .note {
    margin: 0.2rem 0 0;
    font-size: 0.72rem;
    color: #605e56;
    font-style: italic;
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
    /* el ✕ pasa a 44×44 (A9): más margen para no tapar el texto */
    .card {
      padding-right: 3.4rem;
    }
    .x {
      top: 0.2rem;
      right: 0.3rem;
    }
  }
</style>
