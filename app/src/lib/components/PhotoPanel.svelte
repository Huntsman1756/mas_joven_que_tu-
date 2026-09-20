<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { activateOrtho, probeOrtho, probeStatus } from '$lib/domain/ortho-probe.svelte';
  import { flightSuffix, type Campaign } from '$lib/domain/ortho';
  import { t } from '$lib/i18n/t';

  /**
   * Vista FOTO (G2-B/G5-E): la misma escena del mapa con una campaña de
   * ortofoto. La procedencia (editor, año nominal, vuelo real si se conoce,
   * licencia) es visible en todo estado. Navegar prev/next es una activación
   * explícita — cada paso sondea exactamente la campaña pedida, sin
   * sustituciones silenciosas. Entrar en la vista no pide imagen alguna.
   *
   * Comparación: en pantalla ancha un segundo lienzo sincronizado muestra la
   * campaña `orthoCompare` (CompareMap); en pantalla estrecha el toggle
   * segmentado elige qué campaña ocupa el lienzo único (`app.photoView`).
   * El contorno de los edificios actuales sobre la imagen es opt-in
   * (`app.overlayBuildings`) — nunca pintado por defecto.
   */

  // Campaña en contexto: la activada si existe; si no, la más cercana al año.
  let cur = $derived<Campaign | null>(app.orthoCampaign ?? app.nearest);

  let idx = $derived(cur ? app.allCampaigns.findIndex((c) => c.year === cur.year) : -1);

  // ── Rail de épocas (G6-B): una parada por campaña verificada del
  // catálogo. Roving tabindex + flechas mueven el foco; Enter/clic activa
  // (la activación sigue siendo el gesto opt-in que lanza la sonda).
  let railEl = $state<HTMLElement | null>(null);
  let railFocus = $state<number | null>(null);
  let railTab = $derived(railFocus ?? cur?.year ?? null);

  function onRailKey(e: KeyboardEvent, i: number) {
    const btns = railEl?.querySelectorAll<HTMLButtonElement>('button.epoch');
    if (!btns?.length) return;
    let j: number;
    if (e.key === 'ArrowRight') j = i + 1;
    else if (e.key === 'ArrowLeft') j = i - 1;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = btns.length - 1;
    else return;
    e.preventDefault();
    const b = btns[Math.max(0, Math.min(btns.length - 1, j))];
    if (b) {
      railFocus = Number(b.dataset.year);
      b.focus();
    }
  }

  // La parada activa siempre visible en el rail (scroll horizontal).
  $effect(() => {
    const y = cur?.year;
    if (!railEl || y === undefined) return;
    railEl
      .querySelector(`button.epoch[data-year="${y}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  });

  // Relación con el año de nacimiento (G6-B): siempre el año real de la
  // campaña + la distancia honesta. Nunca etiquetar la imagen como el año
  // del usuario.
  let rel = $derived.by(() => {
    if (!cur || app.year === null) return null;
    const d = cur.year - app.year;
    const n = `${Math.abs(d)} ${Math.abs(d) === 1 ? 'año' : 'años'}`;
    if (d === 0) return t('photo.rel_exact');
    return t(d < 0 ? 'photo.rel_before' : 'photo.rel_after', { n });
  });
  let prev = $derived(idx > 0 ? app.allCampaigns[idx - 1] : null);
  let next = $derived(
    idx >= 0 && idx < app.allCampaigns.length - 1 ? app.allCampaigns[idx + 1] : null
  );

  function publisher(c: Campaign): string {
    return c.source === 'bizkaia' ? t('ortho.publisher.bizkaia') : t('ortho.publisher.geoeuskadi');
  }

  // Deep link (?ortho=YYYY&view=photo): la campaña traída por URL se sondea
  // una vez al montar (sin ella quedaría UNKNOWN).
  $effect(() => {
    const c = app.orthoCampaign;
    if (app.orthoVisible && c && app.orthoState === 'UNKNOWN' && !probeStatus.probing) {
      void probeOrtho(c);
    }
  });

  function toggleCompare() {
    if (app.orthoCompare) {
      app.orthoCompare = null;
      app.photoView = 'a';
    } else if (app.latest && cur && app.latest.year !== cur.year) {
      app.orthoCompare = app.latest;
    }
  }
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
      {#if rel}
        <p class="rel">{rel}</p>
      {/if}
    </div>

    <div class="rail" role="group" aria-label={t('photo.epochs_a11y')} bind:this={railEl}>
      {#each app.allCampaigns as c, i (c.year)}
        <button
          class="epoch"
          class:cur={c.year === cur.year}
          class:birth={app.year !== null && c === app.nearest}
          data-year={c.year}
          tabindex={c.year === railTab ? 0 : -1}
          aria-current={c.year === cur.year ? 'true' : undefined}
          aria-label={c === app.nearest && app.year !== null
            ? `${c.year} — ${t('photo.epoch_birth')}`
            : String(c.year)}
          onclick={() => activateOrtho(c)}
          onkeydown={(e) => onRailKey(e, i)}>{c.year}</button
        >
      {/each}
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
            <button class="btn ghost" onclick={toggleCompare}>
              {app.orthoCompare
                ? t('photo.duo_off')
                : t('photo.duo_on', { latest_year: app.latest.year })}
            </button>
          {/if}
          <button
            class="btn ghost"
            aria-pressed={app.overlayBuildings}
            onclick={() => (app.overlayBuildings = !app.overlayBuildings)}
          >
            {app.overlayBuildings ? t('overlay.buildings.hide') : t('overlay.buildings.show')}
          </button>
          {#if app.orthoCompare}
            <p class="cmp" aria-live="polite">
              {t('ortho.compare_label', { left_year: cur.year, right_year: app.orthoCompare.year })}
            </p>
            <!-- toggle de campaña: solo en pantalla estrecha (un lienzo) -->
            <div class="pv" role="group" aria-label={t('photo.toggle.a11y')}>
              <button
                class="pv-b"
                aria-pressed={app.photoView === 'a'}
                onclick={() => (app.photoView = 'a')}
                >{t('photo.panel_a', { year: cur.year })}</button
              >
              <button
                class="pv-b"
                aria-pressed={app.photoView === 'b'}
                onclick={() => (app.photoView = 'b')}
                >{t('photo.panel_a', { year: app.orthoCompare.year })}</button
              >
            </div>
            <p class="pv-hint">{t('photo.mobile_hint')}</p>
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
    padding: 0.7rem clamp(1rem, 4vw, 2.4rem) 0.9rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
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
    font-family: var(--serif);
    font-size: 1.7rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--accent-deep);
  }
  .nav {
    font: inherit;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    background: none;
    border: 0;
    border-bottom: 1.5px solid var(--accent);
    color: var(--accent-deep);
    padding: 0.15rem 0.1rem;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
  }
  .nav:disabled {
    color: var(--ink-3);
    border-bottom-color: transparent;
    cursor: default;
  }
  .nav:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .src {
    margin: 0;
    font-size: 0.75rem;
    color: var(--ink-3);
  }
  .rel {
    margin: 0;
    font-size: 0.72rem;
    color: var(--accent-deep);
    font-variant-numeric: tabular-nums;
  }
  .rail {
    display: flex;
    gap: 0.3rem;
    overflow-x: auto;
    padding: 0.35rem 0.1rem 0.5rem;
    scrollbar-width: thin;
  }
  .epoch {
    font: inherit;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    padding: 0.3rem 0.55rem;
    min-height: 44px;
    min-width: 44px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    flex: 0 0 auto;
    position: relative;
  }
  .epoch.cur {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }
  .epoch.birth:not(.cur)::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .epoch:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .proposal {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: var(--ink-2);
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
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }
  .pv {
    display: none;
    gap: 0;
    border: 1px solid var(--ink-3);
    border-radius: 8px;
    overflow: hidden;
    margin-left: 0.4rem;
  }
  .pv-b {
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .pv-b[aria-pressed='true'] {
    background: var(--accent);
    color: #fff;
  }
  .pv-hint {
    display: none;
    margin: 0.2rem 0;
    font-size: 0.72rem;
    color: var(--ink-3);
    flex-basis: 100%;
  }
  .btn {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    margin-right: 0.4rem;
    min-height: 44px;
  }
  .btn.ghost {
    background: transparent;
    color: var(--accent-deep);
  }
  .btn:focus-visible,
  .pv-b:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  @media (max-width: 700px) {
    .pv {
      display: inline-flex;
    }
    .pv-hint {
      display: block;
    }
  }
</style>
