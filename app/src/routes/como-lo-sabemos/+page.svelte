<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { t } from '$lib/i18n/t';
  import { loadCatalog } from '$lib/domain/catalog';

  let snapshot = $state('—');
  onMount(async () => {
    try {
      const c = await loadCatalog();
      snapshot = String(c.snapshot_year);
    } catch {
      /* snapshot desconocido */
    }
  });
</script>

<svelte:head>
  <title>{t('how.title')} — {t('hero.title')}</title>
</svelte:head>

<main class="how">
  <a class="back" href={resolve('/')}>{t('how.back')}</a>
  <h1>{t('how.title')}</h1>

  <section>
    <h2>{t('how.catastro.title')}</h2>
    <p>{t('how.catastro')}</p>
  </section>
  <section>
    <h2>{t('how.measure.title')}</h2>
    <p>{t('how.measure')}</p>
  </section>
  <section>
    <h2>{t('how.steps.title')}</h2>
    <ol>
      <li>{t('how.steps.1')}</li>
      <li>{t('how.steps.2')}</li>
      <li>{t('how.steps.3')}</li>
      <li>{t('how.steps.4')}</li>
      <li>{t('how.steps.5')}</li>
    </ol>
  </section>
  <section>
    <h2>{t('how.current.title')}</h2>
    <p>{t('how.current')}</p>
  </section>
  <section>
    <h2>{t('how.unknown.title')}</h2>
    <p>{t('how.unknown')}</p>
  </section>
  <section>
    <h2>{t('how.ortho.title')}</h2>
    <p>{t('how.ortho')}</p>
  </section>
  <section>
    <h2>{t('how.campaign.title')}</h2>
    <p>{t('how.campaign')}</p>
  </section>
  <section>
    <h2>{t('how.calc.title')}</h2>
    <p>{t('how.calc')}</p>
  </section>
  <section>
    <h2>{t('how.nocalc.title')}</h2>
    <p>{t('how.nocalc')}</p>
  </section>
  <section>
    <h2>{t('how.limits.title')}</h2>
    <ul>
      <li>{t('how.limits.stock')}</li>
      <li>{t('how.limits.heaping')}</li>
      <li>{t('how.limits.ortho')}</li>
      <li>{t('how.limits.families')}</li>
    </ul>
  </section>
  <section>
    <h2>{t('how.sources.title')}</h2>
    <p>{t('how.sources')}</p>
    <p>{t('footer.sources')}</p>
    <p>{t('footer.code')}</p>
  </section>
  <section>
    <h2>{t('how.snapshot.title')}</h2>
    <p>{t('footer.snapshot', { snapshot_date: snapshot })}</p>
  </section>
</main>

<style>
  .how {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.2rem 4rem;
    font-family: 'Source Sans 3', 'Segoe UI', system-ui, sans-serif;
    color: #1c1a17;
    background: #f2f0ec;
    min-height: 100svh;
  }
  .back {
    font-size: 0.85rem;
    color: #8e2f4c;
  }
  h1 {
    font-size: 1.9rem;
    margin: 0.8rem 0 1.4rem;
  }
  h2 {
    font-size: 1.05rem;
    margin: 1.6rem 0 0.3rem;
    color: #33312c;
  }
  p {
    margin: 0.25rem 0;
    line-height: 1.55;
    color: #44423c;
  }
  ol,
  ul {
    margin: 0.25rem 0;
    padding-left: 1.3rem;
    color: #44423c;
    line-height: 1.55;
  }
  li {
    margin: 0.2rem 0;
  }
</style>
