<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { bucketsForYear, markerPosition } from '$lib/domain/metrics';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct } from '$lib/domain/format';

  let { height = 150 }: { height?: number } = $props();

  const W = 720;
  let H = $derived(height);
  const PAD = { l: 34, r: 10, t: 26, b: 26 };
  const GAP = 3; // separación del bloque «sin año»

  let buckets = $derived(
    app.metrics && app.year !== null ? bucketsForYear(app.metrics, app.year) : []
  );
  let temporal = $derived(buckets.filter((b) => b.inTemporalAxis));
  let noYear = $derived(buckets.find((b) => !b.inTemporalAxis));
  let maxN = $derived(Math.max(1, ...temporal.map((b) => b.n)));
  let markerX = $derived(
    app.year !== null ? markerXFor(markerPosition(app.year)) : 0
  );

  function markerXFor(pos: number): number {
    const bw = (W - PAD.l - PAD.r) / temporal.length;
    return PAD.l + pos * bw;
  }

  function bucketX(i: number): number {
    const bw = (W - PAD.l - PAD.r) / temporal.length;
    return PAD.l + i * bw;
  }

  function h(n: number): number {
    return (n / maxN) * (H - PAD.t - PAD.b);
  }

  let tip = $state<{ x: number; text: string } | null>(null);

  function enter(b: (typeof buckets)[number], x: number) {
    app.hoveredDecade = b.id;
    tip = {
      x,
      text:
        b.id === 'pre1900'
          ? t('dist.bucket.pre1900.tooltip', { n: fmt(b.n), share: fmtPct(b.sharePct) })
          : b.id === 'none'
            ? t('dist.noyear_band', { no_year: fmt(b.n), no_year_pct: fmtPct(b.sharePct) })
            : t('dist.tooltip.decade', {
                decade: b.id,
                n: fmt(b.n),
                share: fmtPct(b.sharePct),
              }),
    };
  }
  function leave() {
    app.hoveredDecade = null;
    tip = null;
  }

  let heaping = $derived(app.metrics?.constants.heaping_05_pct ?? 0);
</script>

{#if app.metrics && app.year !== null}
  <figure class="dist" aria-label={t('dist.title', { municipality: app.place?.name ?? '' })}>
    <svg
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label={t('dist.title', { municipality: app.place?.name ?? '' })}
      preserveAspectRatio="none"
      width="100%"
      {height}
    >
      <!-- barras temporales -->
      {#each temporal as b, i (b.id)}
        {@const x = bucketX(i)}
        {@const bw = (W - PAD.l - PAD.r) / temporal.length - 2}
        {@const hh = h(b.n)}
        {@const hhAfter = h(b.nAfter)}
        <!-- parte «ya existía» -->
        <rect
          x={x + 1}
          y={H - PAD.b - hh}
          width={bw}
          height={hh}
          class="bar before"
          class:dim={app.hoveredDecade !== null && app.hoveredDecade !== b.id}
        />
        <!-- parte «después» (solo el bucket que cruza el año) -->
        {#if b.nAfter > 0 && b.nAfter < b.n}
          <rect
            x={x + 1}
            y={H - PAD.b - hhAfter}
            width={bw}
            height={hhAfter}
            class="bar after"
            class:dim={app.hoveredDecade !== null && app.hoveredDecade !== b.id}
          />
        {/if}
        <rect
          x={x + 1}
          y={H - PAD.b - Math.max(hh, 10)}
          width={bw}
          height={Math.max(hh, 10)}
          class="hit"
          role="presentation"
          onmouseenter={() => enter(b, x + bw / 2)}
          onmouseleave={leave}
        />
        <text x={x + bw / 2 + 1} y={H - 10} text-anchor="middle" class="tick">
          {i % 2 === 0 || W > 600 ? b.label : ''}
        </text>
      {/each}

      <!-- «sin año» fuera del eje temporal -->
      {#if noYear}
        {@const nx = W - PAD.r - 52}
        <rect
          x={nx}
          y={H - PAD.b - h(noYear.n)}
          width={44}
          height={h(noYear.n)}
          class="bar none"
          class:dim={app.hoveredDecade !== null && app.hoveredDecade !== 'none'}
        />
        <line x1={nx - GAP - 4} y1={PAD.t} x2={nx - GAP - 4} y2={H - PAD.b} class="sep" />
        <text x={nx + 22} y={H - 10} text-anchor="middle" class="tick">{noYear.label}</text>
        <rect
          x={nx - GAP - 4}
          y={PAD.t}
          width={52 + GAP + 4}
          height={H - PAD.t - PAD.b}
          class="hit"
          role="presentation"
          onmouseenter={() => enter(noYear, nx + 22)}
          onmouseleave={leave}
        />
      {/if}

      <!-- marcador de año -->
      <line x1={markerX} y1={PAD.t - 4} x2={markerX} y2={H - PAD.b} class="marker" />
      <text x={markerX} y={PAD.t - 10} text-anchor="middle" class="marker-label">
        {t('dist.marker', { selected_year: app.year })}
      </text>

      <!-- eje -->
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} class="axis" />
    </svg>
    {#if tip}
      <div class="d-tip" style="left:{(tip.x / W) * 100}%">{tip.text}</div>
    {/if}
    <table class="sr-only">
      <caption>{t('dist.title', { municipality: app.place?.name ?? '' })}</caption>
      <thead>
        <tr><th>{t('dist.axis.x')}</th><th>{t('dist.axis.y')}</th></tr>
      </thead>
      <tbody>
        {#each buckets as b (b.id)}
          <tr><td>{b.id === 'pre1900' ? t('dist.bucket.pre1900') : b.label}</td><td>{b.n}</td></tr>
        {/each}
      </tbody>
    </table>
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
  .bar.before {
    fill: #8fa3b8;
  }
  .bar.after {
    fill: #c63b4f;
  }
  .bar.none {
    fill: #d9d8d2;
    stroke: #7c7c74;
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
    stroke: #c63b4f;
  }
  .tick {
    font-size: 9px;
    fill: #6b6b63;
  }
  .axis {
    stroke: #a9a49a;
    stroke-width: 1;
  }
  .sep {
    stroke: #a9a49a;
    stroke-dasharray: 3 3;
  }
  .marker {
    stroke: #18181b;
    stroke-width: 1.6;
  }
  .marker-label {
    font-size: 9.5px;
    font-weight: 700;
    fill: #18181b;
    letter-spacing: 0.03em;
  }
  .d-tip {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    background: #18181b;
    color: #fff;
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
    color: #55534b;
  }
  .heap {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: #6b6b63;
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
