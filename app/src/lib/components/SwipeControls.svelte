<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { defaultSwipeBefore, type Campaign } from '$lib/domain/ortho';
  import { setSwipeAfter, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { isMobile } from '$lib/state/viewport.svelte';
  import { tick } from 'svelte';
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

  /* MOB-02: en móvil los selectores no viven sobre la imagen — el chip
     «año ↔ año» abre un sheet bajo demanda; el árbitro de overlays lo
     mantiene exclusivo y el backdrop/✕ lo cierran. Los borradores solo
     se publican al aplicar (cancelar no toca estado). */
  let dBefore = $state<number | null>(null);
  let dAfter = $state<number | null>(null);
  let openBtn = $state<HTMLButtonElement | null>(null);
  let sheetEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (app.campaignSheetOpen) {
      dBefore = before?.year ?? null;
      dAfter = after?.year ?? null;
      // foco contenido en el diálogo (no en un select: evita que iOS abra
      // el picker nativo de golpe); al cerrar vuelve al chip — closeSheet
      void tick().then(() => sheetEl?.focus());
    }
  });

  /** Cerrar el sheet devuelve el foco al chip que lo abrió (§5). */
  async function closeSheet() {
    app.closeOverlay('campaigns');
    await tick();
    openBtn?.focus();
  }

  function applyPicks() {
    const b = app.allCampaigns.find((c) => c.year === dBefore);
    const a = app.allCampaigns.find((c) => c.year === dAfter);
    if (b && b.year !== a?.year) app.swipeBefore = b;
    if (a && a.year !== b?.year) setSwipeAfter(a);
    app.closeOverlay('campaigns');
    void tick().then(() => openBtn?.focus());
  }

  function optLabel(c: Campaign): string {
    return `${c.year} — ${t(`ortho.publisher.${c.source}`)}`;
  }
</script>

