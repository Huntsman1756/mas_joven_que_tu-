<script lang="ts">
  import type { FeatureCollection } from 'geojson';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { loadContextGeom } from '$lib/domain/catalog';

  /**
   * G3-D — «Tu entorno, según los datos oficiales»: módulos condicionales
   * RUIDO · MOVILIDAD · MONTE PÚBLICO (gate docs/gates/G3-D.md).
   *
   * Cada módulo existe solo si la fuente cubre el municipio (cov del
   * artefacto); un negativo (NOT_MAPPED / sin parada / OUTSIDE) es un dato,
   * nunca una tarjeta genérica. La pregunta va antes que el dato. Una
   * overlay contextual a la vez (app.setContextOverlay la hace excluyente
   * con el highlight de planeamiento).
   */

  $effect(() => {
    if (app.selectedBuilding) app.ensureContextLocal();
  });

  let ctx = $derived(app.contextLocal);
  let geomBusy = $state(false);
  let noisePeriod = $state<'D' | 'T' | 'N'>('D');
  let ruidoFc = $state<FeatureCollection | null>(null);

  let overlayMod = $derived(app.contextOverlay?.mod ?? null);

  const PERIODS = ['D', 'T', 'N'] as const;
  const PERIOD_KEY = {
    D: 'context.noise.day',
    T: 'context.noise.evening',
    N: 'context.noise.night'
  };

  function bandRange(b: [number, number]): string {
    return `${b[0]}–${b[1]}`;
  }

  function pushNoiseOverlay(): void {
    if (!ruidoFc) return;
    app.setContextOverlay({
      mod: 'ruido',
      fc: {
        type: 'FeatureCollection',
        features: ruidoFc.features.filter((f) => (f.properties as { p?: string }).p === noisePeriod)
      }
    });
  }

  /** Overlay opt-in de un módulo: descarga perezosa por módulo + municipio. */
  async function toggleOverlay(mod: 'ruido' | 'paradas' | 'montes'): Promise<void> {
    if (app.contextOverlay?.mod === mod) {
      app.setContextOverlay(null);
      return;
    }
    const b = app.selectedBuilding;
    const l = app.contextLocal;
    if (!b || !l || l.kind !== 'resolved') return;
    geomBusy = true;
    try {
      if (mod === 'ruido') {
        ruidoFc = ruidoFc ?? (await loadContextGeom(b.mun, 'ruido'));
        pushNoiseOverlay();
        return;
      }
      const fc = await loadContextGeom(b.mun, mod);
      const idx = new Set(
        mod === 'paradas' ? l.mobility.stops.map((s) => s.i) : l.mountain.montes.map((m) => m.i)
      );
      app.setContextOverlay({
        mod,
        fc: {
          type: 'FeatureCollection',
          features: fc.features.filter((f) => idx.has((f.properties as { i?: number }).i ?? -1))
        }
      });
    } catch {
      app.setContextOverlay(null);
    } finally {
      geomBusy = false;
    }
  }

  function switchNoisePeriod(p: 'D' | 'T' | 'N'): void {
    noisePeriod = p;
    pushNoiseOverlay();
  }
</script>

