<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { probeHistMap } from '$lib/domain/histmap';
  import { t } from '$lib/i18n/t';

  // Sonda local: una sola superficie consume el mapa histórico. Regla
  // «último lugar gana» igual que ortho-probe.
  let probing = $state(false);
  let abort: AbortController | null = null;

  async function show() {
    app.histMapVisible = true;
    if (app.histMapState === 'UNAVAILABLE') app.histMapState = 'UNKNOWN'; // retry
    if (app.histMapState !== 'UNKNOWN' || probing) return;
    const place = app.place;
    if (!place) return;
    probing = true;
    abort?.abort();
    abort = new AbortController();
    const st = await probeHistMap(place.lon, place.lat, { signal: abort.signal });
    probing = false;
    if (app.place === place) app.histMapState = st;
  }

  function hide() {
    app.histMapVisible = false;
    abort?.abort();
  }
</script>

{#if app.place}
  <section class="histmap" aria-label={t('histmap.section_label')}>
    {#if !app.histMapVisible}
      <p class="proposal">{t('histmap.proposal')}</p>
      <button class="btn" onclick={show}>{t('histmap.view')}</button>
    {:else}
      <div class="histmap-state">
        {#if probing || app.histMapState === 'UNKNOWN'}
          <p role="status">{t('histmap.loading')}</p>
        {:else if app.histMapState === 'AVAILABLE'}
          <p class="src">{t('histmap.available')}</p>
        {:else}
          <p role="alert">{t('histmap.unavailable')}</p>
          <button class="btn ghost" onclick={show}>{t('histmap.retry')}</button>
        {/if}
        <button class="btn ghost" onclick={hide}>{t('histmap.hide')}</button>
      </div>
    {/if}
  </section>
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
  .src {
    margin: 0.2rem 0;
    font-size: 0.78rem;
    color: #55534b;
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
  .btn.ghost {
    background: transparent;
    color: #5a4632;
  }
  .btn:focus-visible {
    outline: 2px solid #18181b;
    outline-offset: 2px;
  }
  .histmap-state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
</style>
