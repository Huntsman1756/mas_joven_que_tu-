<script lang="ts">
  import { t } from '$lib/i18n/t';
  import type { Component } from 'svelte';
  import { onMount } from 'svelte';

  /**
   * Carga perezosa por proximidad al viewport (PERF4-R3). A diferencia de
   * `Lazy` — que invoca el import() al montar — aquí el import() solo se
   * dispara cuando el sentinel entra en el viewport (IntersectionObserver
   * con rootMargin 0: nunca durante la carga inicial) o cuando el usuario
   * interactúa por primera vez (focusin: cubre teclado y primer clic).
   * `force` monta de inmediato para deep links (p.ej. ?story=/?building=).
   *
   * El código cargado queda fuera del grafo JS inicial: code splitting
   * real, no solo montaje diferido.
   */
  let {
    loader,
    force = false
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader: () => Promise<{ default: Component<any> }>;
    force?: boolean;
  } = $props();

  let host = $state<HTMLElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let C = $state<Component<any> | null>(null);
  let started = $state(false);

  function load() {
    if (started) return;
    started = true;
    void loader().then((m) => (C = m.default));
  }

  $effect(() => {
    if (force) load();
  });

  onMount(() => {
    const el = host;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: '0px' }
    );
    io.observe(el);
    const onFocus = () => load();
    document.addEventListener('focusin', onFocus, true);
    return () => {
      io.disconnect();
      document.removeEventListener('focusin', onFocus, true);
    };
  });
</script>

<div bind:this={host} class="lazyview">
  {#if C}
    <C />
  {:else if started}
    <p class="lazy-load" role="status">{t('ui.loading')}</p>
  {/if}
</div>

<style>
  .lazyview {
    /* 1px: un sentinel de área cero puede no disparar isIntersecting
       justo en el borde del viewport */
    min-height: 1px;
  }
  .lazy-load {
    margin: 0.4rem 0;
    font-size: 0.8rem;
    color: var(--ink-3, #655f54);
  }
</style>
