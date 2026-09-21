<script lang="ts">
  import { app } from '$lib/state/app.svelte';
  import { t } from '$lib/i18n/t';
  import Lazy from './Lazy.svelte';

  /**
   * DOS AÑOS — invitación eager (PERF4-R). Mismo botón `.compare .invite`
   * que CompareYear; la implementación solo se pide al abrir el editor o
   * al restaurar `?compare=` (compareYear ya fijado → partición directa).
   */
  let open = $state(false);
</script>

{#if app.metrics && app.year !== null}
  <div class="compare">
    {#if app.compareYear === null && !open}
      <button class="invite" onclick={() => (open = true)}>
        <span class="invite-q">{t('compare.invite')}</span>
        <span class="invite-n">{t('compare.invite_note')}</span>
      </button>
    {:else}
      <Lazy
        loader={() => import('./CompareYear.svelte')}
        props={{ initialEditing: app.compareYear === null }}
      />
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
</style>
