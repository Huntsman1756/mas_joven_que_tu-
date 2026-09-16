# ADR-002 — SvelteKit con adaptador estático

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

El producto debe ser estático (sin backend propio), con buena ergonomía para mapas,
i18n desde el inicio y renderizado rápido. Candidatos: SvelteKit, Next.js, Astro + islas.

## Decisión

Usar **SvelteKit + TypeScript + Vite** con **adaptador estático**.

## Motivos

- Salida 100 % estática: desplegable en cualquier hosting de ficheros.
- Excelente integración con MapLibre (ciclo de vida de componentes) sin cargar React.
- Es el stack de referencias modernas de edificios por año (Bert Spaan), lo que reduce
  incertidumbre técnica.
- i18n y rutas (`/explorar`, `/tiempo`, `/historias`, `/como-lo-sabemos`) nativas.
- Licencia MIT.

## Alternativas consideradas

- **Next.js:** mayor peso, más orientado a backend/SSR; innecesario aquí. `REJECT`.
- **Astro:** bueno para contenido, pero el producto es una app de mapa muy interactiva;
  la hidratación de islas añade fricción. `REJECT (por ahora)`.

## Consecuencias

- Todo el estado relevante vive en la URL.
- La búsqueda (NORA) y las ortofotos se consumen directamente desde el cliente (CORS verificado).
- Sin servidor de API propio.
