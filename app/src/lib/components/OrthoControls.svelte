<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { flightSuffix } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';

  function showNearest() {
    if (app.nearest) activateOrtho(app.nearest);
  }

  // Deep link (?ortho=YYYY): la capa se activa desde URL sin clic; hay que
  // sondearla o quedaría UNKNOWN para siempre.
  $effect(() => {
    const c = app.orthoCampaign;
    if (app.orthoVisible && c && app.orthoState === 'UNKNOWN' && !probeStatus.probing) {
      void probeOrtho(c);
    }
  });

  function toggleCompare() {
    app.orthoCompare = app.orthoCompare ? null : app.latest;
  }

  let delta = $derived(
    app.nearest && app.year !== null ? Math.abs(app.nearest.year - app.year) : 0
  );
</script>

{#if app.nearest && app.year !== null}
  <section class="ortho" aria-label={t('ortho.section_label')}>
    {#if !app.orthoVisible}
      <p class="proposal">
        {t('ortho.proposal', { selected_year: app.year, nearest_year: app.nearest.year, delta })}
      </p>
      <button class="btn" onclick={showNearest}>
        {t('ortho.view', { nearest_year: app.nearest.year })}
      </button>
    {:else}
      <div class="ortho-state">
        {#if probeStatus.probing || app.orthoState === 'UNKNOWN'}
          <p role="status">{t('ortho.loading', { year: app.orthoCampaign?.year ?? '' })}</p>
        {:else if app.orthoState === 'AVAILABLE' && app.orthoCampaign}
          <p class="src">
            {t('ortho.available', {
              publisher:
                app.orthoCampaign.source === 'bizkaia'
                  ? t('ortho.publisher.bizkaia')
                  : t('ortho.publisher.geoeuskadi'),
              year: app.orthoCampaign.year,
              flight_range: flightSuffix(app.orthoCampaign, t)
            })}
          </p>
          {#if app.latest && app.latest.year !== app.orthoCampaign.year}
            <button class="btn ghost" onclick={toggleCompare}>
              {app.orthoCompare
                ? t('ortho.hide')
                : t('ortho.compare', { latest_year: app.latest.year })}
            </button>
          {/if}
          {#if app.orthoCompare}
            <p class="cmp" aria-live="polite">
              {t('ortho.compare_label', {
                left_year: app.orthoCampaign.year,
                right_year: app.orthoCompare.year
              })}
            </p>
          {/if}
        {:else if app.orthoState === 'NOT_COVERED'}
          <p role="status">
            {t('ortho.not_covered', {
              year: app.orthoCampaign?.year ?? '',
              alternatives:
                app.orthoAlternatives.map((c) => String(c.year)).join(' o ') ||
                t('ortho.fallback_alt')
            })}
          </p>
          {#each app.orthoAlternatives as c (c.year)}
            <button class="btn ghost" onclick={() => activateOrtho(c)}>{c.year}</button>
          {/each}
        {:else}
          <p role="alert">{t('ortho.service_error')}</p>
          <button class="btn ghost" onclick={showNearest}>{t('ortho.retry')}</button>
        {/if}
        <button class="btn ghost" onclick={() => (app.orthoVisible = false)}>
          {t('ortho.hide')}
        </button>
      </div>
    {/if}
  </section>
{/if}

<style>
  .ortho {
    margin-top: 0.6rem;
  }
  .proposal {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
    color: #44423c;
  }
  .src,
  .cmp {
    margin: 0.2rem 0;
    font-size: 0.78rem;
    color: #55534b;
  }
  .btn {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid #c63b4f;
    background: #c63b4f;
    color: #fff;
    cursor: pointer;
    margin-right: 0.4rem;
  }
  .btn.ghost {
    background: transparent;
    color: #8e2f4c;
  }
  .btn:focus-visible {
    outline: 2px solid #18181b;
    outline-offset: 2px;
  }
  .ortho-state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
</style>
