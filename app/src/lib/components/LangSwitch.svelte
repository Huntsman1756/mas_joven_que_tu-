<script lang="ts">
  import { locale, AVAILABLE_LANGS } from '$lib/i18n/lang.svelte';
  import { t } from '$lib/i18n/t';

  /**
   * Selector ES/EU. Solo se renderiza cuando hay más de un idioma en
   * `AVAILABLE_LANGS`. EU es un borrador asistido verificado
   * estructuralmente (verify:eu), sin revisión lingüística humana.
   */
</script>

{#if AVAILABLE_LANGS.length > 1}
  <div class="langs" role="group" aria-label={t('nav.lang')}>
    {#each AVAILABLE_LANGS as l (l.id)}
      <button
        type="button"
        aria-pressed={locale.lang === l.id}
        aria-current={locale.lang === l.id ? 'true' : undefined}
        onclick={() => (locale.lang = l.id)}>{l.label}</button
      >
    {/each}
  </div>
{/if}

<style>
  /* G19-R4: mismo alto y peso que los otros controles de la topbar */
  .langs {
    display: inline-flex;
    gap: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }
  button {
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.6rem;
    min-height: 42px;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  button:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
