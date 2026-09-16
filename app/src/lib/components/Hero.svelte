<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import PlaceSearch from './PlaceSearch.svelte';

  let { snapshotYear }: { snapshotYear: number } = $props();

  let yearStr = $state('');
  let yearErr = $state(false);
  let submitting = $state(false);

  async function submit() {
    const y = Number(yearStr);
    if (!Number.isInteger(y) || y < 1900 || y > snapshotYear) {
      yearErr = true;
      return;
    }
    yearErr = false;
    app.year = y;
    if (!app.place) return;
    submitting = true;
    await app.ensureMetrics();
    submitting = false;
    if (app.metrics) app.phase = 'result';
  }
</script>

<section class="hero">
  <p class="brand">{t('hero.title')} <span>· {t('hero.tagline')}</span></p>
  <h1>{t('hero.question')}</h1>
  <p class="intro">{t('hero.intro')}</p>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      submit();
    }}
  >
    <div class="field">
      <label for="year-input">{t('hero.label.year')}</label>
      <input
        id="year-input"
        bind:value={yearStr}
        inputmode="numeric"
        maxlength="4"
        placeholder={t('hero.placeholder.year')}
        aria-invalid={yearErr}
        aria-describedby={yearErr ? 'year-err' : undefined}
      />
      {#if yearErr}
        <p id="year-err" class="err" role="alert">
          {t('hero.year.invalid', { snapshot_year: snapshotYear })}
        </p>
      {/if}
    </div>
    <div class="field grow">
      <span class="lbl">{t('hero.label.place')}</span>
      <PlaceSearch />
      {#if app.place}<p class="sel" role="status">{t('search.selected', { municipality: app.place.name })}</p>{/if}
    </div>
    <button class="cta" type="submit" disabled={submitting || !app.place}>
      {t('hero.cta')}
    </button>
  </form>
  {#if app.metricsError}<p class="err" role="alert">{t('error.metrics')}</p>{/if}

  <p class="privacy">{t('hero.privacy')}</p>
  <p class="sources">{t('hero.sources')}</p>
</section>

<style>
  .hero {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: clamp(1.2rem, 6vw, 4rem);
    background:
      radial-gradient(1200px 500px at 80% -10%, rgba(198, 59, 79, 0.08), transparent),
      #f2f0ec;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.8rem;
    color: #8e2f4c;
    margin: 0 0 0.6rem;
  }
  .brand span {
    color: #605e56;
    font-weight: 500;
  }
  h1 {
    font-size: clamp(1.9rem, 4.6vw, 3.4rem);
    line-height: 1.08;
    max-width: 22ch;
    margin: 0 0 1rem;
    color: #1c1a17;
    text-wrap: balance;
  }
  .intro {
    max-width: 56ch;
    color: #44423c;
    font-size: 1.05rem;
    margin: 0 0 2rem;
  }
  form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    align-items: end;
    max-width: 720px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field.grow {
    flex: 1 1 220px;
  }
  label,
  .lbl {
    font-size: 0.8rem;
    font-weight: 600;
    color: #55534b;
  }
  input {
    width: 9rem;
    padding: 0.85rem 1rem;
    font-size: 1.05rem;
    border: 1.5px solid #b9b5aa;
    border-radius: 10px;
    background: #fff;
  }
  input:focus {
    outline: 2px solid #c63b4f;
  }
  .cta {
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.9rem 1.6rem;
    border-radius: 10px;
    border: 0;
    background: #c63b4f;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cta:hover {
    background: #a82f42;
  }
  .cta:disabled {
    background: #b9b5aa;
    cursor: not-allowed;
  }
  .cta:focus-visible {
    outline: 3px solid #18181b;
    outline-offset: 2px;
  }
  .err {
    color: #7a1f2e;
    font-size: 0.8rem;
    margin: 0.25rem 0 0;
  }
  .sel {
    font-size: 0.78rem;
    color: #2e6b34;
    margin: 0.25rem 0 0;
  }
  .privacy {
    margin: 2.5rem 0 0.3rem;
    font-size: 0.8rem;
    color: #6b6b63;
  }
  .sources {
    margin: 0;
    font-size: 0.75rem;
    color: #605e56;
  }
</style>