{#if app.allCampaigns.length > 1}
  {#if isMobile.on}
    <!-- MOB-01/02: estado normal = chip compacto; la selección de
         campañas es un sheet bajo demanda (árbitro de overlays) -->
    <div class="sw-compact">
      <button
        type="button"
        class="sw-open"
        data-action="swipe-picks-open"
        bind:this={openBtn}
        onclick={() => app.openOverlay('campaigns')}
      >
        {before?.year ?? '—'} ↔ {after?.year ?? '—'} · {t('result.change.short')}
      </button>
    </div>
    {#if app.campaignSheetOpen}
      <button
        class="sw-backdrop"
        type="button"
        tabindex="-1"
        aria-label={t('result.change.cancel')}
        onclick={closeSheet}
      ></button>
      <div
        class="sw-sheet"
        role="dialog"
        tabindex="-1"
        aria-label={t('swipe.pick.a11y')}
        bind:this={sheetEl}
        onkeydown={(e) => e.key === 'Escape' && closeSheet()}
      >
        <div class="sw-picks">
          <label class="sw-field">
            <span class="sw-lbl">{t('swipe.pick.first')}</span>
            <select
              data-action="swipe-first"
              value={dBefore ?? ''}
              onchange={(e) => (dBefore = Number((e.currentTarget as HTMLSelectElement).value))}
            >
              {#each app.allCampaigns as c (c.year)}
                <option value={c.year} disabled={c.year === dAfter}>{optLabel(c)}</option>
              {/each}
            </select>
          </label>
          <label class="sw-field">
            <span class="sw-lbl">{t('swipe.pick.second')}</span>
            <select
              data-action="swipe-second"
              value={dAfter ?? ''}
              onchange={(e) => (dAfter = Number((e.currentTarget as HTMLSelectElement).value))}
            >
              {#each app.allCampaigns as c (c.year)}
                <option value={c.year} disabled={c.year === dBefore}>{optLabel(c)}</option>
              {/each}
            </select>
          </label>
        </div>
        <p class="sw-note">{t('swipe.pick.note')}</p>
        <div class="sw-actions">
          <button type="button" class="sw-cancel" onclick={closeSheet}>
            {t('result.change.cancel')}
          </button>
          <button type="button" class="sw-apply" data-action="swipe-apply" onclick={applyPicks}>
            {t('result.change.apply')}
          </button>
        </div>
      </div>
    {/if}
    <!-- estados declarados también con el sheet cerrado (G16c) -->
    <div class="sw-statuses">
      {#if app.orthoState === 'NOT_COVERED' || app.orthoState === 'SERVICE_ERROR'}
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
  {:else}
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
{/if}

<style>
  /* G19: tarjeta flotante sobre el lienzo — los selectores de campaña
     son chrome del visor, no una sección de página encima del mapa */
  .swipectl {
    position: absolute;
    top: 0.6rem;
    left: 0.7rem;
    z-index: 12;
    pointer-events: auto;
    max-width: min(30rem, 64%);
    padding: 0.55rem 0.7rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 4px 18px rgba(24, 38, 49, 0.22);
  }
  .sw-picks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.9rem;
  }
  .sw-field {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    color: var(--ink-2);
    flex: 1 1 200px;
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
    min-height: 40px;
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
    margin: 0.35rem 0 0;
    font-size: 0.68rem;
    color: var(--ink-3);
    line-height: 1.35;
  }
  .sw-status {
    margin: 0.3rem 0 0;
    font-size: 0.78rem;
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
  @media (max-width: 1023px) {
    .swipectl {
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
    }
  }

  /* ── MOB-R1 §9/§10 — móvil: comparador limpio por defecto ──────────
     Un chip compacto en la zona superior del canvas abre el sheet de
     campañas; «Solo A/B» siguen en el lienzo (SwipeCompare, ya elevado
     sobre el chrome del navegador). El chip va centrado: las esquinas
     del lienzo ya están ocupadas (años antes/después, zoom). */
  .sw-compact {
    position: absolute;
    top: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-ctrl, 12);
    pointer-events: auto;
  }
  .sw-open {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-height: 44px;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 4px 14px rgba(24, 38, 49, 0.22);
    cursor: pointer;
  }
  .sw-open:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  /* en móvil las líneas de estado viven junto al chip, apiladas, no
     dentro de una tarjeta grande sobre la imagen. Centradas y acotadas:
     no pisan el aviso de huecos (izda) ni el chip del año actual (dcha) */
  .sw-statuses {
    position: absolute;
    top: 3.4rem;
    left: 50%;
    transform: translateX(-50%);
    max-width: 64%;
    z-index: var(--z-ctrl, 12);
    pointer-events: none;
  }
  .sw-statuses .sw-status {
    margin: 0 0 0.3rem;
    padding: 0.4rem 0.6rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(24, 38, 49, 0.2);
    font-size: 0.78rem;
    pointer-events: auto;
  }
  /* MOB-R1 §4/§8: «Reintentar» es acción crítica — hitbox táctil ≥44 px */
  .sw-statuses .sw-retry {
    min-height: 44px;
    padding: 0.2rem 0.8rem;
  }
  /* el sheet y su telón viven dentro de .tclayer (pointer-events:none) —
     hay que reactivar el puntero o los clics atraviesan al lienzo */
  .sw-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-backdrop, 45);
    pointer-events: auto;
    border: 0;
    padding: 0;
    background: rgba(24, 38, 49, 0.42);
    cursor: default;
  }
  .sw-sheet {
    position: fixed;
    left: 0;
    right: 0;
    /* sobre el visual viewport real — Safari nunca lo tapa */
    bottom: max(var(--vvb, 0px), env(safe-area-inset-bottom));
    z-index: var(--z-sheet, 50);
    pointer-events: auto;
    max-height: calc(var(--vvh, 100vh) * 0.55);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.9rem 1rem 1rem;
    background: var(--surface);
    border-top: 2px solid var(--line-strong);
    box-shadow: 0 -10px 30px rgba(24, 38, 49, 0.3);
  }
  .sw-sheet:focus {
    outline: none; /* contenedor: el foco entra al diálogo, no marca borde */
  }
  .sw-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.7rem;
  }
  .sw-cancel {
    font: inherit;
    font-size: 0.85rem;
    min-height: 44px;
    padding: 0 0.9rem;
    border-radius: 8px;
    border: 1px solid var(--ink-3);
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .sw-apply {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: 0;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
  }
</style>
