<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
</script>

<div class="mapintro">
  {#if app.mode === 'map'}
    <p>
      <strong>{t('map.intro.title')}</strong>
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