{#if app.selectedBuilding && ctx && ctx.kind === 'resolved'}
  {@const noise = ctx.noise}
  {@const mobility = ctx.mobility}
  {@const mountain = ctx.mountain}
  {#if noise.state !== 'no_coverage' || mobility.state !== 'no_coverage' || mountain.state !== 'no_coverage'}
    <section class="ctx" aria-label={t('context.title')}>
      <h3>{t('context.title')}</h3>

      {#if noise.state !== 'no_coverage'}
        <div class="mod">
          <h4>{t('context.noise.q')}</h4>
          {#if noise.state === 'mapped'}
            <ul class="facts">
              {#each PERIODS as per (per)}
                {@const bands = noise[per.toLowerCase() as 'd' | 't' | 'n'].bands}
                {#if bands.length === 1}
                  <li>
                    {t('context.noise.mapped', {
                      range: bandRange(bands[0]),
                      period: t(PERIOD_KEY[per])
                    })}
                  </li>
                {:else if bands.length > 1}
                  <li>
                    {t('context.noise.mapped_multi', {
                      ranges: bands.map(bandRange).join(' · '),
                      period: t(PERIOD_KEY[per])
                    })}
                  </li>
                {/if}
              {/each}
            </ul>
            <button
              type="button"
              class="geom"
              aria-pressed={overlayMod === 'ruido'}
              disabled={geomBusy}
              onclick={() => toggleOverlay('ruido')}
            >
              {t(overlayMod === 'ruido' ? 'context.noise.map_hide' : 'context.noise.map_show')}
            </button>
            {#if overlayMod === 'ruido'}
              <p class="period">
                {t('context.noise.period_shown')}
                {#each PERIODS as per (per)}
                  <button
                    type="button"
                    class="per"
                    aria-pressed={noisePeriod === per}
                    onclick={() => switchNoisePeriod(per)}>{t(PERIOD_KEY[per])}</button
                  >
                {/each}
              </p>
            {/if}
          {:else}
            <p class="fact">{t('context.noise.not_mapped')}</p>
          {/if}
          <p class="src">{t('context.noise.source')}</p>
        </div>
      {/if}

      {#if mobility.state !== 'no_coverage'}
        <div class="mod">
          <h4>{t('context.mobility.q')}</h4>
          {#if mobility.state === 'available'}
            <p class="fact">
              {t(
                mobility.stops.length === 1
                  ? 'context.mobility.available_one'
                  : 'context.mobility.available',
                { n: mobility.stops.length }
              )}
            </p>
            <ul class="facts">
              {#each mobility.stops as s (s.i)}
                <li>
                  {s.ref.r.length
                    ? t('context.mobility.stop', {
                        name: s.ref.n,
                        dist: s.dist_m,
                        routes: s.ref.r.join(', ')
                      })
                    : t('context.mobility.stop_noroutes', { name: s.ref.n, dist: s.dist_m })}
                </li>
              {/each}
            </ul>
            <button
              type="button"
              class="geom"
              aria-pressed={overlayMod === 'paradas'}
              disabled={geomBusy}
              onclick={() => toggleOverlay('paradas')}
            >
              {t(
                overlayMod === 'paradas' ? 'context.mobility.map_hide' : 'context.mobility.map_show'
              )}
            </button>
          {:else}
            <p class="fact">{t('context.mobility.none')}</p>
          {/if}
          <p class="src">{t('context.mobility.source')}</p>
        </div>
      {/if}

      {#if mountain.state !== 'no_coverage'}
        <div class="mod">
          <h4>{t('context.monte.q')}</h4>
          {#if mountain.state === 'inside' || mountain.state === 'multiple'}
            {#if mountain.state === 'multiple'}
              <p class="fact">{t('context.monte.inside_multi', { n: mountain.montes.length })}</p>
            {/if}
            <ul class="facts">
              {#each mountain.montes as m (m.i)}
                <li>
                  {mountain.state === 'multiple'
                    ? t('context.monte.item', { name: m.ref.n })
                    : t('context.monte.inside', { name: m.ref.n })}
                  {#if m.ref.p}
                    <br /><span class="sub">{t('context.monte.owner', { owner: m.ref.p })}</span>
                  {/if}
                  {#if m.ref.fd}
                    <br /><span class="sub"
                      >{t('context.monte.date_deslinde', { date: m.ref.fd })}</span
                    >
                  {/if}
                  {#if m.ref.fa}
                    <br /><span class="sub"
                      >{t('context.monte.date_amojonamiento', { date: m.ref.fa })}</span
                    >
                  {/if}
                  {#if m.ref.fc}
                    <br /><span class="sub"
                      >{t('context.monte.date_catalogacion', { date: m.ref.fc })}</span
                    >
                  {/if}
                </li>
              {/each}
            </ul>
            <button
              type="button"
              class="geom"
              aria-pressed={overlayMod === 'montes'}
              disabled={geomBusy}
              onclick={() => toggleOverlay('montes')}
            >
              {t(overlayMod === 'montes' ? 'context.monte.map_hide' : 'context.monte.map_show')}
            </button>
          {:else}
            <p class="fact">{t('context.monte.outside')}</p>
          {/if}
          <p class="src">{t('context.monte.source')}</p>
        </div>
      {/if}
    </section>
  {/if}
{/if}

<style>
  .ctx {
    margin-top: 0.9rem;
    padding-top: 0.7rem;
    border-top: 1px solid #eeece6;
    font-size: 0.85rem;
  }
  .ctx h3 {
    font-size: 0.92rem;
    margin: 0 0 0.4rem;
    color: #33312c;
  }
  .mod {
    margin-top: 0.55rem;
    border-left: 3px solid #b9b5aa;
    padding-left: 0.7rem;
  }
  .mod h4 {
    font-size: 0.82rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    color: #55534b;
  }
  .fact {
    margin: 0 0 0.25rem;
    color: #33312c;
    max-width: 65ch;
  }
  .facts {
    list-style: none;
    margin: 0 0 0.3rem;
    padding: 0;
    display: grid;
    gap: 0.2rem;
    color: #33312c;
  }
  .sub {
    color: #55534b;
    font-size: 0.8rem;
  }
  .src {
    margin: 0.3rem 0 0;
    color: #6b6b63;
    font-size: 0.75rem;
    max-width: 65ch;
  }
  .geom {
    margin-top: 0.35rem;
    padding: 0.4rem 0.8rem;
    min-height: 44px;
    background: none;
    border: 1px solid #b9b5aa;
    border-radius: 2px;
    color: #33312c;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .geom[aria-pressed='true'] {
    background: #f2ead9;
    border-color: #7a4d00;
    color: #4a3a1a;
  }
  .geom:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
  .geom:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .period {
    margin: 0.35rem 0 0;
    font-size: 0.78rem;
    color: #55534b;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .per {
    padding: 0.25rem 0.55rem;
    min-height: 32px;
    background: none;
    border: 1px solid #b9b5aa;
    border-radius: 2px;
    color: #33312c;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .per[aria-pressed='true'] {
    background: #f2ead9;
    border-color: #7a4d00;
    color: #4a3a1a;
    font-weight: 600;
  }
  .per:focus-visible {
    outline: 2px solid #1c1a17;
    outline-offset: 2px;
  }
</style>
