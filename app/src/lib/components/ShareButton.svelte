<script lang="ts">
  import { t } from '$lib/i18n/t';
  let done = $state(false);
  let err = $state(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      done = true;
      err = false;
      setTimeout(() => (done = false), 3500);
    } catch {
      err = true;
    }
  }
</script>

<button class="share" onclick={share}>{t('share.label')}</button>
{#if done}<p class="ok" role="status">{t('share.done')}</p>{/if}
{#if err}<p class="err" role="alert">{t('share.error')}</p>{/if}

<style>
  .share {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.35rem 0.8rem;
    border-radius: 8px;
    border: 1px solid #b9b5aa;
    background: #fff;
    color: #44423c;
    cursor: pointer;
  }
  .ok,
  .err {
    font-size: 0.75rem;
    margin: 0.2rem 0 0;
  }
  .ok {
    color: #2e6b34;
  }
  .err {
    color: #7a1f2e;
  }
</style>
