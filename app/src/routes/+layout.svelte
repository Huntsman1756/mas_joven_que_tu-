<script lang="ts">
  // G11.3: tokens, reset y estilos globales compartidos por TODAS las
  // rutas — /como-lo-sabemos debe verse igual entrando directo que
  // navegando desde portada (antes dependían de haber cargado +page).
  import '../app.css';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
