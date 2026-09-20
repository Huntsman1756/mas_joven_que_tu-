<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { probeHistMap } from '$lib/domain/histmap';
  import { t } from '$lib/i18n/t';

  /**
   * Modo 1923–25 (G4, ADR-015): panel de estado de la escena histórica,
   * como PhotoPanel lo es de FOTO. Ya no hay propuesta ni botón «ver»:
   * entrar en el modo (`view=hist` o el switch) ES el opt-in de red y
   * este panel lazy sondea al montar. «Salir» vuelve a MAPA.
   */

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

  function exit() {
    app.histMapVisible = false;
    app.mode = 'map';
    abort?.abort();
  }

  // Al montar con el modo activo sondea una vez (idempotente: `probing` y
  // el estado distinto de UNKNOWN cortan el bucle).
  $effect(() => {
    if (app.histMapVisible && app.histMapState === 'UNKNOWN' && !probing) void show();
  });
</script>

{#if app.place && app.histMapVisible}
  <section class="histmap" aria-label={t('histmap.section_label')}>
    <p class="note">{t('histmap.note')}</p>
    <div class="histmap-state">
      {#if probing || app.histMapState === 'UNKNOWN'}
        <p role="status">{t('histmap.loading')}</p>
      {:else if app.histMapState === 'AVAILABLE'}
        <p class="src">{t('histmap.available')}</p>
        <button
          class="btn ghost"
          aria-pressed={app.overlayBuildings}
          onclick={() => (app.overlayBuildings = !app.overlayBuildings)}
        >
          {app.overlayBuildings ? t('overlay.buildings.hide') : t('overlay.buildings.show')}
        </button>
      {:else}
        <p role="alert">{t('histmap.unavailable')}</p>
        <button class="btn ghost" onclick={show}>{t('histmap.retry')}</button>
      {/if}
      <button class="btn ghost" onclick={exit}>{t('histmap.exit')}</button>
    </div>
  </section>
{/if}

<style>
  .histmap {
    padding: 0.6rem clamp(1rem, 4vw, 2.4rem) 0.8rem;
    background: var(--paper-2);
    border-bottom: 1px solid var(--line);
  }
  .note {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    max-width: 80ch;
    font-style: italic;
  }
  .src {
    margin: 0.2rem 0;
    font-size: 0.78rem;
    color: var(--ink-3);
    max-width: 70ch;
  }
  .btn {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: transparent;
    color: var(--accent-deep);
    cursor: pointer;
    margin-right: 0.4rem;
    min-height: 44px;
  }
  .btn:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .histmap-state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
</style>
