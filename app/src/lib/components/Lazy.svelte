<script lang="ts">
  import { t } from '$lib/i18n/t';
  import type { Component } from 'svelte';

  /**
   * Carga perezosa explícita (PERF4-R): el import dinámico solo se invoca
   * cuando el padre monta este componente — nunca en idle ni por viewport.
   * `props` se reparte al componente cargado tal cual.
   */
  let {
    loader,
    props = {}
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader: () => Promise<{ default: Component<any> }>;
    props?: Record<string, unknown>;
  } = $props();

  const promise = $derived(loader());
</script>

{#await promise}
  <p class="lazy-load" role="status">{t('ui.loading')}</p>
{:then mod}
  {@const C = mod.default}
  <C {...props} />
{/await}

<style>
  .lazy-load {
    margin: 0.4rem 0;
    font-size: 0.8rem;
    color: #55534b;
  }
</style>
