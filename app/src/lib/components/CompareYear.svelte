<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import { fmt, fmtPct } from '$lib/domain/format';
  import { twoYearPartition } from '$lib/domain/metrics';
  import { parseYearInput } from '$lib/domain/url';

  /**
   * DOS AÑOS (G3-A): segundo ancla temporal. `app.year` es invariante —
   * nunca se muta desde aquí (gate §6). La partición usa la misma fuente
   * `cum`/`dist` auditada que la métrica primaria (gate §5).
   *
   * `initialEditing` (PERF4-R): la invitación vive en CompareInvite
   * (eager); al llegar por carga perezosa tras el clic, nace en modo
   * edición. Con `?compare=` restaurado llega `initialEditing=false` y
   * muestra la partición directamente.
   */
  let { initialEditing = false }: { initialEditing?: boolean } = $props();

  let editing = $state(initialEditing);
  let input = $state('');
  let error = $state<'invalid' | 'same' | null>(null);

  let partition = $derived(
    app.metrics && app.year !== null && app.compareYear !== null
      ? twoYearPartition(app.metrics, app.year, app.compareYear)
      : null
  );

  function open() {
    // G10.1 (equivalente): al re-editar, el año vigente de la comparación
    // es el valor editable. En la invitación inicial no hay año vigente.
    input = app.compareYear !== null ? String(app.compareYear) : '';
    error = null;
    editing = true;
  }

  function apply() {
    // G10-01 (equivalente): mismo dominio que Hero/URL — dígitos estrictos
    const snap = app.metrics?.snapshot_year ?? 2025;
    const v = parseYearInput(input, snap);
    if (v === null) {
      error = 'invalid';
      return;
    }
    // compare == year: la partición entre A y A sería vacía (G4 polish) —
    // se rechaza con copy clara en vez de publicar un resultado sin sentido
    if (v === app.year) {
      error = 'same';
      return;
    }
    app.compareYear = v;
    editing = false;
    error = null;
  }

  function remove() {
    app.compareYear = null;
    editing = false;
    error = null;
  }

  function pct(n: number, known: number): number {
    return known > 0 ? (100 * n) / known : 0;
  }
</script>

{#if app.metrics && app.year !== null}
  <div class="compare">
    {#if app.compareYear === null && !editing}
      <button class="invite" onclick={open}>
        <span class="invite-q">{t('compare.invite')}</span>
        <span class="invite-n">{t('compare.invite_note')}</span>
      </button>
    {:else if editing}
      <form
        class="cmp-form"
        onsubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <label for="cmp-year">{t('compare.label')}</label>
        <input
          id="cmp-year"
          bind:value={input}
          oninput={() => (error = null)}
          inputmode="numeric"
          autocomplete="off"
          placeholder={String(app.year - 25)}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? 'cmp-year-err' : undefined}
        />
        <button class="go" type="submit">{t('compare.apply')}</button>
        <button class="link" type="button" onclick={remove}>×</button>
      </form>
      {#if error === 'invalid'}
        <p id="cmp-year-err" class="err" role="alert">
          {t('compare.invalid', { snapshot_year: app.metrics?.snapshot_year ?? '—' })}
        </p>
      {:else if error === 'same'}
        <p id="cmp-year-err" class="err" role="alert">
          {t('compare.same_year', { selected_year: app.year })}
        </p>
      {/if}
    {:else if partition}
      <div class="cmp-head">
        <span class="cmp-marker"
          >{t('compare.marker', { compare_year: app.compareYear ?? '—' })}</span
        >
        <button class="link" onclick={open}>{t('compare.label')}</button>
        <button class="link" onclick={remove}>{t('compare.remove')}</button>
      </div>
      <p class="den">
        {t('compare.partition.denominator', {
          municipality: app.place?.name ?? '',
          known: fmt(partition.known)
        })}
      </p>
      <ul class="buckets">
        <li>
          <i class="sw b"></i>{t('compare.partition.before', {
            earlier: partition.earlier,
            n: fmt(partition.leEarlier.n),
            pct: fmtPct(pct(partition.leEarlier.n, partition.known))
          })}
        </li>
        <li>
          <i class="sw m"></i>{t('compare.partition.between', {
            earlier: partition.earlier,
            later: partition.later,
            n: fmt(partition.between.n),
            pct: fmtPct(pct(partition.between.n, partition.known))
          })}
        </li>
        <li>
          <i class="sw a"></i>{t('compare.partition.after', {
            later: partition.later,
            n: fmt(partition.gtLater.n),
            pct: fmtPct(pct(partition.gtLater.n, partition.known))
          })}
        </li>
        <li class="unk">
          {t('compare.partition.unknown', { n: fmt(partition.nonValid.n) })}
        </li>
      </ul>
    {/if}
  </div>
{/if}

<style>
  .compare {
    margin-top: 0.9rem;
  }
  .invite {
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    padding: 0.7rem 1rem;
    border: 1px dashed var(--line-strong);
    border-radius: 10px;
    background: var(--paper);
    cursor: pointer;
    min-height: 44px;
  }
  .invite-q {
    display: block;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--ink);
  }
  .invite-n {
    display: block;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.15rem;
  }
  .cmp-form {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  label {
    display: block;
    width: 100%;
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  input {
    width: 7rem;
    padding: 0.5rem 0.6rem;
    font: inherit;
    font-size: 0.92rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 8px;
  }
  input:focus {
    outline: 2px solid var(--ink);
    outline-offset: 1px;
  }
  input[aria-invalid='true'] {
    border-color: var(--accent-deep);
  }
  .go {
    min-height: 44px;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    border: 1px solid var(--ink);
    border-radius: 8px;
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
  }
  .link {
    font: inherit;
    font-size: 0.78rem;
    color: var(--accent-deep);
    background: none;
    border: 0;
    padding: 0.3rem;
    cursor: pointer;
    text-decoration: underline;
    min-height: 44px;
  }
  .err {
    color: var(--accent-deep);
    font-size: 0.8rem;
    margin: 0.3rem 0 0;
  }
  .cmp-head {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .cmp-marker {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--accent-deep);
  }
  .den {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin: 0.35rem 0 0.4rem;
  }
  .buckets {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.85rem;
    color: var(--ink);
  }
  .buckets li {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0.15rem 0;
  }
  .sw {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    flex: none;
    transform: translateY(0.08rem);
  }
  .sw.b {
    background: var(--before);
  }
  .sw.m {
    background: var(--accent);
  }
  .sw.a {
    background: var(--ink);
  }
  .unk {
    color: var(--ink-3);
    font-style: italic;
  }
</style>
