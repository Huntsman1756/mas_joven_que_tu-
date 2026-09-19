<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { STORIES, STORY_ORDER, nextStory } from '$lib/domain/stories';
  import { activateOrtho } from '$lib/domain/ortho-probe.svelte';
  import { fmtPct } from '$lib/domain/format';

  /**
   * Capítulo editorial (G4 §13, lazy): una señal del corpus con la escena
   * ya configurada por `enterStory`. Solo usa hechos del evidence pack —
   * «Qué sabemos y qué no sabemos» mantiene los caveats en cada capítulo.
   * Las acciones reconfiguran la escena viva (cámara/cabezal/ortofoto);
   * el estado personal queda congelado en `app.storySnapshot`.
   */

  let headEl = $state<HTMLHeadingElement | null>(null);

  let def = $derived(app.story ? STORIES[app.story] : null);
  let idx = $derived(app.story ? STORY_ORDER.indexOf(app.story) + 1 : 0);

  // GA2: al cambiar de capítulo el foco llega al encabezado (la escena
  // también cambia, pero el h3 es el ancla de lectura).
  $effect(() => {
    const id = app.story;
    if (id && headEl) headEl.focus();
  });

  function move() {
    if (!def) return;
    if (def.playYear !== null) {
      app.playYear = def.playYear;
      app.playing = false;
      app.playUrlSeq++;
      app.mode = 'time';
    } else {
      // sin pulso temporal: reencuadra el conjunto como invitación a mirar
      app.cameraTarget = { ...def.camera };
      app.cameraSeq++;
    }
  }

  function air() {
    if (!def?.air) return;
    const c1 = app.allCampaigns.find((c) => c.year === def.air!.c1);
    if (!c1) return;
    activateOrtho(c1); // entra en FOTO y sondea (contrato unificado)
    if (def.air.c2 !== null) {
      const c2 = app.allCampaigns.find((c) => c.year === def.air!.c2);
      if (c2 && c2.year !== c1.year) app.orthoCompare = c2;
    }
  }

  function other() {
    const n = nextStory(app.story);
    void app.enterStory(STORIES[n]);
  }
</script>

{#if def && app.story}
  <article class="chapter" data-story={app.story}>
    <p class="kicker">{t('story.chapter', { n: idx })} · {t(`story.${app.story}.label`)}</p>
    <h3 class="c-title" tabindex="-1" bind:this={headEl}>{t(`story.${app.story}.title`)}</h3>

    <div class="blocks">
      <div class="b">
        <h4>{t('story.k.see')}</h4>
        <p>{t(`story.${app.story}.see`)}</p>
      </div>
      <div class="b">
        <h4>{t('story.k.data')}</h4>
        <p class="dato">{t(`story.${app.story}.data`)}</p>
        {#if def.contrast}
          <!-- G4-H1: el contraste C-05/C-08 vive solo aquí — el capítulo es
               quien hace la pregunta que el dato responde. Valores congelados
               del story brief, mismos denominadores que el contrato. -->
          <div class="scontrast">
            <p class="row">
              <span class="num">{fmtPct(def.contrast.count)}</span>
              <span class="txt"
                >{t('contrast.buildings', { selected_year: def.contrast.ref })}</span
              >
            </p>
            <p class="row">
              <span class="num">{fmtPct(def.contrast.footprint)}</span>
              <span class="txt"
                >{t('contrast.footprint', { selected_year: def.contrast.ref })}</span
              >
            </p>
            <p class="note">{t('contrast.note')}</p>
          </div>
        {/if}
      </div>
      <div class="b">
        <h4>{t('story.k.know')}</h4>
        <p>{t(`story.${app.story}.know`)}</p>
      </div>
    </div>

    <div class="c-actions">
      <button class="act" onclick={move}>{t('story.move')}</button>
      {#if def.air}
        <button class="act sec" onclick={air}>{t('story.air')}</button>
      {/if}
      <button class="act ter" onclick={other}>{t('story.next')}</button>
      <button class="act ter" onclick={() => app.closeStory()}>{t('story.back')}</button>
    </div>
  </article>
{/if}

<style>
  .chapter {
    margin-top: 0.9rem;
    border-left: 3px solid #8e2f4c;
    padding: 0.2rem 0 0.2rem 1rem;
    max-width: 68ch;
  }
  .kicker {
    margin: 0 0 0.2rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8e2f4c;
  }
  .c-title {
    margin: 0 0 0.6rem;
    font-size: 1.25rem;
    line-height: 1.25;
    color: #1c1a17;
    text-wrap: balance;
  }
  .c-title:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 3px;
  }
  .blocks {
    display: grid;
    gap: 0.55rem;
  }
  .b h4 {
    margin: 0 0 0.1rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6b63;
  }
  .b p {
    margin: 0;
    font-size: 0.92rem;
    color: #33312c;
    max-width: 62ch;
  }
  .b .dato {
    font-size: 1rem;
    color: #1c1a17;
  }
  .c-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }
  .scontrast {
    margin-top: 0.6rem;
    border-left: 2px solid #d6d3cb;
    padding-left: 0.7rem;
  }
  .scontrast .row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0.2rem 0;
  }
  .scontrast .num {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 1.05rem;
    color: #8e2f4c;
    min-width: 4.2rem;
  }
  .scontrast .txt {
    font-size: 0.82rem;
    color: #33312c;
  }
  .scontrast .note {
    margin: 0.35rem 0 0;
    font-size: 0.75rem;
    color: #6b6b63;
    font-style: italic;
  }
  .act {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    min-height: 44px;
    border: 1px solid #3a3835;
    border-radius: 6px;
    background: #1c1a17;
    color: #f2f0ec;
    cursor: pointer;
  }
  .act.sec {
    background: transparent;
    color: #1c1a17;
  }
  .act.ter {
    background: transparent;
    border-color: transparent;
    color: #55534b;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .act.ter:hover {
    color: #1c1a17;
  }
  .act:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
</style>
