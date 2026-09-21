<script lang="ts">
  // G11.3: tokens, reset y estilos globales compartidos por TODAS las
  // rutas — /como-lo-sabemos debe verse igual entrando directo que
  // navegando desde portada (antes dependían de haber cargado +page).
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { locale } from '$lib/i18n/lang.svelte';

  let { children }: { children: Snippet } = $props();

  // <html lang> sigue al locale; se persiste para que una visita
  // recurrente cargue directamente en el idioma elegido, y se resincroniza
  // el announcer de ruta con el <title> activo (de otro modo conserva el
  // texto del idioma de la hidratación). Vive en el layout para que la
  // preferencia aplique también a rutas sin selector propio.
  let langInit = false;
  $effect(() => {
    if (!langInit) {
      langInit = true;
      // El acceso a storage puede lanzar (modo restringido, cookies
      // bloqueadas): una preferencia no debe comprometer la carga.
      try {
        const saved = localStorage.getItem('mjt-lang');
        if (saved === 'es' || saved === 'eu') locale.lang = saved;
      } catch {
        /* sin storage → idioma por defecto */
      }
    }
    document.documentElement.lang = locale.lang;
    try {
      localStorage.setItem('mjt-lang', locale.lang);
    } catch {
      /* sin storage */
    }
    queueMicrotask(() => {
      const ann = document.getElementById('svelte-announcer');
      if (ann && ann.textContent !== document.title) ann.textContent = document.title;
    });
  });
</script>

{@render children()}
