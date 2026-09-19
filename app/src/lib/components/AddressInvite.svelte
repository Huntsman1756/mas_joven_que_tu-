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
</style>
