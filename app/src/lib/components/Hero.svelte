<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import PlaceSearch from './PlaceSearch.svelte';
  import HeroVisual from './HeroVisual.svelte';
  import { parseYearInput } from '$lib/domain/url';

  let { snapshotYear }: { snapshotYear: number } = $props();

  let yearStr = $state('');
  let yearErr = $state(false);
  let submitting = $state(false);

  async function submit() {
    // G10-01: dominio compartido con URL/ResultView (entero 1900..snapshot)
    const y = parseYearInput(yearStr, snapshotYear);
    if (y === null) {
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
  <div class="copy">
    <p class="brand">{t('hero.title')} <span>· {t('hero.tagline')}</span></p>
    <h1>{t('hero.question')}</h1>
    <p class="intro">{t('hero.intro')}</p>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div class="field year">
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
      <div class="field place">
        <span class="lbl" id="place-lbl">{t('hero.label.place')}</span>
        <PlaceSearch />
        {#if app.place}<p class="sel" role="status">
            {t('search.selected', { municipality: app.place.name })}
          </p>{/if}
      </div>
      <button class="cta" type="submit" disabled={submitting || !app.place}>
        {t('hero.cta')}
      </button>
    </form>

    <div class="meta">
      {#if app.metricsError}<p class="err" role="alert">{t('error.metrics')}</p>{/if}
      <p class="privacy">{t('hero.privacy')}</p>
      <p class="sources">{t('hero.sources')}</p>
      <p class="contest">{t('hero.contest')}</p>
    </div>
  </div>

  <!-- G7: el díptico real ocupa la columna derecha en desktop; en flujo
       móvil va tras la intro y antes del formulario. -->
  <HeroVisual />
</section>

<style>
  /* Portada G7: composición 55/45 — texto+formulario | evidencia real */
  .hero {
    min-height: 100svh;
    display: grid;
    grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);
    column-gap: clamp(1.5rem, 5vw, 4rem);
    align-items: center;
    padding: clamp(1.2rem, 5vh, 3.5rem) clamp(1.2rem, 5vw, 4rem);
    background: linear-gradient(180deg, rgba(201, 64, 59, 0.05) 0%, transparent 30%), var(--paper);
  }
  .copy {
    min-width: 0;
  }
  .hero > :global(.visual) {
    justify-self: end;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--accent-deep);
    margin: 0 0 1.1rem;
    border-top: 3px solid var(--accent);
    padding-top: 0.7rem;
    max-width: fit-content;
  }
  .brand span {
    color: var(--ink-3);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0.02em;
  }
  h1 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--fs-display);
    line-height: 1.05;
    max-width: 17ch;
    margin: 0 0 1.1rem;
    color: var(--ink);
    text-wrap: balance;
  }
  .intro {
    max-width: 50ch;
    color: var(--ink-2);
    font-size: var(--fs-body);
    margin: 0 0 1.6rem;
  }

  /* Formulario: año | lugar | CTA — misma altura, baseline común */
  form {
    display: grid;
    grid-template-columns: 9.5rem minmax(0, 1fr) auto;
    gap: 0 0.75rem;
    align-items: end;
    max-width: 44rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }
  label,
  .lbl {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
    min-height: 1em;
  }
  input {
    width: 100%;
    height: var(--ctl-h);
    padding: 0 0.9rem;
    font-size: 1.05rem;
    font-family: inherit;
    border: 1.5px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
  }
  input:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .cta {
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    height: var(--ctl-h);
    padding: 0 1.5rem;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .cta:hover {
    background: var(--accent-deep);
  }
  .cta:disabled {
    background: var(--ink-3);
    cursor: not-allowed;
  }
  .cta:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
  }
  .err {
    color: var(--accent-deep);
    font-size: 0.8rem;
    margin: 0.25rem 0 0;
  }
  .sel {
    font-size: 0.78rem;
    color: var(--topo);
    margin: 0.25rem 0 0;
  }
  .meta {
    max-width: 44rem;
  }
  .privacy {
    margin: 1.8rem 0 0.3rem;
    font-size: var(--fs-meta);
    color: var(--ink-3);
    max-width: 60ch;
  }
  .sources {
    margin: 0;
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  .contest {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
    max-width: 44rem;
  }

  @media (max-width: 1023px) {
    .hero {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding-top: clamp(1.5rem, 6vh, 3rem);
    }
    /* el visual se inserta entre intro y formulario */
    .copy {
      display: contents;
    }
    .hero > :global(.visual) {
      order: 5;
      margin: 0.4rem 0 1.4rem;
    }
    form {
      order: 6;
    }
    .meta {
      order: 7;
    }
  }
  @media (max-width: 700px) {
    form {
      grid-template-columns: 7.5rem minmax(0, 1fr);
    }
    .cta {
      grid-column: 1 / -1;
      margin-top: 0.75rem;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .cta {
      transition: background 0.15s;
    }
  }
</style>
