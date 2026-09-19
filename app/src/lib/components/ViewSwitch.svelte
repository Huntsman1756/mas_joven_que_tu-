<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';

  /**
   * MAPA · TIEMPO · FOTO · 1923–25 (G4, ADR-015): la misma escena con
   * cuatro modos, no cuatro aplicaciones. Cambiar de vista nunca toca
   * `place` ni `year` (S2) y el cabezal `playYear` persiste.
   * Exclusividad: la ortofoto solo vive en FOTO y la capa histórica solo
   * en 1923-25 — salir de un modo retira su evidencia del lienzo. Entrar
   * en 1923-25 ES el opt-in de red del mapa histórico (su panel lazy
   * sondea al montar); entrar en FOTO no pide imagen alguna.
   */

  const MODES = ['map', 'time', 'photo', 'hist'] as const;

  function setMode(m: (typeof MODES)[number]) {
    app.mode = m;
    if (m === 'time' && app.playYear === null && app.year !== null) {
      app.playYear = app.year; // cabezal pausado en el año personal
      app.playUrlSeq++; // evento discreto: la URL recoge la pausa, no el tick
    }
    app.histMapVisible = m === 'hist';
    if (m !== 'photo') {
      app.orthoVisible = false;
      app.orthoCompare = null;
    }
  }
</script>

<nav class="viewswitch" aria-label={t('view.label')}>
  {#each MODES as m, i (m)}
    {#if i > 0}<span class="sep" aria-hidden="true">·</span>{/if}
    <button class="v" aria-current={app.mode === m ? 'true' : undefined} onclick={() => setMode(m)}
      >{t(`view.${m}`)}</button
    >
  {/each}
</nav>

<style>
  .viewswitch {
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
    padding: 0.45rem clamp(0.9rem, 3vw, 2rem) 0.35rem;
    border-bottom: 1px solid #ddd9d0;
    background: #f7f5f1;
  }
  .sep {
    color: #6b6b63;
    padding: 0 0.3rem;
  }
  .v {
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0.2rem 0.25rem;
    color: #6b6b63;
    cursor: pointer;
    min-height: 44px;
  }
  .v[aria-current='true'] {
    color: #1c1a17;
    border-bottom-color: #8e2f4c;
  }
  .v:hover {
    color: #1c1a17;
  }
  .v:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
</style>
