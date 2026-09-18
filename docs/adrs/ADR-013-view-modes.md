# ADR-013 — Vistas MAPA·TIEMPO·FOTO sobre la misma escena

- **Estado:** aceptado
- **Fecha:** 2026-09-18
- **Preregistrado en:** `docs/gates/G2.md` §STATE · `docs/G2-DIRECTION.md` §5

## Contexto

`G2-DIRECTION.md` fija el principio MAPA · TIEMPO · FOTO: tres maneras de
contestar la misma pregunta (¿dónde? ¿cuándo? ¿cómo se ve?), no tres
aplicaciones. G2-B lo convierte en modelo explícito sin duplicar stores ni
romper el invariante T1 de ADR-012.

## Decisión

1. **`app.mode: 'map' | 'time' | 'photo'`** en `AppState`; serializado como
   `?view=` (ausente = `map`, la vista por defecto — URLs limpias).

2. **Invariante de vista:** cambiar de vista nunca toca `place`, `year`,
   cámara (`view` centro/zoom), ni ortofoto activa. El único efecto es de
   composición: qué banda encabeza la ficha.

3. **Regla determinista para `playYear`:** persiste al cambiar de vista.
   Entrar en `time` sin cabezal lo ancla pausado a `selected_year`
   (`ViewSwitch.setMode`) — TIEMPO tiene contenido propio desde el primer
   instante sin autoplay.

4. **FOTO no implica petición:** entrar en `photo` muestra el `PhotoPanel`
   con la campaña en contexto (activada, o la más cercana al año) y su
   procedencia; la imagen solo se pide al activar una campaña — clic en
   «Comprobar desde el aire», prev/next, marca del timeline o `?ortho=` —
   siempre por `activateOrtho`, que sondea exactamente la campaña pedida.

5. **Sonda única a nivel de módulo** (`ortho-probe.svelte.ts`): secuencia +
   AbortController compartidos entre `OrthoControls`, `Timeline` y
   `PhotoPanel`. «Última sonda gana» es global, no por componente.

6. **Prev/next de campaña:** adyacentes exactos del catálogo ordenado; los
   extremos se deshabilitan; `NOT_COVERED` se muestra como tal — jamás se
   salta a otra campaña en silencio.

7. **Contraste C-05/C-08:** sección propia con ambos denominadores
   explícitos; proyección de constantes canónicas, sin métrica nueva ni
   interpretación («dispersión», «densificación» están prohibidos).

## Consecuencias

- `?place=&year=&view=` reproduce la vista; `back/forward` funciona vía
  `applyUrl` en `popstate`.
- Cambio de `place` resetea `mode` a `'map'` (la sonda es por lugar).
- El hitbox de 44 px y el tick visual de las marcas de campaña quedan
  separados: A3 se mantiene sin tapar el eje a 320 px.
