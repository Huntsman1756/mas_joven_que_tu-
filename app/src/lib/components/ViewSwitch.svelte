<script lang="ts">
  import { tick, onMount } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import {
    Building2,
    ChartLine,
    Camera,
    Map as MapIcon,
    Columns2,
    ChevronDown,
    ChevronLeft,
    Check
  } from '@lucide/svelte';

  /**
   * G8 — selector único de modo del visor. Una sola jerarquía de cinco
   * opciones («qué quiero ver sobre este lugar»), sin encabezados de
   * grupo que simulen tabs. El activo lleva superficie + icono, no solo
   * un underline. En pantalla estrecha los cinco modos no se comprimen:
   * un control «Vista · modo» abre un menú accesible (menuitemradio,
   * flechas/Home/Fin, Esc, clic fuera).
   *
   * Cambiar de vista nunca toca `place` ni `year` (S2) y el cabezal
   * `playYear` persiste. Entrar en 1923–25 ES el opt-in de red del mapa
   * histórico; entrar en FOTOS no pide imagen alguna.
   */

  type Mode = 'map' | 'time' | 'photo' | 'hist' | 'swipe';

  // G19-R2: la columna de resultado permanece en los cinco modos en
  // desktop — la cabecera es la misma en todos. Solo en pantalla
  // apilada (≤1023px, columna desmontada) «‹ Resultado» recupera la
  // pantalla narrativa; por eso el botón existe pero se oculta ≥1024px.
  let viewer = $derived(app.mode !== 'map');
  const MODES = [
    { id: 'map', icon: Building2 },
    { id: 'time', icon: ChartLine },
    { id: 'photo', icon: Camera },
    { id: 'hist', icon: MapIcon },
    { id: 'swipe', icon: Columns2 }
  ] as const;

  function setMode(m: Mode) {
    if (app.mode === m) return; // sin no-ops: ni reseteo ni entrada de history
    const leavingTime = app.mode === 'time';
    app.mode = m;
    app.modeNavSeq++; // evento discreto: entrada de history propia (G8)
    if (m === 'time') {
      // Entrar en Evolución nunca autoproduce: si el timer quedó activo
      // de una visita anterior, el Timeline remontado reanudaría solo.
      // Reproducir es siempre una acción explícita.
      app.pausePlayback();
      if (app.playYear === null && app.year !== null) {
        app.playYear = app.year; // cabezal pausado en el año personal
        app.playUrlSeq++; // evento discreto: la URL recoge la pausa, no el tick
      }
    } else if (leavingTime) {
      // G18: salir de Evolución pausa la reproducción — el cabezal se
      // conserva para restaurar el año al volver, pero nada se mueve solo.
      app.pausePlayback();
    }
    app.histMapVisible = m === 'hist';
    if (m === 'swipe') {
      // G6: el lienzo principal pasa a la última campaña («hoy»);
      // SwipeCompare sondea y monta la cortina con la primera (1956).
      app.orthoCampaign = app.latest;
      app.orthoVisible = true;
      app.orthoState = 'UNKNOWN';
      app.orthoAlternatives = [];
      app.orthoCompare = null;
      app.photoView = 'a';
    } else if (m !== 'photo') {
      app.orthoVisible = false;
      app.orthoCompare = null;
    }
  }

  // ── Menú móvil «Vista · modo» ────────────────────────────────────────
  let open = $state(false);
  let selBtn = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);

  async function openMenu() {
    open = true;
    await tick();
    const items = menuEl?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!items?.length) return;
    const target = menuEl?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? items[0];
    target.focus();
  }

  function closeMenu(refocus = true) {
    open = false;
    if (refocus) selBtn?.focus();
  }

  function pick(m: Mode) {
    closeMenu(false);
    setMode(m);
    selBtn?.focus();
  }

  function onSelKey(e: KeyboardEvent) {
    // Enter/Espacio llegan por el click nativo del botón; aquí solo flechas.
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      void openMenu();
    }
  }

  function onMenuKey(e: KeyboardEvent) {
    const items = menuEl?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!items?.length) return;
    const cur = [...items].indexOf(document.activeElement as HTMLButtonElement);
    let j: number;
    if (e.key === 'ArrowDown') j = (cur + 1) % items.length;
    else if (e.key === 'ArrowUp') j = (cur - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    } else if (e.key === 'Tab') {
      closeMenu(false);
      return;
    } else return;
    e.preventDefault();
    items[j]?.focus();
  }

  function onDocPointerDown(e: PointerEvent) {
    if (!open) return;
    const n = e.target as Node;
    if (!menuEl?.contains(n) && !selBtn?.contains(n)) closeMenu(false);
  }
  onMount(() => {
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  });
</script>

