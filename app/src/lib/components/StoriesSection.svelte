<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { STORIES, STORY_ORDER } from '$lib/domain/stories';
  import Lazy from './Lazy.svelte';

  /**
   * «Cinco lugares de Bizkaia» — índice editorial G7: cada capítulo es una
   * mini-historia visual con miniatura REAL (recorte de la ortofoto oficial
   * de su campaña `air.c1`, generado por `pipeline/g7_story_thumbs.py` —
   * ver manifest en static/data/story-thumbs/). La primera es destacada;
   * el resto forma un grid 2×2. El capítulo completo sigue llegando por
   * carga perezosa (`StoryChapter`) solo tras activación o deep link.
   */
</script>

<section class="stories" aria-labelledby="stories-h">
  <h2 id="stories-h">{t('story.section.title')}</h2>
  <p class="intro">{t('story.section.intro')}</p>
  {#if !app.story}
    <ol class="index">
      {#each STORY_ORDER as id, i (id)}
        {@const def = STORIES[id]}
        <li class:featured={i === 0}>
          <button class="item" onclick={() => void app.enterStory(def)}>
            <img
              class="thumb"
              src="data/story-thumbs/{id}.jpg"
              alt=""
              loading="lazy"
              decoding="async"
              width="640"
              height="400"
            />
            <span class="body">
              <span class="label">{t(`story.${id}.label`)}</span>
              <span class="title">{t(`story.${id}.title`)}</span>
              <span class="see">{t(`story.${id}.see`)}</span>
              <span class="go">{t('story.explore')}</span>
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
    font-size: var(--fs-h2);
    margin: 0 0 0.4rem;
    color: var(--ink);
  }
  .intro {
    margin: 0 0 1.1rem;
    font-size: 0.9rem;
    color: var(--ink-2);
    max-width: 65ch;
  }
  /* G7: la primera historia es protagonista; el resto, grid de cards */
  .index {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.9rem;
  }
  .featured {
    grid-column: 1 / -1;
  }
  .item {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    height: 100%;
    font: inherit;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .item:hover {
    border-color: var(--line-strong);
    box-shadow: 0 4px 14px rgba(24, 38, 49, 0.12);
  }
  .item:hover .title {
    color: var(--accent-deep);
  }
  .item:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .thumb {
    width: 100%;
    aspect-ratio: 8 / 5;
    object-fit: cover;
    display: block;
    background: var(--paper-2);
  }
  .featured .item {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: stretch;
  }
  .featured .thumb {
    aspect-ratio: auto;
    height: 100%;
    min-height: 11rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.8rem 0.95rem 0.95rem;
  }
  .featured .body {
    padding: 1.1rem 1.2rem;
    justify-content: center;
  }
  .label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--carto);
  }
  .title {
    font-family: var(--serif);
    font-size: 1.02rem;
    line-height: 1.25;
    color: var(--ink);
    text-wrap: balance;
  }
  .featured .title {
    font-size: 1.45rem;
  }
  /* G11: dos líneas de contexto + acción explícita por historia */
  .see {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .go {
    margin-top: 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent-deep);
  }
  .item:hover .go {
    text-decoration: underline;
  }
  @media (max-width: 700px) {
    .index {
      grid-template-columns: 1fr;
    }
    .featured .item {
      display: flex;
      flex-direction: column;
    }
    .featured .thumb {
      aspect-ratio: 8 / 5;
      height: auto;
      min-height: 0;
    }
    .featured .title {
      font-size: 1.15rem;
    }
  }
</style>
