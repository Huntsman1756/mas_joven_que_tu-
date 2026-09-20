<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { STORIES, STORY_ORDER } from '$lib/domain/stories';
  import Lazy from './Lazy.svelte';

  /**
   * «Cinco lugares de Bizkaia» — índice editorial (G5-H). Ya no es un
   * botón de «descúbreme»: los cinco casos se listan como sumario de
   * capítulos (número, lugar, periodo, título). Cada entrada configura la
   * escena del mapa; el capítulo con copy llega por carga perezosa
   * (`StoryChapter`, chunk lazy) solo tras activación o deep link `?story=`.
   * Tu año y tu lugar se conservan aparte y «Volver a mi Bizkaia» restaura.
   */
</script>

<section class="stories" aria-labelledby="stories-h">
  <h2 id="stories-h">{t('story.section.title')}</h2>
  <p class="intro">{t('story.section.intro')}</p>
  {#if !app.story}
    <ol class="index">
      {#each STORY_ORDER as id, i (id)}
        <li>
          <button class="item" onclick={() => void app.enterStory(STORIES[id])}>
            <span class="num">{i + 1}</span>
            <span class="body">
              <span class="label">{t(`story.${id}.label`)}</span>
              <span class="title">{t(`story.${id}.title`)}</span>
            </span>
          </button>
        </li>
      {/each}
    </ol>
  {:else}
    <Lazy loader={() => import('./StoryChapter.svelte')} />
  {/if}
</section>

<style>
  .stories {
    margin-top: 0.4rem;
  }
  h2 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: 1.5rem;
    margin: 0 0 0.4rem;
    color: var(--ink);
  }
  .intro {
    margin: 0 0 1rem;
    font-size: 0.88rem;
    color: var(--ink-2);
    max-width: 65ch;
  }
  /* sumario de capítulos: líneas de texto con numeración, no tarjetas */
  .index {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .item {
    display: flex;
    gap: 0.9rem;
    align-items: baseline;
    width: 100%;
    font: inherit;
    text-align: left;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--line);
    padding: 0.7rem 0.2rem;
    cursor: pointer;
    min-height: 44px;
  }
  .item:hover .title {
    color: var(--accent-deep);
  }
  .item:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .num {
    font-family: var(--serif);
    font-size: 1.15rem;
    color: var(--accent);
    min-width: 1.4em;
    font-variant-numeric: tabular-nums;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .title {
    font-family: var(--serif);
    font-size: 1.05rem;
    color: var(--ink);
    text-wrap: balance;
  }
</style>
