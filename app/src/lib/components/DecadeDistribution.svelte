<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { bucketsForYear, bucketRenderState, markerPosition } from '$lib/domain/metrics';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct, decadeName } from '$lib/domain/format';

  let { height = 150 }: { height?: number } = $props();

  const W = 720;
  let H = $derived(height);
  const PAD = { l: 34, r: 10, t: 26, b: 26 };
  // G10-06: «sin año» no es una fecha — ocupa una zona propia a la
  // derecha del eje temporal, separada por una línea discontinua. El
  // eje temporal se reserva ese ancho para que nunca solape con 2020.
  const NOY_W = 66;
  const AXW = W - PAD.l - PAD.r - NOY_W; // ancho del eje temporal
  const noyX = W - PAD.r - NOY_W + 8; // bloque «sin año» dentro de su zona

  let buckets = $derived(
    app.metrics && app.year !== null ? bucketsForYear(app.metrics, app.year) : []
  );
  let temporal = $derived(buckets.filter((b) => b.inTemporalAxis));
  let noYear = $derived(buckets.find((b) => !b.inTemporalAxis));
  let maxN = $derived(Math.max(1, ...temporal.map((b) => b.n)));
  let markerX = $derived(app.year !== null ? markerXFor(markerPosition(app.year)) : 0);
  let compareX = $derived(
    app.compareYear !== null ? markerXFor(markerPosition(app.compareYear)) : 0
  );

  function markerXFor(pos: number): number {
    const bw = AXW / temporal.length;
    return PAD.l + pos * bw;
  }

  function bucketX(i: number): number {
    const bw = AXW / temporal.length;
    return PAD.l + i * bw;
  }

  function h(n: number): number {
    return (n / maxN) * (H - PAD.t - PAD.b);
  }

  let tip = $state<{ x: number; text: string } | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);
  // G10-07: roving tabindex — un solo stop de Tab para todo el gráfico;
  // flechas/Home/End recorren las barras, Escape cierra el tooltip.
  let focusIdx = $state(0);

  /** barras navegables: temporales + «sin año» al final (fuera del eje) */
  let navBars = $derived(noYear ? [...temporal, noYear] : temporal);

  function focusBar(i: number) {
    const r = svgEl?.querySelector<SVGRectElement>(`rect.hit[data-i="${i}"]`);
    r?.focus();
  }

  function onBarKey(e: KeyboardEvent, i: number, b: (typeof buckets)[number], x: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enter(b, x);
      return;
    }
    if (!navBars.length) return;
    let j = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j++;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j--;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = navBars.length - 1;
    else if (e.key === 'Escape') {
      leave();
      return;
    } else return;
    e.preventDefault();
    focusIdx = Math.max(0, Math.min(navBars.length - 1, j));
    focusBar(focusIdx); // el foco dispara onfocus → tooltip
  }

  function tipText(b: (typeof buckets)[number]): string {
    return b.id === 'pre1900'
      ? t('dist.bucket.pre1900.tooltip', { n: fmt(b.n), share: fmtPct(b.sharePct) })
      : b.id === 'none'
        ? t('dist.noyear_band', { no_year: fmt(b.n), no_year_pct: fmtPct(b.sharePct) })
        : t('dist.tooltip.decade', { decade: b.id, n: fmt(b.n), share: fmtPct(b.sharePct) });
  }

  function enter(b: (typeof buckets)[number], x: number) {
    app.hoveredDecade = b.id;
    tip = { x, text: tipText(b) };
  }
  function leave() {
    app.hoveredDecade = null;
    tip = null;
  }

  let heaping = $derived(app.metrics?.constants.heaping_05_pct ?? 0);

  // G11: frase interpretativa encima del gráfico (el periodo dominante ya
  // es un derivado directo del metrics JSON — sin petición nueva).
  let topDecade = $derived.by(() => {
    const ds = app.metrics?.decades;
    if (!ds?.length) return null;
    const top = ds.reduce((a, b) => (b.n > a.n ? b : a));
    if (!top.n) return null;
    return {
      name: top.bucket === 'pre1900' ? t('dist.bucket.pre1900') : decadeName(top.bucket),
      n: top.n
    };
  });
  let coveragePct = $derived(
    app.metrics?.constants.c02 && app.metrics.constants.c01
      ? (app.metrics.constants.c02 / app.metrics.constants.c01) * 100
      : 0
  );

  // G11: en pantalla estrecha la distribución se lee como barras
  // horizontales con valores — el SVG denso queda para escritorio.
  let narrow = $state(false);
  $effect(() => {
    const mq = matchMedia('(max-width: 700px)');
    const apply = () => (narrow = mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });
  let maxAll = $derived(Math.max(1, ...navBars.map((b) => b.n)));
  function youBucket(b: (typeof buckets)[number]): boolean {
    if (app.year === null || !b.inTemporalAxis) return false;
    if (app.year < 1900) return b.id === 'pre1900';
    return b.id === String(Math.floor(app.year / 10) * 10);
  }
</script>

{#if app.metrics && app.year !== null}
  <figure class="dist" aria-label={t('dist.title', { municipality: app.place?.name ?? '' })}>
    {#if topDecade}
      <p class="read">
        {t('dist.summary', {
          decade: topDecade.name,
          n: fmt(topDecade.n),
          coverage_pct: fmtPct(coveragePct)
        })}
      </p>
    {/if}
    {#if narrow}
      <!-- G11: barras horizontales por periodo; cada fila es un botón
           con su etiqueta de datos completa. «Tu año» marca el periodo
           que contiene el año del usuario. -->
      <ul class="hbars">
        {#each navBars as b (b.id)}
          {@const st = bucketRenderState(b.n, b.nAfter)}
          <li>
            <button
              class="hbar"
              class:you={youBucket(b)}
              aria-label={tipText(b)}
              onclick={() => enter(b, 0)}
              onfocus={() => enter(b, 0)}
              onblur={leave}
            >
              <span class="hl"
                >{b.id === 'pre1900'
                  ? t('dist.bucket.pre1900')
                  : b.id === 'none'
                    ? t('dist.bucket.none')
                    : b.label}{#if youBucket(b)}
                  <em class="you-chip">{t('dist.marker', { selected_year: app.year })}</em
                  >{/if}</span
              >
              <span class="htrack" aria-hidden="true">
                {#if st === 'all-after'}
                  <i class="seg after" style:width="{(b.n / maxAll) * 100}%"></i>
                {:else if b.id === 'none'}
                  <i class="seg none" style:width="{(b.n / maxAll) * 100}%"></i>
                {:else}
                  <i class="seg before" style:width="{(b.n / maxAll) * 100}%"></i>
                  {#if b.nAfter > 0}
                    <i class="seg after" style:width="{(b.nAfter / maxAll) * 100}%"></i>
                  {/if}
                {/if}
              </span>
              <span class="hv">{fmt(b.n)}</span>
            </button>
          </li>
        {/each}
      </ul>
      {#if tip}
        <p class="h-tip" role="status">{tip.text}</p>
      {/if}
    {:else}
      <svg bind:this={svgEl} viewBox="0 0 {W} {H}" preserveAspectRatio="none" width="100%" {height}>
        <defs>
          <!-- G10-13: «después» = bermellón + trama — la categoría no depende
             solo del tono (rojo/azul ≈ 1,1:1 de luminancia). -->
          <pattern
            id="dAfter"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="5" height="5" fill="#c94f38" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#8c2d21" stroke-width="1.6" />
          </pattern>
        </defs>
        <!-- barras temporales -->
        {#each temporal as b, i (b.id)}
          {@const x = bucketX(i)}
          {@const bw = AXW / temporal.length - 2}
          {@const hh = h(b.n)}
          {@const hhAfter = h(b.nAfter)}
          <!-- G10-05: cuatro estados explícitos — nunca una condición que
             omita los extremos (clasificador en domain/metrics, testeado). -->
          {#if bucketRenderState(b.n, b.nAfter) === 'all-after'}
            <rect
              x={x + 1}
              y={H - PAD.b - hh}
              width={bw}
              height={hh}
              class="bar after"
              class:dim={app.hoveredDecade !== null && app.hoveredDecade !== b.id}
            />
          {:else}
            <rect
              x={x + 1}
              y={H - PAD.b - hh}
              width={bw}
              height={hh}
              class="bar before"
              class:dim={app.hoveredDecade !== null && app.hoveredDecade !== b.id}
            />
            {#if b.nAfter > 0}
              <rect
                x={x + 1}
                y={H - PAD.b - hhAfter}
                width={bw}
                height={hhAfter}
                class="bar after"
                class:dim={app.hoveredDecade !== null && app.hoveredDecade !== b.id}
              />
            {/if}
          {/if}
          <rect
            x={x + 1}
            y={H - PAD.b - Math.max(hh, 10)}
            width={bw}
            height={Math.max(hh, 10)}
            class="hit"
            data-i={i}
            data-state={bucketRenderState(b.n, b.nAfter)}
            role="button"
            tabindex={i === focusIdx ? 0 : -1}
            aria-label={tipText(b)}
            onmouseenter={() => enter(b, x + bw / 2)}
            onmouseleave={leave}
            onfocus={() => {
              focusIdx = i;
              enter(b, x + bw / 2);
            }}
            onblur={leave}
            onclick={() => enter(b, x + bw / 2)}
            onkeydown={(e) => onBarKey(e, i, b, x + bw / 2)}
          />
          <text x={x + bw / 2 + 1} y={H - 10} text-anchor="middle" class="tick">
            {i % 2 === 0 || W > 600 ? b.label : ''}
          </text>
        {/each}

        <!-- «sin año»: zona propia, fuera del eje temporal -->
        {#if noYear}
          {@const nx = noyX}
          <line
            x1={W - PAD.r - NOY_W}
            y1={PAD.t}
            x2={W - PAD.r - NOY_W}
            y2={H - PAD.b}
            class="sep"
          />
          <rect
            x={nx}
            y={H - PAD.b - h(noYear.n)}
            width={44}
            height={Math.max(h(noYear.n), 2)}
            class="bar none"
            class:dim={app.hoveredDecade !== null && app.hoveredDecade !== 'none'}
          />
          <text x={nx + 22} y={H - 10} text-anchor="middle" class="tick">{noYear.label}</text>
          <rect
            x={nx - 4}
            y={PAD.t}
            width={52}
            height={H - PAD.t - PAD.b}
            class="hit"
            data-i={temporal.length}
            role="button"
            tabindex={focusIdx === temporal.length ? 0 : -1}
            aria-label={tipText(noYear)}
            onmouseenter={() => enter(noYear, nx + 22)}
            onmouseleave={leave}
            onfocus={() => {
              focusIdx = temporal.length;
              enter(noYear, nx + 22);
            }}
            onblur={leave}
            onclick={() => enter(noYear, nx + 22)}
            onkeydown={(e) => onBarKey(e, temporal.length, noYear, nx + 22)}
          />
        {/if}

        <!-- marcador de año -->
        <line x1={markerX} y1={PAD.t - 4} x2={markerX} y2={H - PAD.b} class="marker" />
        <text x={markerX} y={PAD.t - 10} text-anchor="middle" class="marker-label">
          {t('dist.marker', { selected_year: app.year })}
        </text>

        <!-- segundo marcador: OTRO AÑO (DOS AÑOS, G3-A) -->
        {#if app.compareYear !== null}
          <line x1={compareX} y1={PAD.t - 4} x2={compareX} y2={H - PAD.b} class="marker compare" />
          <text x={compareX} y={PAD.t - 10} text-anchor="middle" class="marker-label compare">
            {t('compare.marker', { compare_year: app.compareYear })}
          </text>
        {/if}

        <!-- eje: solo bajo el área temporal; «sin año» queda fuera -->
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r - NOY_W - 4} y2={H - PAD.b} class="axis" />
      </svg>
    {/if}
    {#if tip && !narrow}
      <div class="d-tip" style="left:{(tip.x / W) * 100}%">{tip.text}</div>
    {/if}
    <div class="sr-only">
      <table>
        <caption>{t('dist.title', { municipality: app.place?.name ?? '' })}</caption>
        <thead>
          <tr><th>{t('dist.axis.x')}</th><th>{t('dist.axis.y')}</th></tr>
        </thead>
        <tbody>
          {#each buckets as b (b.id)}
            <tr
              ><td>{b.id === 'pre1900' ? t('dist.bucket.pre1900') : b.label}</td><td>{fmt(b.n)}</td
              ></tr
            >
          {/each}
        </tbody>
      </table>
    </div>
    <figcaption>
      <p class="den">{t('dist.denominator', { known: fmt(app.metrics.constants.c02) })}</p>
      <p class="heap">
        {t('dist.heaping', { municipality: app.place?.name ?? '', heaping_pct: fmtPct(heaping) })}
      </p>
    </figcaption>
  </figure>
{/if}

<style>
  .dist {
    margin: 0;
    position: relative;
  }
  svg {
    display: block;
    overflow: visible;
  }
  /* paleta G11: antes = azul cartográfico, después = terracota+trama,
     sin año = hatch gris (codificación redundante G10-13, conservada) */
  .read {
    margin: 0 0 0.7rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink);
    max-width: 62ch;
  }
  .bar.before {
    fill: var(--before);
    opacity: 0.55;
  }
  .bar.after {
    fill: url(#dAfter);
  }
  .bar.none {
    fill: var(--noyear);
    stroke: var(--noyear-stroke);
    stroke-dasharray: 3 2;
  }
  .bar.dim {
    opacity: 0.25;
  }
  .hit {
    fill: transparent;
  }
  .hit:focus {
    outline: none;
    stroke: var(--accent);
  }

  /* G11 — barras horizontales (móvil) */
  .hbars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .hbar {
    display: grid;
    grid-template-columns: 5.4rem minmax(0, 1fr) 3.4rem;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    font: inherit;
    font-size: 0.8rem;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 0.3rem 0.35rem;
    min-height: 44px;
    color: var(--ink-2);
    cursor: pointer;
  }
  .hbar:hover {
    background: var(--paper-2);
  }
  .hbar:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
  }
  .hbar.you {
    border-color: var(--accent);
  }
  .hl {
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    font-weight: 600;
  }
  .you-chip {
    display: block;
    font-style: normal;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--accent-deep);
  }
  .htrack {
    position: relative;
    height: 14px;
    background: var(--paper-2);
    border-radius: 3px;
    overflow: hidden;
  }
  .seg {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    display: block;
  }
  .seg.before {
    background: var(--before);
    opacity: 0.55;
  }
  .seg.none {
    background: repeating-linear-gradient(45deg, #d8dde2, #d8dde2 2px, #5b6874 2px, #5b6874 3px);
  }
  /* como en el SVG: «después» se superpone desde el origen (abajo/izda)
     sobre la barra completa — nunca como segmento final */
  .seg.after {
    background: repeating-linear-gradient(45deg, #c94f38, #c94f38 3px, #8c2d21 3px, #8c2d21 4.5px);
  }
  .hv {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .h-tip {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--ink);
    background: var(--paper-2);
    border-left: 3px solid var(--accent);
    padding: 0.4rem 0.7rem;
  }
  .tick {
    font-size: 9px;
    fill: var(--ink-3);
  }
  .axis {
    stroke: var(--ink-3);
    stroke-width: 1;
  }
  .sep {
    stroke: var(--ink-3);
    stroke-dasharray: 3 3;
  }
  .marker {
    stroke: var(--accent);
    stroke-width: 1.8;
  }
  .marker-label {
    font-size: 9.5px;
    font-weight: 700;
    fill: var(--accent-deep);
    letter-spacing: 0.03em;
  }
  .marker.compare {
    stroke: var(--accent-deep);
    stroke-dasharray: 4 3;
  }
  .marker-label.compare {
    fill: var(--accent-deep);
  }
  .d-tip {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    background: var(--ink);
    color: var(--paper);
    font-size: 0.72rem;
    padding: 0.2rem 0.5rem;
    border-radius: 5px;
    pointer-events: none;
    white-space: nowrap;
  }
  figcaption {
    margin-top: 0.4rem;
  }
  .den {
    margin: 0;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .heap {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--ink-3);
    font-style: italic;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
