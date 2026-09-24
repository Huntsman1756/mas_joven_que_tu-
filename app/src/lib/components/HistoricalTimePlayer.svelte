<script lang="ts">
  import { Play, Pause, Info, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  /**
   * G19-R3 — HistoricalTimePlayer: UN solo reproductor temporal del
   * visor. Evolución lo usa en modo «continuous» (años del eje
   * catastral) y Fotos aéreas en «discrete» (campañas reales). El
   * chrome es idéntico — Play · ‹ · año · › · rail · ⓘ —; lo único que
   * cambia es qué valores son válidos, dónde caen los ticks (snippet
   * `marks`), cómo avanzan prev/next/play y el cuerpo del popover ⓘ.
   * El thumb lo dibuja el propio player sobre `value`: es literalmente
   * el mismo elemento en ambos modos.
   *
   * Bajo prefers-reduced-motion el caller pasa canPlay=false: el Play
   * no se monta y ‹ › quedan como paso manual — la anatomía no cambia.
   */

  interface Props {
    /** 'continuous' = eje de años (Evolución); 'discrete' = campañas
     *  reales (Fotos aéreas). Solo documenta la semántica del rail —
     *  el chrome exterior es el mismo. */
    mode: 'continuous' | 'discrete';
    playing?: boolean;
    /** false (movimiento reducido): sin Play — quedan el rail y ‹ › */
    canPlay?: boolean;
    playLabel: string;
    pauseLabel: string;
    /** año/campaña mostrada — la fuente de verdad visual del visor */
    year: number | string;
    /** aria-live en el año (discreto: la campaña es el estado principal) */
    liveYear?: boolean;
    min: number;
    max: number;
    value: number;
    scrubAria: string;
    scrubValueText: string;
    onscrubinput: (e: Event) => void;
    onscrubcommit: (e: Event) => void;
    onscrubclick?: (e: MouseEvent) => void;
    onscrubkey?: (e: KeyboardEvent) => void;
    ontoggle?: () => void;
    /** pasos prev/next — siempre montados (null = deshabilitado en el
     *  extremo); en continuo ±1 año, en discreto campaña anterior/
     *  siguiente. También son el paso manual bajo reduced-motion. */
    prev: { year?: number; label: string } | null;
    next: { year?: number; label: string } | null;
    onprev: () => void;
    onnext: () => void;
    prevNoneLabel: string;
    nextNoneLabel: string;
    infoLabel?: string;
    status?: string;
    /** el rail queda disponible para medir su ancho (etiquetas
     *  densidad-adaptativas del modo discreto) */
    railEl?: HTMLElement | null;
    marks?: Snippet;
    info?: Snippet;
  }
  let {
    mode,
    playing = false,
    canPlay = true,
    playLabel,
    pauseLabel,
    year,
    liveYear = false,
    min,
    max,
    value,
    scrubAria,
    scrubValueText,
    onscrubinput,
    onscrubcommit,
    onscrubclick,
    onscrubkey,
    ontoggle,
    prev,
    next,
    onprev,
    onnext,
    prevNoneLabel = '',
    nextNoneLabel = '',
    infoLabel = '',
    status = '',
    railEl = $bindable(null),
    marks,
    info
  }: Props = $props();

  // El thumb lo dibuja el player sobre `value` — mismo elemento y misma
  // posición en continuo y discreto (en discreto `value` ya es la
  // campaña más cercana al vuelo, así que el thumb hace snap solo).
  let thumbPct = $derived(min < max ? ((value - min) / (max - min)) * 100 : 0);
</script>

<div class="tc-bar" data-player-mode={mode}>
  {#if canPlay && ontoggle}
    <button
      class="tc-play"
      data-action="play"
      aria-label={playing ? pauseLabel : playLabel}
      onclick={ontoggle}
    >
      {#if playing}
        <Pause size={17} strokeWidth={2.2} aria-hidden="true" />
      {:else}
        <Play size={17} strokeWidth={2.2} aria-hidden="true" />
      {/if}
    </button>
  {/if}

  <button
    class="tc-nav"
    data-action="prev"
    data-year={prev?.year}
    disabled={!prev}
    onclick={onprev}
    aria-label={prev ? prev.label : prevNoneLabel}
  >
    <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
  </button>

  <strong class="tc-year" aria-live={liveYear ? 'polite' : undefined}>{year}</strong>

  <button
    class="tc-nav"
    data-action="next"
    data-year={next?.year}
    disabled={!next}
    onclick={onnext}
    aria-label={next ? next.label : nextNoneLabel}
  >
    <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
  </button>

  <div class="tc-rail" bind:this={railEl}>
    <input
      class="tc-scrub"
      data-action="scrub"
      type="range"
      {min}
      {max}
      step="1"
      {value}
      oninput={onscrubinput}
      onchange={onscrubcommit}
      onclick={onscrubclick}
      onkeydown={onscrubkey}
      aria-label={scrubAria}
      aria-valuetext={scrubValueText}
    />
    {@render marks?.()}
    <i class="tc-thumb" class:playing style="left:{thumbPct}%"></i>
  </div>

  {#if info}
    <details class="tc-info">
      <summary data-action="info" title={infoLabel} aria-label={infoLabel}>
        <Info size={15} strokeWidth={2} aria-hidden="true" /><span class="sr-only">{infoLabel}</span
        >
      </summary>
      <div class="tc-info-body">{@render info()}</div>
    </details>
  {/if}
</div>
{#if status}
  <p class="sr-only" role="status">{status}</p>
{/if}

<style>
  /* ── barra temporal integrada en el lienzo (global: la usan los
     dos envoltorios, .timeband y .photo) — desktop: pegada al borde superior;
     móvil/apilado: strip inferior borde a borde ────────────────────── */
  :global(.tcpanel) {
    position: absolute;
    z-index: 12;
    background: rgba(24, 38, 49, 0.92);
    color: var(--paper);
    box-shadow: 0 2px 10px rgba(24, 38, 49, 0.28);
    pointer-events: auto;
  }
  :global(.tcp-tl) {
    top: 0;
    left: 0;
    right: 3.4rem;
  }
  @media (max-width: 1023px) {
    :global(.tcp-tl) {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  /* ── la barra como instrumento del mapa: superficie oscura compacta ── */
  .tc-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.15rem 0.6rem;
    min-width: 0;
  }

  .tc-play,
  .tc-nav {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    cursor: pointer;
  }
  /* hitbox 44px con círculo visual de 32px: instrumento, no banner */
  .tc-play {
    position: relative;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink);
  }
  .tc-play::before {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background: var(--paper);
  }
  .tc-play :global(svg) {
    position: relative;
    z-index: 1;
  }
  .tc-play:hover::before {
    background: #fff;
  }
  .tc-play:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }

  .tc-nav {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(247, 248, 250, 0.75);
  }
  .tc-nav:hover:not(:disabled) {
    color: var(--paper);
    background: rgba(247, 248, 250, 0.14);
  }
  .tc-nav:disabled {
    color: rgba(247, 248, 250, 0.28);
    cursor: default;
  }
  .tc-nav:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }

  /* año activo: la fuente de verdad visual — estado del control, no
     titular de la página (no se repite en el rail). Ancho reservado
     para 4 dígitos: el rail nunca se mueve al cambiar el valor */
  .tc-year {
    flex: 0 0 auto;
    min-width: 4.4ch;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: var(--paper);
  }

  /* ── rail: línea base compartida (top:10px); las marcas llegan por
     snippet (TrackContinuous / TrackDiscrete — solo cambian los datos).
     El input invisible sobresale del rail para conservar un hitbox
     ≥44px aunque la línea sea fina ── */
  .tc-rail {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    height: 32px;
  }
  .tc-rail::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 10px;
    height: 2px;
    border-radius: 1px;
    background: rgba(247, 248, 250, 0.32);
  }
  .tc-scrub {
    position: absolute;
    inset: -7px 0;
    width: 100%;
    height: auto;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
  }
  .tc-rail:has(.tc-scrub:focus-visible) {
    outline: 2px solid var(--paper);
    outline-offset: 4px;
    border-radius: 3px;
  }

  /* ── thumb compartido: el mismo elemento en continuo y discreto ── */
  .tc-thumb {
    position: absolute;
    top: 4.5px;
    width: 13px;
    height: 13px;
    margin-left: -6.5px;
    border-radius: 50%;
    background: var(--paper);
    border: 2.5px solid var(--accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 2;
    transition: transform 0.12s ease;
  }
  .tc-thumb.playing {
    border-color: var(--paper);
  }
  :global(.tcpanel):hover .tc-thumb {
    transform: scale(1.25);
  }
  @media (prefers-reduced-motion: reduce) {
    .tc-thumb {
      transition: none;
    }
  }

  /* ── ⓘ: la explicación existe pero no ocupa — icono + popover ── */
  .tc-info {
    position: relative;
    flex: 0 0 auto;
  }
  .tc-info summary {
    list-style: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    color: rgba(247, 248, 250, 0.75);
    cursor: pointer;
  }
  .tc-info summary::-webkit-details-marker {
    display: none;
  }
  .tc-info summary:hover {
    color: var(--paper);
  }
  .tc-info summary:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .tc-info-body {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 8;
    width: min(52ch, 78vw);
    padding: 0.6rem 0.8rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(24, 38, 49, 0.24);
    font-size: 0.74rem;
    line-height: 1.45;
    color: var(--ink-2);
  }
  .tc-info-body :global(p) {
    margin: 0 0 0.35rem;
  }
  .tc-info-body :global(p:last-child) {
    margin-bottom: 0;
  }

  @media (max-width: 1023px) {
    /* la barra anclada abajo → el popover se abre hacia arriba */
    .tc-info-body {
      top: auto;
      bottom: calc(100% + 8px);
    }
  }
  @media (max-width: 700px) {
    .tc-bar {
      gap: 0.4rem;
      padding: 0.25rem 0.55rem;
    }
    .tc-year {
      font-size: 1.1rem;
    }
    .tc-rail {
      height: 36px;
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
