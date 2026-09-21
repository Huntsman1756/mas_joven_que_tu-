<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { resolve } from '$app/paths';
  import PlaceSearch from './PlaceSearch.svelte';
  import HeroVisual from './HeroVisual.svelte';
  import { parseYearInput } from '$lib/domain/url';
  import { ArrowRight } from '@lucide/svelte';

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
  <!-- G11 — chrome superior: identidad a la izquierda, método a la derecha -->
  <div class="topline">
    <p class="brand">{t('hero.title')} <span>· {t('hero.tagline')}</span></p>
    <a class="how" href={resolve('/como-lo-sabemos')}>{t('footer.how')}</a>
  </div>

  <div class="copy">
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
        <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </form>

    <div class="meta" id="fuentes">
      {#if app.metricsError}<p class="err" role="alert">{t('error.metrics')}</p>{/if}
      <p class="privacy">{t('hero.privacy')}</p>
      <p class="sources">{t('hero.sources')}</p>
      <p class="contest">{t('hero.contest')}</p>
    </div>
  </div>

  <!-- G11: recorte real de un lugar concreto (Abandoibarra, Bilbao).
       En móvil va DESPUÉS del formulario: titular → explicación →
       formulario → imagen. -->
  <HeroVisual />
</section>

<style>
  /* Portada G11: 40 % texto / 60 % evidencia dentro de ~1320 px */
  .hero {
    min-height: 100svh;
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    grid-template-rows: auto 1fr;
    column-gap: clamp(1.5rem, 4vw, 3.5rem);
    row-gap: 1rem;
    align-items: center;
    max-width: var(--w-page);
    margin: 0 auto;
    padding: clamp(1rem, 3vh, 2rem) clamp(1.2rem, 4vw, 3rem) clamp(1.5rem, 5vh, 3rem);
    background: var(--paper);
  }
  .topline {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    align-self: start;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.8rem;
  }
  .copy {
    min-width: 0;
    align-self: center;
  }
  .hero > :global(.visual) {
    justify-self: end;
    align-self: center;
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.78rem;
    color: var(--ink);
    margin: 0;
  }
  .brand span {
    color: var(--ink-3);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0.02em;
  }
  .how {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--accent-deep);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    white-space: nowrap;
  }
  .how:hover {
    border-bottom-color: var(--accent-deep);
  }
  .how:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }
  h1 {
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--fs-display);
    line-height: 1.04;
    letter-spacing: -0.01em;
    max-width: 15ch;
    margin: 0 0 1.2rem;
    color: var(--ink);
    text-wrap: balance;
  }
  .intro {
    max-width: 44ch;
    color: var(--ink-2);
    font-size: var(--fs-body);
    line-height: 1.5;
    margin: 0 0 1.8rem;
  }

  /* Formulario: año (fijo ~112 px) | municipio (resto); CTA a fila
     completa debajo — G11.2 */
  form {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 0 0.75rem;
    align-items: end;
    max-width: 42rem;
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
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    height: var(--ctl-h);
    padding: 0 1.4rem;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
    grid-column: 1 / -1;
    justify-content: center;
    margin-top: 0.75rem;
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
    max-width: 42rem;
  }
  .privacy {
    margin: 1.8rem 0 0.3rem;
    font-size: var(--fs-meta);
    color: var(--ink-3);
    max-width: 60ch;
  }
  .sources {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-3);
  }
  .contest {
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-3);
    border-top: 1px solid var(--line);
    padding-top: 0.5rem;
  }

  @media (max-width: 1023px) {
    .hero {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding-top: clamp(1rem, 4vh, 2rem);
    }
    .topline {
      width: 100%;
      margin-bottom: clamp(1.4rem, 5vh, 2.6rem);
    }
    /* móvil/tablet: titular → explicación → formulario → imagen → meta */
    .copy {
      display: contents;
    }
    .hero > :global(.visual) {
      order: 6;
      margin: 1.4rem 0 0;
    }
    form {
      order: 5;
    }
    .meta {
      order: 7;
    }
  }
  @media (max-width: 700px) {
    form {
      grid-template-columns: 6.5rem minmax(0, 1fr);
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .cta {
      transition: background 0.15s;
    }
  }
</style>