<div class="vtoolbar">
  <div class="vhead" class:viewer>
    {#if viewer}
      <button class="vback" data-action="back-result" onclick={() => setMode('map')}>
        <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
        {t('view.back_result')}{#if app.place && app.year !== null}
          <span class="vback-ctx">· {app.place.name} · {app.year}</span>{/if}
      </button>
    {/if}
    <p class="vtitle">{t('view.explore', { municipality: app.place?.name ?? '' })}</p>
    {#if app.year !== null && app.place}
      <span class="vctx">{app.year} · {app.place.name}</span>
    {/if}
  </div>

  <!-- desktop: los cinco modos en una sola fila de navegación -->
  <nav class="viewswitch" aria-label={t('view.label')}>
    {#each MODES as m (m.id)}
      {@const Icon = m.icon}
      <button
        class="v"
        data-mode={m.id}
        aria-current={app.mode === m.id ? 'true' : undefined}
        onclick={() => setMode(m.id)}
      >
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
        <span>{t(`view.${m.id}`)}</span>
      </button>
    {/each}
  </nav>

  <!-- móvil: un control, cinco opciones en menú; en modos de visor el
       «‹» recupera la pantalla narrativa -->
  <div class="vselrow">
    {#if viewer}
      <button
        class="vback-m"
        data-action="back-result"
        aria-label={t('view.back_result')}
        onclick={() => setMode('map')}
      >
        <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
    {/if}
    <button
      class="vsel"
      bind:this={selBtn}
      aria-expanded={open}
      aria-haspopup="menu"
      onclick={() => (open ? closeMenu(false) : void openMenu())}
      onkeydown={onSelKey}
    >
      <span class="vsel-l">{t('view.vista')}</span>
      <strong class="vsel-cur">{t(`view.${app.mode}`)}</strong>
      <ChevronDown size={16} strokeWidth={2} aria-hidden="true" class="vsel-caret" />
    </button>
  </div>
</div>
{#if open}
  <div
    class="vmenu"
    role="menu"
    aria-label={t('view.label')}
    tabindex="-1"
    bind:this={menuEl}
    onkeydown={onMenuKey}
  >
    {#each MODES as m (m.id)}
      {@const Icon = m.icon}
      <button
        class="vopt"
        role="menuitemradio"
        data-mode={m.id}
        aria-checked={app.mode === m.id}
        onclick={() => pick(m.id)}
      >
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>{t(`view.${m.id}`)}</span>
        {#if app.mode === m.id}
          <Check size={17} strokeWidth={2.2} aria-hidden="true" class="vopt-check" />
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .vtoolbar {
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .vhead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem clamp(1rem, 4vw, 2.4rem) 0.1rem;
  }
  .vtitle {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .vctx {
    font-size: 0.78rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
    white-space: nowrap;
  }
  /* G19-R2: «‹ Resultado» solo recupera algo cuando la columna está
     desmontada (≤1023px). En desktop la cabecera del visor es idéntica
     en los cinco modos — cambiar de modo no reorganiza la página. */
  @media (min-width: 1024px) {
    .vhead .vback {
      display: none;
    }
  }
  @media (max-width: 1023px) {
    .vhead.viewer .vtitle,
    .vhead.viewer .vctx {
      display: none;
    }
  }
  .vback {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.28rem 0.8rem 0.28rem 0.55rem;
    background: var(--surface);
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
    min-height: 32px;
  }
  .vback:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }
  .vback:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .vback-ctx {
    font-weight: 600;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 32ch;
  }
  .viewswitch {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
    padding: 0.15rem clamp(1rem, 4vw, 2.4rem) 0.5rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .viewswitch::-webkit-scrollbar {
    display: none;
  }
  .v {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 0.35rem 0.8rem;
    min-height: 44px;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
  }
  .v :global(svg) {
    flex: 0 0 auto;
  }
  .v:hover {
    color: var(--ink);
    background: var(--paper-2);
  }
  .v[aria-current='true'] {
    color: var(--ink);
    background: var(--paper-2);
    border-color: var(--line-strong);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .v[aria-current='true'] :global(svg) {
    color: var(--accent-deep);
  }
  .v:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  /* ── móvil ── */
  .vselrow,
  .vsel,
  .vback-m {
    display: none;
  }
  .vmenu {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    background: var(--surface);
    border-top: 1px solid var(--line-strong);
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -6px 24px rgba(24, 38, 49, 0.18);
    padding: 0.4rem 0 max(0.4rem, env(safe-area-inset-bottom));
  }
  .vopt {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    text-align: left;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    padding: 0 1.1rem;
    min-height: 48px;
    cursor: pointer;
  }
  .vopt:hover,
  .vopt:focus-visible {
    background: var(--paper-2);
    color: var(--ink);
    outline: none;
  }
  .vopt[aria-checked='true'] {
    color: var(--ink);
  }
  .vopt :global(.vopt-check) {
    margin-left: auto;
    color: var(--accent-deep);
  }

  @media (max-width: 700px) {
    .vhead {
      display: none;
    }
    .viewswitch {
      display: none;
    }
    .vselrow {
      display: flex;
      align-items: stretch;
      gap: 0.3rem;
      padding-right: clamp(1rem, 4vw, 2.4rem);
    }
    .vback-m {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 44px;
      border: 0;
      border-right: 1px solid var(--line);
      background: transparent;
      color: var(--ink-2);
      cursor: pointer;
    }
    .vback-m:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: -2px;
    }
    .vsel {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex: 1;
      min-width: 0;
      font: inherit;
      font-size: 0.85rem;
      border: 0;
      background: transparent;
      color: var(--ink-2);
      padding: 0.35rem clamp(1rem, 4vw, 2.4rem);
      min-height: 48px;
      cursor: pointer;
      text-align: left;
    }
    .vsel-l {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-3);
    }
    .vsel-cur {
      color: var(--ink);
    }
    .vsel :global(.vsel-caret) {
      margin-left: auto;
      color: var(--ink-3);
    }
    .vsel:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: -2px;
    }
  }
</style>
