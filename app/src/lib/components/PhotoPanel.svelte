<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { flightSuffix, type Campaign } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';

  /**
   * Vista FOTO (G2-B, gate F4): la misma escena del mapa con una campaña de
   * ortofoto. La procedencia (editor, año nominal, vuelo real si se conoce,
   * licencia) es visible en todo estado. Navegar prev/next es una activación
   * explícita — cada paso sondea exactamente la campaña pedida, sin
   * sustituciones silenciosas. Entrar en la vista no pide imagen alguna.
   */

  // Campaña en contexto: la activada si existe; si no, la más cercana al año.
  let cur = $derived<Campaign | null>(app.orthoCampaign ?? app.nearest);

  let idx = $derived(cur ? app.allCampaigns.findIndex((c) => c.year === cur.year) : -1);
  let prev = $derived(idx > 0 ? app.allCampaigns[idx - 1] : null);
  let next = $derived(
    idx >= 0 && idx < app.allCampaigns.length - 1 ? app.allCampaigns[idx + 1] : null
  );

  function publisher(c: Campaign): string {
    return c.source === 'bizkaia' ? t('ortho.publisher.bizkaia') : t('ortho.publisher.geoeuskadi');
  }

  // Deep link (?ortho=YYYY&view=photo): mismo contrato que OrthoControls — la
  // campaña traída por URL se sondea una vez (sin ella quedaría UNKNOWN).
  $effect(() => {
    const c = app.orthoCampaign;
    if (app.orthoVisible && c && app.orthoState === 'UNKNOWN' && !probeStatus.probing) {
      void probeOrtho(c);
    }
  });
</script>

{#if cur && app.year !== null}
  <section class="photo" aria-label={t('photo.label')}>
    <div class="p-head">
      <div class="p-nav">
        <button
          class="nav"
          disabled={!prev}
          onclick={() => prev && activateOrtho(prev)}
          aria-label={prev ? t('photo.prev', { year: prev.year }) : t('photo.prev_none')}
        >
          ← {prev ? prev.year : '—'}
        </button>
        <strong class="p-year">{cur.year}</strong>
        <button
          class="nav"
          disabled={!next}
          onclick={() => next && activateOrtho(next)}
          aria-label={next ? t('photo.next', { year: next.year }) : t('photo.next_none')}
        >
          {next ? next.year : '—'} →
        </button>
      </div>
      <p class="src">
        {publisher(cur)} · {t('photo.nominal', { year: cur.year })}{flightSuffix(cur, t)} · CC BY 4.0
      </p>
    </div>

    {#if !app.orthoVisible}
      <p class="proposal">{t('photo.proposal', { year: cur.year })}</p>
      <button class="btn" onclick={() => activateOrtho(cur!)}>{t('photo.activate')}</button>
    {:else}
      <div class="state">
        {#if probeStatus.probing || app.orthoState === 'UNKNOWN'}
          <p role="status">{t('ortho.loading', { year: cur.year })}</p>
        {:else if app.orthoState === 'AVAILABLE'}
          {#if app.latest && app.latest.year !== cur.year}
            <button
              class="btn ghost"
              onclick={() => (app.orthoCompare = app.orthoCompare ? null : app.latest)}
            >
              {app.orthoCompare
                ? t('ortho.hide')
                : t('ortho.compare', { latest_year: app.latest.year })}
            </button>
          {/if}
          {#if app.orthoCompare}
            <p class="cmp" aria-live="polite">
              {t('ortho.compare_label', { left_year: cur.year, right_year: app.orthoCompare.year })}
            </p>
          {/if}
        {:else if app.orthoState === 'NOT_COVERED'}
          <p role="status">
            {t('ortho.not_covered', {
              year: cur.year,
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
          <button class="btn ghost" onclick={() => cur && void probeOrtho(cur)}
            >{t('ortho.retry')}</button
          >
        {/if}
        <button class="btn ghost" onclick={() => (app.orthoVisible = false)}
          >{t('ortho.hide')}</button
        >
      </div>
    {/if}
  </section>
{/if}

<style>
  .photo {
    padding: 0.7rem clamp(0.9rem, 3vw, 2rem) 0.9rem;
    background: #efede7;
    border-bottom: 1px solid #ddd9d0;
  }
  .p-head {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .p-nav {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
  }
  .p-year {
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    color: #1c1a17;
  }
  .nav {
    font: inherit;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    background: none;
    border: 0;
    border-bottom: 1.5px solid #8e2f4c;
    color: #8e2f4c;
    padding: 0.15rem 0.1rem;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
  }
  .nav:disabled {
    color: #6b6b63;
    border-bottom-color: transparent;
    cursor: default;
  }
  .nav:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
  .src {
    margin: 0;
    font-size: 0.75rem;
    color: #55534b;
  }
  .proposal {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: #44423c;
  }
  .state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.4rem;
  }
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
</style>
