<script lang="ts">
  import { t } from '$lib/i18n/t';
  import type { Component } from 'svelte';

  /**
   * Carga perezosa explícita (PERF4-R): el import dinámico solo se invoca
   * cuando el padre monta este componente — nunca en idle ni por viewport.
   * `props` se reparte al componente cargado tal cual.
   *
   * G11.3: el rechazo del import (chunk no descargado, red cortada) deja
   * un estado de error accesible con reintento — antes el panel
   * desaparecía sin aviso y el rechazo quedaba sin capturar.
   * El reintento es `location.reload()`: el module map del navegador
   * cachea el fallo del import() para toda la sesión (re-llamar al mismo
   * especificador no emite ni una petición — verificado), así que la única
   * recuperación real es recargar; el estado vive en la URL y se restaura.
   */
  let {
    loader,
    props = {}
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader: () => Promise<{ default: Component<any> }>;
    props?: Record<string, unknown>;
  } = $props();

  const promise = $derived.by(() => loader());
</script>

{#await promise}
  <p class="lazy-load" role="status">{t('ui.loading')}</p>
{:then mod}
  {@const C = mod.default}
  <C {...props} />
{:catch}
  <p class="lazy-err" role="alert">
    {t('ui.load_error')}
    <button type="button" onclick={() => location.reload()}>{t('ui.retry')}</button>
  </p>
{/await}

<style>
  .lazy-load {
    margin: 0.4rem 0;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .lazy-err {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: var(--warn-text);
    background: var(--warn-bg);
    border: 1px solid var(--warn-line);
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .lazy-err button {
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    margin-left: auto;
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--warn-line);
    border-radius: 6px;
    background: transparent;
    color: var(--warn-text);
    cursor: pointer;
    white-space: nowrap;
  }
  .lazy-err button:hover {
    background: rgba(168, 110, 20, 0.12);
  }
</style>
