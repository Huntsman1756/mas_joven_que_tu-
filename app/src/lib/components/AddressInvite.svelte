<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import Lazy from './Lazy.svelte';

  /**
   * MI EDIFICIO — invitación eager (PERF4-R). Misma copia, posición y
   * estilos que la `.invite` de AddressSearch; el flujo completo
   * (NORA + dominio de direcciones) solo se pide con el clic explícito.
   */
  let open = $state(false);
</script>

{#if !open}
  <div class="invite">
    <p class="invite-q">{t('address.invite')}</p>
    <p class="invite-n">{t('address.invite_note', { municipality: app.place?.name ?? '' })}</p>
    <button class="start" onclick={() => (open = true)}>{t('address.start')}</button>
  </div>
{:else}
  <Lazy loader={() => import('./AddressSearch.svelte')} props={{ initialOpen: true }} />
{/if}

<style>
  .invite {
    margin-top: 0.9rem;
    padding: 0.8rem 1rem;
    border: 1px dashed var(--line-strong);
    border-radius: 10px;
    background: var(--paper);
  }
  .invite-q {
    margin: 0;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--ink);
  }
  .invite-n {
    margin: 0.2rem 0 0.6rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .start {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
  }
</style>
