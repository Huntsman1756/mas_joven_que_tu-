<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  let { compactStory = false }: { compactStory?: boolean } = $props();
</script>

<div class="mapintro">
  {#if app.mode === 'map'}
    <p>
      {#if !compactStory}<strong>{t('map.intro.title')}</strong>{/if}
      {#if app.mapLevel === 'BIZKAIA'}
        {t('map.intro.munis', { selected_year: app.year ?? '' })}
      {:else if app.mapLevel === 'CELDA'}
        {t('map.intro.cells', { selected_year: app.year ?? '' })}
      {:else}
        {t('map.intro.buildings', { selected_year: app.year ?? '' })}
      {/if}
    </p>
  {:else if app.mode === 'time'}
    <p>
      <strong>{t('view.intro.time.title')}</strong>
      {t('view.intro.time.body')}
    </p>
  {:else if app.mode === 'photo'}
    <p>
      <strong>{t('view.intro.photo.title')}</strong>
      {t('view.intro.photo.body')}
    </p>
  {:else if app.mode === 'hist'}
    <p>
      <strong>{t('view.intro.hist.title')}</strong>
      {t('view.intro.hist.body')}
    </p>
  {:else if app.mode === 'swipe'}
    <p>
      <strong>{t('view.intro.swipe.title')}</strong>
      {t('view.intro.swipe.body')}
    </p>
  {/if}
  {#if !compactStory}<p class="maphint">
      {t(
        app.mode !== 'map'
          ? 'map.navigation.general'
          : app.mapLevel === 'BIZKAIA'
            ? 'map.navigation.overview'
            : app.mapLevel === 'CELDA'
              ? 'map.navigation.zones'
              : 'map.navigation.buildings'
      )}
    </p>{/if}
  <div class="mapactions">
    {#if app.place}
      <button class="mapreset" disabled={!app.mapReset} onclick={() => app.mapReset?.()}>
        {t('map.navigation.reset', { municipality: app.place.name })}
      </button>
    {/if}
    <details class="maphelp">
      <summary>{t('map.navigation.help')}</summary>
      <ul>
        <li>{t('map.navigation.mouse')}</li>
        <li>{t('map.navigation.touch')}</li>
        <li>{t('map.navigation.keyboard')}</li>
      </ul>
    </details>
  </div>
</div>

<style>
  .mapintro {
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    padding: 0.45rem clamp(1rem, 2vw, 1.4rem);
  }
  @media (min-width: 1024px) {
    .mapintro {
      min-height: 7.5rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
  }
  .mapintro p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.45;
    color: var(--ink-2);
    max-width: 76ch;
  }
  .mapintro strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--ink);
  }
  .mapintro .maphint {
    margin-top: 0.4rem;
    color: var(--ink);
    font-size: 0.95rem;
  }
  .maphelp {
    font-size: 0.95rem;
    line-height: 1.45;
    color: var(--ink-2);
    max-width: 76ch;
  }
  .mapactions {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1.5rem;
    align-items: flex-start;
  }
  .maphelp {
    flex: 1 1 17rem;
  }
  .mapreset {
    align-self: flex-start;
    margin-top: 0.15rem;
    min-height: 44px;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--ink-2);
    text-align: left;
    font: inherit;
    font-size: 0.95rem;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  .mapreset:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .maphelp summary {
    cursor: pointer;
    min-height: 44px;
    display: list-item;
    align-content: center;
    width: fit-content;
    color: var(--ink-2);
  }
  .maphelp ul {
    margin: 0 0 0.4rem;
    padding-left: 1.25rem;
  }
  .maphelp li + li {
    margin-top: 0.3rem;
  }
  @media (max-width: 767px) {
    .mapintro {
      padding: 0.35rem 1rem;
    }
    .mapintro p {
      /* suelo de legibilidad del gate G12 (explanation_readable ≥15px):
         la explicación del mapa es texto clave, no copy secundario */
      font-size: 0.95rem;
      line-height: 1.4;
    }
  }
</style>
