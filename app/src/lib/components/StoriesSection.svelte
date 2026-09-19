<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { STORIES, nextStory } from '$lib/domain/stories';
  import Lazy from './Lazy.svelte';

  /**
   * «Cinco lugares de Bizkaia» (G4 §13–15, tramo editorial L4). La shell es
   * eager — solo texto y un botón; el capítulo (`StoryChapter`) llega por
   * carga perezosa tras activación explícita o deep link `?story=`.
   * Descúbreme abre el primer capítulo del orden editorial congelado;
   * dentro de un capítulo, «Otro» rota determinista.
   */
  function discover() {
    void app.enterStory(STORIES[nextStory(app.story)]);
  }
</script>

<section class="stories" aria-labelledby="stories-h">
  <h2 id="stories-h">{t('story.section.title')}</h2>
  <p class="intro">{t('story.section.intro')}</p>
  {#if !app.story}
    <button class="cta" onclick={discover}>{t('story.discover')}</button>
  {:else}
    <Lazy loader={() => import('./StoryChapter.svelte')} />
  {/if}
</section>

<style>
  .stories {
    margin-top: 1.4rem;
  }
  h2 {
    font-size: 1.05rem;
    margin: 0 0 0.4rem;
    color: #33312c;
  }
  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
    color: #55534b;
    max-width: 65ch;
  }
  .cta {
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
  .cta:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
</style>
