<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { defaultSwipeBefore, type Campaign } from '$lib/domain/ortho';
  import { setSwipeAfter, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { t } from '$lib/i18n/t';

  /**
   * G16 — controles del modo swipe (patrón IGN «Fond 1 / Fond 2»): dos
   * selectores de campaña REAL del catálogo, uno por imagen.
   *   Imagen 1 (izquierda, cortina) → `app.swipeBefore`
   *   Imagen 2 (derecha, lienzo)    → `app.orthoCampaign` (sondeada)
   * Las dos son siempre distintas: la opción elegida en un lado queda
   * deshabilitada en el otro. La cortina arrastrable sigue siendo la
   * comparación; estos selectores solo eligen las fechas — no mezclar
   * con `compareYear` (DOS AÑOS compara edificios, esto compara fotos).
   */

  let after = $derived(app.orthoCampaign ?? app.latest);
  // La imagen 1 efectiva: la elegida o la heurística — el mismo valor que
  // pinta SwipeCompare, para que el selector nunca mienta sobre lo que se ve.
  let before = $derived.by<Campaign | null>(() => {
    const sel = app.swipeBefore;
    if (sel && sel.year !== after?.year) return sel;
    return defaultSwipeBefore(app.allCampaigns, app.year, after);
  });

  function pickBefore(e: Event) {
    const y = Number((e.currentTarget as HTMLSelectElement).value);
    const c = app.allCampaigns.find((x) => x.year === y);
    if (c && c.year !== after?.year) app.swipeBefore = c;
  }

  function pickAfter(e: Event) {
    const y = Number((e.currentTarget as HTMLSelectElement).value);
    const c = app.allCampaigns.find((x) => x.year === y);
    if (c && c.year !== before?.year) setSwipeAfter(c);
  }

  function optLabel(c: Campaign): string {
    return `${c.year} — ${t(`ortho.publisher.${c.source}`)}`;
  }
</script>

{#if app.allCampaigns.length > 1}
  <div class="swipectl" aria-label={t('swipe.pick.a11y')}>
    <div class="sw-picks">
      <label class="sw-field">
        <span class="sw-lbl">{t('swipe.pick.first')}</span>
        <select data-action="swipe-first" value={before?.year ?? ''} onchange={pickBefore}>
          {#each app.allCampaigns as c (c.year)}
            <option value={c.year} disabled={c.year === after?.year}>{optLabel(c)}</option>
          {/each}
        </select>
      </label>
      <label class="sw-field">
        <span class="sw-lbl">{t('swipe.pick.second')}</span>
        <select data-action="swipe-second" value={after?.year ?? ''} onchange={pickAfter}>
          {#each app.allCampaigns as c (c.year)}
            <option value={c.year} disabled={c.year === before?.year}>{optLabel(c)}</option>
          {/each}
        </select>
      </label>
    </div>
    <p class="sw-note">
      {t('swipe.pick.note')}
    </p>
    <!-- G16c: el estado de CADA imagen se declara aquí, en flujo — un
         aviso absoluto dentro del lienzo taparía chips y controles en
         móvil. Cada fallo ofrece reintento explícito en el mismo punto. -->
    {#if app.orthoState === 'NOT_COVERED' || app.orthoState === 'SERVICE_ERROR'}
      <!-- el veredicto se declara en cuanto existe — el barrido de
           alternativas puede seguir en curso y no lo oculta -->
      <p class="sw-status warn" role="status">
        {t('swipe.after_error', { year: after?.year ?? '' })}
        <button
          type="button"
          class="sw-retry"
          data-action="swipe-retry-after"
          onclick={() => after && void probeOrtho(after)}
        >
          {t('swipe.retry')}
        </button>
      </p>
    {:else if probeStatus.probing || app.orthoState === 'UNKNOWN'}
      <p class="sw-status">{t('ortho.loading', { year: after?.year ?? '' })}</p>
    {/if}
    {#if app.swipeBeforeState === 'probing'}
      <p class="sw-status">{t('swipe.loading', { year: before?.year ?? '' })}</p>
    {:else if app.swipeBeforeState === 'error'}
      <p class="sw-status warn" role="status">
        {t('swipe.error', { year: before?.year ?? '' })}
        <button
          type="button"
          class="sw-retry"
          data-action="swipe-retry-before"
          onclick={() => app.swipeBeforeRetry++}
        >
          {t('swipe.retry')}
        </button>
      </p>
    {:else if !app.swipeTilesReady}
      <p class="sw-status">{t('swipe.tiles', { year: before?.year ?? '' })}</p>
    {/if}
  </div>
{/if}

<style>
  .swipectl {
    padding: 0.55rem clamp(1rem, 4vw, 2.4rem) 0.6rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
  }
  .sw-picks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
  }
  .sw-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    color: var(--ink-2);
    /* en estrecho cada campo ocupa su línea y el select cede antes de
       desbordar la página (360 px) */
    flex: 1 1 260px;
    min-width: 0;
  }
  .sw-lbl {
    font-weight: 700;
    color: var(--ink);
    white-space: nowrap;
  }
  .sw-field select {
    font: inherit;
    font-variant-numeric: tabular-nums;
    padding: 0.3rem 0.5rem;
    min-height: 44px;
    border: 1.5px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }
  .sw-field select:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .sw-note {
    margin: 0.3rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-3);
    max-width: 68ch;
  }
  .sw-status {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-2);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .sw-status.warn {
    background: var(--warn-bg);
    color: var(--warn-text);
    border: 1px solid var(--warn-line);
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    max-width: 68ch;
  }
  .sw-retry {
    font: inherit;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 5px;
    border: 1.5px solid currentColor;
    background: transparent;
    color: inherit;
    cursor: pointer;
    min-height: 32px;
  }
  .sw-retry:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
  }
</style>
