<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { searchPlace, type SearchOutcome } from '$lib/domain/nora';
  import { t } from '$lib/i18n/t';
  import type { Place } from '$lib/domain/types';

  let { compact = false }: { compact?: boolean } = $props();

  let query = $state('');
  let outcome = $state<SearchOutcome>({ state: 'IDLE', local: [], noraCount: 0, noraBizkaia: 0 });
  let open = $state(false);
  let active = $state(-1);
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inputEl = $state<HTMLInputElement | null>(null);
  let statusEl = $state<HTMLDivElement | null>(null);

  function onInput() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 180);
  }

  async function run() {
    abort?.abort();
    const q = query;
    if (q.trim().length < 3) {
      outcome = { state: q.trim().length === 0 ? 'IDLE' : 'TOO_SHORT', local: [], noraCount: 0, noraBizkaia: 0 };
      open = outcome.state !== 'IDLE';
      return;
    }
    outcome = { ...outcome, state: 'SEARCHING' };
    open = true;
    abort = new AbortController();
    try {
      outcome = await searchPlace(q, app.municipalityCatalog, abort.signal);
    } catch {
      return; // abortada
    }
  }

  function choose(p: Place) {
    query = p.name;
    open = false;
    active = -1;
    app.selectPlace(p);
  }

  function onKey(e: KeyboardEvent) {
    const n = outcome.local.length;
    if (e.key === 'ArrowDown') {
      active = Math.min(active + 1, n - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      active = Math.max(active - 1, 0);
      e.preventDefault();
    } else if (e.key === 'Enter' && active >= 0 && active < n) {
      choose(outcome.local[active]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      open = false;
      active = -1;
    }
  }

  function statusText(): string {
    switch (outcome.state) {
      case 'TOO_SHORT':
        return t('search.too_short');
      case 'SEARCHING':
        return t('search.searching');
      case 'RESULTS':
        return t('search.results', { n: outcome.local.length, m: outcome.local.length });
      case 'NO_RESULTS':
        return t('search.no_results', { query });
      case 'OUT_OF_SCOPE':
        return t('search.out_of_scope', { n: outcome.noraCount });
      case 'NETWORK_ERROR':
        return t('search.network_error');
      default:
        return '';
    }
  }
</script>

<div class="search" class:compact>
  <label class="sr-only" for="place-input">{t('hero.label.place')}</label>
  <input
    id="place-input"
    bind:this={inputEl}
    bind:value={query}
    oninput={onInput}
    onkeydown={onKey}
    onfocus={() => (open = outcome.state !== 'IDLE')}
    role="combobox"
    aria-expanded={open}
    aria-controls="place-listbox"
    aria-activedescendant={active >= 0 ? `place-opt-${active}` : undefined}
    autocomplete="off"
    placeholder={compact ? (app.place?.name ?? t('hero.placeholder.place')) : t('hero.placeholder.place')}
  />
  {#if open}
    <div class="status" bind:this={statusEl} role="status">{statusText()}</div>
    {#if outcome.local.length > 0}
      <ul id="place-listbox" role="listbox" aria-label={t('search.listbox')}>
        {#each outcome.local as p, i (p.slug)}
          <li
            id="place-opt-{i}"
            role="option"
            aria-selected={i === active}
            class:active={i === active}
          >
            <button type="button" onclick={() => choose(p)} onmouseenter={() => (active = i)}>
              {p.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .search {
    position: relative;
    width: 100%;
  }
  input {
    width: 100%;
    padding: 0.85rem 1rem;
    font-size: 1.05rem;
    border: 1.5px solid #b9b5aa;
    border-radius: 10px;
    background: #fff;
    color: #1c1a17;
  }
  .compact input {
    padding: 0.4rem 0.7rem;
    font-size: 0.9rem;
  }
  input:focus {
    outline: 2px solid #c63b4f;
    outline-offset: 1px;
  }
  .status {
    font-size: 0.8rem;
    color: #55534b;
    padding: 0.3rem 0.2rem;
  }
  ul {
    position: absolute;
    z-index: 30;
    top: 100%;
    left: 0;
    right: 0;
    margin: 0.15rem 0 0;
    padding: 0.25rem;
    list-style: none;
    background: #fff;
    border: 1px solid #d6d3cb;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    max-height: 260px;
    overflow: auto;
  }
  li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.7rem;
    border: 0;
    background: none;
    font-size: 0.95rem;
    cursor: pointer;
    border-radius: 6px;
    color: #1c1a17;
  }
  li.active button {
    background: #f3ecec;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
