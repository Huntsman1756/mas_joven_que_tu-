<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
</script>

{#if app.story}
  <div class="story-notes" data-story={app.story}>
    <details class="b conclusion">
      <summary>{t('story.k.concl')}</summary>
      <p>{t(`story.${app.story}.concl`)}</p>
    </details>
    <details class="b limits">
      <summary>{t('story.k.know')}</summary>
      <p>{t(`story.${app.story}.know`)}</p>
    </details>
  </div>
{/if}

<style>
  .story-notes {
    display: grid;
    gap: 0.35rem;
  }
  summary {
    color: var(--accent-deep);
    cursor: pointer;
    min-height: 44px;
    align-content: center;
    font-size: 0.8rem;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 0.92rem;
    color: var(--ink);
    max-width: 62ch;
  }
</style>
