<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import {
    searchStreets,
    listPortals,
    portalBuildings,
    matchPortalExact,
    noraYear,
    yearAgreement,
    type AddressStep,
    type NoraCalle,
    type NoraPortal,
    type NoraEdificio
  } from '$lib/domain/address';

  /**
   * MI EDIFICIO (G3-A): búsqueda de dirección tras el resultado municipal.
   * Privacidad (gate §4): el texto de la dirección vive solo aquí, en
   * sesión — nunca en la URL ni en almacenamiento. El deep link usa solo
   * el id catastral cuando la identidad es EXACT/elegida.
   *
   * `initialOpen` (PERF4-R): la invitación vive en AddressInvite (eager);
   * cuando el componente llega por carga perezosa tras el clic, nace
   * directamente en el formulario — nunca vuelve a mostrar la invitación.
   */
  let { initialOpen = false }: { initialOpen?: boolean } = $props();

  let open = $state(initialOpen);
  let step = $state<AddressStep>('IDLE');
  let streetQ = $state('');
  let numQ = $state('');
  let bisQ = $state('');
  let streets = $state<NoraCalle[]>([]);
  let portals = $state<NoraPortal[]>([]);
  let variants = $state<NoraPortal[]>([]);
  let calle = $state<NoraCalle | null>(null);
  let noraEdificios = $state<NoraEdificio[]>([]);
  let active = $state(-1);
  let listOpen = $state(false);
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start() {
    open = true;
    step = 'IDLE';
  }

  function close() {
    open = false;
    abort?.abort();
    app.addressResult = null;
    app.identityPoint = null;
  }

  function reset() {
    abort?.abort();
    step = 'IDLE';
    streetQ = '';
    numQ = '';
    bisQ = '';
    streets = [];
    portals = [];
    variants = [];
    calle = null;
    noraEdificios = [];
    active = -1;
    app.addressResult = null;
    app.identityPoint = null;
  }

  function onStreetInput() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(findStreets, 220);
  }

  async function findStreets() {
    if (!app.place) return;
    abort?.abort();
    const q = streetQ.trim();
    if (q.length < 3) {
      step = q.length === 0 ? 'IDLE' : 'TOO_SHORT';
      return;
    }
    step = 'SEARCHING';
    abort = new AbortController();
    try {
      const r = await searchStreets(q, app.place, abort.signal);
      streets = r.mine;
      if (r.mine.length === 0) {
        step = r.bizkaia > 0 || r.outside > 0 ? 'OUT_OF_SCOPE' : 'NO_STREETS';
      } else if (r.mine.length === 1) {
        pickStreet(r.mine[0]);
      } else {
        step = 'STREETS';
        listOpen = true;
        active = -1;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      step = 'NETWORK_ERROR';
    }
  }

  async function pickStreet(c: NoraCalle) {
    calle = c;
    streets = [c];
    listOpen = false;
    active = -1;
    streetQ = c.descripcionCastellano || c.descripcionBilingue;
    if (numQ.trim()) await findPortals();
    else step = 'PORTALS'; // calle fijada, falta número
  }

  async function findPortals() {
    if (!calle) {
      if (streets.length === 1) calle = streets[0];
      else return;
    }
    const num = numQ.trim();
    if (!num) {
      step = 'PORTALS';
      return;
    }
    step = 'RESOLVING';
    abort?.abort();
    abort = new AbortController();
    try {
      const all = await listPortals(calle.id, abort.signal);
      const { exact, siblings } = matchPortalExact(all, num, bisQ.trim() || null);
      portals = exact;
      // Variantes de la MISMA base numérica (2↔2A/2B, 5↔5BIS): ambigüedad
      // real, siempre visible (gate §2). Extensiones numéricas (2→20) solo se
      // ofrecen cuando no hay match exacto — «2» y «20» son portales distintos.
      const sameBase = all.filter((p) => {
        const n = String(p.numero ?? '');
        if (!n.startsWith(num) || exact.includes(p)) return false;
        const rest = n.slice(num.length);
        return rest === '' || /\D/.test(rest);
      });
      variants =
        exact.length === 0
          ? all.filter((p) => String(p.numero ?? '').startsWith(num))
          : [...new Map([...siblings, ...sameBase].map((p) => [p.id, p])).values()];
      if (exact.length === 0) {
        step = variants.length > 0 ? 'PORTALS' : 'NO_PORTALS';
      } else if (exact.length === 1 && variants.length === 0) {
        await pickPortal(exact[0]);
      } else {
        step = 'PORTALS'; // 2A/2B/2C…: mostrar variantes
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      step = 'NETWORK_ERROR';
    }
  }

  async function pickPortal(p: NoraPortal) {
    portals = [p];
    variants = [];
    step = 'RESOLVING';
    abort?.abort();
    abort = new AbortController();
    try {
      noraEdificios = await portalBuildings(p.id, abort.signal);
      if (noraEdificios.length === 0) {
        app.addressResult = {
          calle: calle!,
          portal: p,
          edificios: [],
          identity: 'NOT_FOUND',
          catastroCandidates: [],
          catastroBuilding: null,
          agreement: 'BOTH_UNKNOWN'
        };
        step = 'NOT_FOUND';
        return;
      }
      // identidad Catastro: el punto oficial del portal lo resuelve MapView
      app.addressResult = {
        calle: calle!,
        portal: p,
        edificios: noraEdificios,
        identity: 'PENDING',
        catastroCandidates: [],
        catastroBuilding: null,
        agreement: 'BOTH_UNKNOWN'
      };
      const lon = Number(p.lonETRS89);
      const lat = Number(p.latETRS89);
      if (Number.isFinite(lon) && Number.isFinite(lat) && app.place) {
        // limpiar el resultado anterior: una identidad vieja no puede
        // alimentar una resolución PENDING nueva
        app.identityResult = null;
        app.identityPoint = { lon, lat, mun: app.place.cod };
      } else {
        finishIdentity('NORA_ONLY', []);
      }
      step = 'RESOLVED';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      step = 'NETWORK_ERROR';
    }
  }

  /** MapView escribe la identidad geométrica; aquí cerramos el acuerdo. */
  function finishIdentity(
    identity: import('$lib/domain/address').CatastroIdentity,
    candidates: import('$lib/domain/types').BuildingProps[]
  ) {
    const r = app.addressResult;
    if (!r) return;
    const cat = identity === 'EXACT' && candidates.length === 1 ? candidates[0] : null;
    app.addressResult = {
      ...r,
      identity,
      catastroCandidates: candidates,
      catastroBuilding: cat,
      agreement: yearAgreement(
        cat?.year ?? null,
        cat?.state ?? null,
        noraYear(noraEdificios[0]?.fechaConstr)
      )
    };
    if (cat) app.selectedBuilding = cat;
  }

  // MapView consume app.identityPoint y publica el resultado en app.identityResult
  $effect(() => {
    const res = app.identityResult;
    // untrack: finishIdentity lee noraEdificios/addressResult y escribe
    // addressResult/selectedBuilding — no suscribir el efecto a esas lecturas.
    if (res && app.addressResult?.identity === 'PENDING') {
      untrack(() => finishIdentity(res.identity, res.candidates));
    }
  });

  function chooseCatastro(b: import('$lib/domain/types').BuildingProps) {
    const r = app.addressResult;
    if (!r) return;
    app.selectedBuilding = b;
    app.addressResult = {
      ...r,
      catastroBuilding: b,
      agreement: yearAgreement(b.year, b.state, noraYear(noraEdificios[0]?.fechaConstr))
    };
  }

  function portalLabel(p: NoraPortal): string {
    const parts = [String(p.numero ?? '?')];
    if (p.bis) parts.push(p.bis);
    if (p.acepcion) parts.push(`· ${p.acepcion}`);
    if (p.codigoPostal) parts.push(`· CP ${p.codigoPostal}`);
    return parts.join(' ');
  }

  function onKey(e: KeyboardEvent) {
    const n = streets.length;
    if (e.key === 'ArrowDown') {
      active = Math.min(active + 1, n - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      active = Math.max(active - 1, 0);
      e.preventDefault();
    } else if (e.key === 'Enter' && active >= 0 && active < n) {
      void pickStreet(streets[active]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      listOpen = false;
      active = -1;
    }
  }

  let r = $derived(app.addressResult);
  let noraY = $derived(noraYear(noraEdificios[0]?.fechaConstr));
</script>

{#if !open}
  <div class="invite">
    <p class="invite-q">{t('address.invite')}</p>
    <p class="invite-n">{t('address.invite_note', { municipality: app.place?.name ?? '' })}</p>
    <button class="start" onclick={start}>{t('address.start')}</button>
  </div>
{:else}
  <section class="addr" aria-label={t('address.invite')}>
    <div class="addr-head">
      <form
        class="addr-form"
        onsubmit={(e) => {
          e.preventDefault();
          if (streets.length === 1) void pickStreet(streets[0]);
          else if (streets.length > 1) listOpen = true;
          void findPortals();
        }}
      >
        <div class="f-street">
          <label for="addr-street"
            >{t('address.label.street', { municipality: app.place?.name ?? '' })}</label
          >
          <input
            id="addr-street"
            bind:value={streetQ}
            oninput={() => {
              // limpiar resultados de la query anterior: sin esto, teclear una
              // nueva búsqueda reabre el listbox con opciones stale hasta que
              // resuelve el fetch (ArrowDown+Enter elegiría una calle vieja)
              streets = [];
              active = -1;
              onStreetInput();
              listOpen = true;
            }}
            onkeydown={onKey}
            role="combobox"
            aria-expanded={listOpen && streets.length > 1}
            aria-controls="addr-street-list"
            aria-activedescendant={active >= 0 ? `addr-st-${active}` : undefined}
            autocomplete="off"
            placeholder={t('address.placeholder.street')}
          />
          {#if listOpen && streets.length > 1}
            <ul id="addr-street-list" role="listbox">
              {#each streets as c, i (c.id)}
                <li
                  id="addr-st-{i}"
                  role="option"
                  aria-selected={i === active}
                  class:active={i === active}
                >
                  <button
                    type="button"
                    onclick={() => pickStreet(c)}
                    onmouseenter={() => (active = i)}
                  >
                    {c.descripcionBilingue}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        <div class="f-num">
          <label for="addr-num">{t('address.label.number')}</label>
          <input
            id="addr-num"
            bind:value={numQ}
            oninput={() => {
              if (calle) void findPortals();
            }}
            inputmode="numeric"
            placeholder={t('address.placeholder.number')}
          />
        </div>
        <div class="f-bis">
          <label for="addr-bis">{t('address.label.bis')}</label>
          <input id="addr-bis" bind:value={bisQ} maxlength="3" placeholder="" />
        </div>
        <button class="go" type="submit" disabled={!numQ.trim()}>→</button>
      </form>
      <div class="addr-actions">
        <button class="link" onclick={reset}>{t('address.reset')}</button>
        <button class="link" onclick={close}>{t('address.close')}</button>
      </div>
    </div>

    <div class="status" role="status">
      {#if step === 'TOO_SHORT'}{t('search.too_short')}
      {:else if step === 'SEARCHING'}{t('address.street.searching')}
      {:else if step === 'NO_STREETS'}{t('address.street.none', {
          municipality: app.place?.name ?? ''
        })}
      {:else if step === 'OUT_OF_SCOPE'}{t('address.street.outside', {
          municipality: app.place?.name ?? ''
        })}
      {:else if step === 'STREETS'}{t('address.street.pick', {
          n: streets.length,
          municipality: app.place?.name ?? ''
        })}
      {:else if step === 'RESOLVING'}{t('address.building.searching')}
      {:else if step === 'NO_PORTALS'}{t('address.portal.none', { number: numQ })}
      {:else if step === 'NOT_FOUND'}{t('address.building.not_found')}
      {:else if step === 'NETWORK_ERROR'}{t('address.street.network_error')}
      {/if}
    </div>

    {#if portals.length + variants.length > 1}
      <div class="variants">
        <p>{t('address.portal.pick')}</p>
        <ul>
          {#each [...portals, ...variants] as p (p.id)}
            <li>
              <button type="button" onclick={() => pickPortal(p)}>{portalLabel(p)}</button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if r}
      <div class="res" class:exact={r.identity === 'EXACT'}>
        <h3>{t('address.result.title')}</h3>
        {#if r.identity === 'PENDING'}
          <p class="note">{t('address.building.searching')}</p>
        {:else if r.identity === 'NORA_ONLY'}
          <p class="note">{t('address.result.nora_only')}</p>
        {:else if r.identity === 'MULTIPLE' && !r.catastroBuilding}
          <p class="note">{t('address.building.multiple', { n: r.catastroCandidates.length })}</p>
          <ul class="cands">
            {#each r.catastroCandidates as b (b.id)}
              <li>
                <button type="button" onclick={() => chooseCatastro(b)}>
                  {b.state === 'VALID' && b.year !== null
                    ? t('building.year', { year: b.year })
                    : t('building.unknown')}
                  · {b.area_m2} m²
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        {#if r.catastroBuilding || r.identity === 'NORA_ONLY'}
          <p class="year">
            {#if r.agreement === 'BOTH_EQUAL'}
              {t('address.year.both_equal', { year: r.catastroBuilding?.year ?? noraY ?? '—' })}
            {:else if r.agreement === 'BOTH_DIFFER'}
              {t('address.year.both_differ', {
                catastro_year: r.catastroBuilding?.year ?? '—',
                nora_year: noraY ?? '—'
              })}
            {:else if r.agreement === 'CATASTRO_ONLY'}
              {t('address.year.catastro_only', { catastro_year: r.catastroBuilding?.year ?? '—' })}
            {:else if r.agreement === 'NORA_ONLY'}
              {t('address.year.nora_only', { nora_year: noraY ?? '—' })}
            {:else}
              {t('address.year.both_unknown')}
            {/if}
          </p>
          {#if r.catastroBuilding}
            <p class="fields">
              {t('building.fields', {
                uso: r.catastroBuilding.uso ?? '—',
                alturas: r.catastroBuilding.alturas ?? '—',
                area: r.catastroBuilding.area_m2 ?? 0
              })}
            </p>
          {/if}
        {/if}
        <p class="prov">{t('address.provenance')}</p>
      </div>
    {/if}
  </section>
{/if}

<style>
  .invite {
    margin-top: 0.9rem;
    padding: 0.8rem 1rem;
    border: 1px dashed #b9b5aa;
    border-radius: 10px;
    background: #f7f5f1;
  }
  .invite-q {
    margin: 0;
    font-weight: 700;
    font-size: 0.95rem;
    color: #1c1a17;
  }
  .invite-n {
    margin: 0.2rem 0 0.6rem;
    font-size: 0.8rem;
    color: #55534b;
  }
  .start {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    min-height: 44px;
    border: 1px solid #3a3835;
    border-radius: 6px;
    background: #1c1a17;
    color: #f2f0ec;
    cursor: pointer;
  }
  .addr {
    margin-top: 0.9rem;
    border: 1px solid #d6d3cb;
    border-radius: 10px;
    background: #fff;
    padding: 0.8rem 1rem;
  }
  .addr-head {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .addr-form {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
    flex-wrap: wrap;
    flex: 1;
    min-width: 260px;
  }
  .f-street {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  .f-num {
    width: 5.5rem;
  }
  .f-bis {
    width: 3.4rem;
  }
  label {
    display: block;
    font-size: 0.72rem;
    color: #55534b;
    margin-bottom: 0.2rem;
  }
  input {
    /* border-box: width:100% + padding + border en content-box desbordaba
       ~22 px el contenedor a 320 px (scroll horizontal en móvil) */
    box-sizing: border-box;
    width: 100%;
    padding: 0.5rem 0.6rem;
    font: inherit;
    font-size: 0.92rem;
    border: 1.5px solid #b9b5aa;
    border-radius: 8px;
    background: #fff;
    color: #1c1a17;
  }
  input:focus {
    outline: 2px solid #c63b4f;
    outline-offset: 1px;
  }
  .go {
    min-width: 44px;
    min-height: 44px;
    font: inherit;
    font-size: 1rem;
    border: 1px solid #3a3835;
    border-radius: 8px;
    background: #1c1a17;
    color: #f2f0ec;
    cursor: pointer;
  }
  .go:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .addr-actions {
    display: flex;
    gap: 0.8rem;
  }
  .link {
    font: inherit;
    font-size: 0.78rem;
    color: #8e2f4c;
    background: none;
    border: 0;
    padding: 0.3rem;
    cursor: pointer;
    text-decoration: underline;
  }
  ul[role='listbox'] {
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
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow: auto;
  }
  ul li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.7rem;
    border: 0;
    background: none;
    font-size: 0.92rem;
    cursor: pointer;
    border-radius: 6px;
    color: #1c1a17;
    min-height: 44px;
  }
  li.active button,
  .variants li button:hover,
  .cands li button:hover {
    background: #f3ecec;
  }
  .status {
    font-size: 0.8rem;
    color: #55534b;
    min-height: 1.2rem;
    margin-top: 0.4rem;
  }
  .variants {
    margin-top: 0.4rem;
    font-size: 0.85rem;
  }
  .variants p {
    margin: 0 0 0.3rem;
    color: #55534b;
  }
  .variants ul,
  .cands {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .variants li button,
  .cands li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.7rem;
    border: 1px solid #e0ddd4;
    border-radius: 6px;
    background: #faf9f6;
    font: inherit;
    font-size: 0.88rem;
    cursor: pointer;
    margin-bottom: 0.3rem;
  }
  .res {
    margin-top: 0.7rem;
    border-top: 1px solid #eeece6;
    padding-top: 0.6rem;
  }
  .res.exact {
    border-left: 4px solid #c63b4f;
    padding-left: 0.7rem;
  }
  .res h3 {
    margin: 0 0 0.3rem;
    font-size: 0.95rem;
    color: #1c1a17;
  }
  .note {
    font-size: 0.82rem;
    color: #55534b;
    margin: 0.2rem 0;
  }
  .year {
    font-weight: 600;
    font-size: 0.95rem;
    margin: 0.35rem 0;
    color: #1c1a17;
  }
  .fields {
    font-size: 0.85rem;
    color: #55534b;
    margin: 0.2rem 0;
  }
  .prov {
    margin: 0.5rem 0 0;
    font-size: 0.7rem;
    color: #6b6b63;
    font-style: italic;
  }
</style>
