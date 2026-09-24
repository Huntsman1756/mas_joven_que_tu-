<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { probeHistMap } from '$lib/domain/histmap';
  import { t } from '$lib/i18n/t';
  import LayerToggles from './LayerToggles.svelte';

  /**
   * Modo 1923–25 (G4, ADR-015): tarjeta flotante de estado sobre el
   * lienzo (G19: los controles son chrome del mapa, no una sección de
   * página). Entrar en el modo (`view=hist` o el switch) ES el opt-in
   * de red y este panel lazy sondea al montar. «Salir» vuelve a MAPA.
   * El contorno de edificios actuales vive en el popover de capas.
   * G19-R3: la nota «mapa dibujado por cartógrafos…» se muestra en el
   * ModeIntroSlot común (franja sobre el lienzo, como en los otros
   * modos) — aquí queda solo el estado y la salida.
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
    app.modeNavSeq++; // salir del modo es un cambio explícito (G8)
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
    <div class="histmap-state">
      {#if probing || app.histMapState === 'UNKNOWN'}
        <p role="status">{t('histmap.loading')}</p>
      {:else if app.histMapState === 'AVAILABLE'}
        <p class="src">{t('histmap.available')}</p>
      {:else}
        <p role="alert">{t('histmap.unavailable')}</p>
        <button class="btn ghost" data-action="retry" onclick={show}>{t('histmap.retry')}</button>
      {/if}
      <button class="btn ghost" data-action="exit" onclick={exit}>{t('histmap.exit')}</button>
    </div>
  </section>
  <LayerToggles />
{/if}

<style>
  .histmap {
    position: absolute;
    top: 0.6rem;
    left: 0.7rem;
    z-index: 12;
    pointer-events: auto;
    max-width: min(26rem, 62%);
    padding: 0.55rem 0.7rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 4px 18px rgba(24, 38, 49, 0.22);
  }
  .src {
    margin: 0;
    font-size: 0.74rem;
    color: var(--ink-3);
    line-height: 1.35;
  }
  .btn {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    border: 1.5px solid var(--accent);
    background: transparent;
    color: var(--accent-deep);
    cursor: pointer;
    margin-right: 0.3rem;
    min-height: 40px;
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
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .histmap-state p {
    margin: 0;
  }
  @media (max-width: 1023px) {
    .histmap {
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
    }
  }
</style>
