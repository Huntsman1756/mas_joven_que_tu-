<script lang="ts">
  import { t } from '$lib/i18n/t';
  import { Link } from '@lucide/svelte';
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

<button class="share" onclick={share}>
  <Link size={14} strokeWidth={2} aria-hidden="true" />{t('share.label')}
</button>
{#if done}<p class="ok" role="status">{t('share.done')}</p>{/if}
{#if err}<p class="err" role="alert">{t('share.error')}</p>{/if}

<style>
  /* G19-R4: chrome ligero — borde fino, sin caja blanca, misma altura
     que Cambiar/idioma; hitbox ≥44px conservado */
  .share {
    font: inherit;
    font-size: 0.78rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    min-height: 44px;
  }
  .share:hover {
    border-color: var(--ink-3);
    color: var(--ink);
  }
  .ok,
  .err {
    font-size: 0.75rem;
    margin: 0.2rem 0 0;
  }
  .ok {
    color: var(--topo);
  }
  .err {
    color: var(--accent-deep);
  }
</style>
