# ADR-010: Worker de MapLibre GL v6 servido desde `static/vendor/`

- Estado: aceptada
- Fecha: 2026-10-XX
- Contexto: con el build de Vite/SvelteKit el mapa inicializaba sin errores y las
  peticiones PMTiles devolvían `206`, pero ninguna tesela vectorial llegaba a
  renderizarse (todas en estado `loading`, sin errores de consola).

## Diagnóstico

MapLibre GL v6 crea sus workers con
`new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Cuando `maplibre-gl.mjs`
va bundlado dentro de un chunk (`_app/immutable/chunks/*.js`), esa URL relativa
apunta a `_app/immutable/chunks/maplibre-gl-worker.mjs`, que no existe. El
servidor estático responde con el fallback SPA `index.html` (`text/html`), el
navegador descarta el worker por MIME incorrecto y **falla en silencio**: los
mensajes `loadTile` quedan pendientes para siempre y `addProtocol` nunca recibe
las peticiones de tesela (el TileJSON sí funciona porque se pide en el hilo
principal).

## Decisión

1. `app/scripts/copy-maplibre-worker.mjs` copia `maplibre-gl-worker.mjs` y
   `maplibre-gl-shared.mjs` (importación relativa del worker) desde
   `node_modules/maplibre-gl/dist/` a `static/vendor/`, enganchado a
   `predev`/`prebuild`, de modo que la versión servida es siempre la instalada.
2. `MapView.svelte` llama `maplibregl.setWorkerUrl(<base>/vendor/maplibre-gl-worker.mjs)`
   antes de crear el mapa.
3. `static/vendor/` está gitignored (artefacto generado) y excluido de ESLint.

## Alternativas consideradas

- `import '…/maplibre-gl-worker.mjs?url'`: Vite emite el asset tal cual, pero el
  `import './maplibre-gl-shared.mjs'` interno del worker seguiría sin existir.
- `?worker` de Vite: devuelve un constructor, no una URL utilizable por
  `setWorkerUrl`, y duplicaría la cadena de workers.
- Blob/inline del worker: requiere embeber también `shared` y rompería la
  política de contenido si el despliegue endurece CSP.

## Consecuencias

- El build estático funciona en cualquier hosting con HTTP Range; el worker se
  sirve como asset más.
- Si se actualiza `maplibre-gl`, el worker copiado se regenera en cada
  `dev`/`build` y siempre casa con la versión de `package.json`.
