<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';

  /**
   * G5 GT3 — los cuatro modos de la escena agrupados por intención:
   * LEER EL DATO (Edificios · En el tiempo) vs COMPROBAR CON OTRAS
   * FUENTES (fotos aéreas · mapa 1923–25). Ya no son cuatro botones
   * equivalentes: el grupo declara qué tipo de evidencia es cada vista.
   * Cambiar de vista nunca toca `place` ni `year` (S2) y el cabezal
   * `playYear` persiste. Entrar en 1923–25 ES el opt-in de red del mapa
   * histórico; entrar en FOTOS no pide imagen alguna.
   */

  const GROUPS = [
    { label: 'view.group.read', modes: ['map', 'time'] },
    { label: 'view.group.check', modes: ['photo', 'hist', 'swipe'] }
  ] as const;

  function setMode(m: 'map' | 'time' | 'photo' | 'hist' | 'swipe') {
    app.mode = m;
    if (m === 'time' && app.playYear === null && app.year !== null) {
      app.playYear = app.year; // cabezal pausado en el año personal
      app.playUrlSeq++; // evento discreto: la URL recoge la pausa, no el tick
    }
    app.histMapVisible = m === 'hist';
    if (m === 'swipe') {
      // G6: el lienzo principal pasa a la última campaña («hoy»);
      // SwipeCompare sondea y monta la cortina con la primera (1956).
      app.orthoCampaign = app.latest;
      app.orthoVisible = true;
      app.orthoState = 'UNKNOWN';
      app.orthoAlternatives = [];
      app.orthoCompare = null;
      app.photoView = 'a';
    } else if (m !== 'photo') {
      app.orthoVisible = false;
      app.orthoCompare = null;
    }
  }
</script>

<nav class="viewswitch" aria-label={t('view.label')}>
  {#each GROUPS as g, gi (g.label)}
    <span class="glabel" id="vg-{gi}">{t(g.label)}</span>
    <span class="gmodes" role="group" aria-labelledby="vg-{gi}">
      {#each g.modes as m (m)}
        <button
          class="v"
          data-mode={m}
          aria-current={app.mode === m ? 'true' : undefined}
          onclick={() => setMode(m)}>{t(`view.${m}`)}</button
        >
      {/each}
    </span>
  {/each}
</nav>
<p class="bridge">{t('view.bridge')}</p>

<style>
  .viewswitch {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.2rem 1.4rem;
    padding: 0.55rem clamp(1rem, 4vw, 2.4rem) 0.4rem;
    border-bottom: 1px solid var(--line);
    background: var(--paper-2);
  }
  .glabel {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-right: 0.2rem;
  }
  .gmodes {
    display: inline-flex;
    align-items: baseline;
    gap: 0.15rem;
  }
  .gmodes + .glabel {
    margin-left: 0.8rem;
  }
  .v {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    background: none;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0.25rem 0.3rem;
    color: var(--ink-3);
    cursor: pointer;
    min-height: 44px;
  }
  .v[aria-current='true'] {
    color: var(--ink);
    border-bottom-color: var(--accent);
  }
  .v:hover {
    color: var(--ink);
  }
  .v:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .bridge {
    margin: 0;
    padding: 0.3rem clamp(1rem, 4vw, 2.4rem) 0.55rem;
    font-size: 0.72rem;
    color: var(--ink-3);
    background: var(--paper-2);
    max-width: 110ch;
  }
</style>
