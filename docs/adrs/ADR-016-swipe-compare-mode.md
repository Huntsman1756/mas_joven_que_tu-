# ADR-016 — Modo comparador «1956 / hoy» con cortina (swipe)

- **Estado:** aceptado
- **Fecha:** 2026-09-20
- **Contexto:** petición explícita post-G5 de una vista antes/después con
  slider para mostrar el cambio urbano de Bizkaia, sin sustituir la
  experiencia actual.

## Contexto

G5-E (GV3, `docs/gates/G5.md`) descartó el swipe **para la comparación de
campañas dentro de FOTO**: allí el usuario compara dos campañas del mismo
flujo editorial y se optó por dúo lado a lado (`CompareMap`) / toggle en
estrecho. `maplibre-gl-swipe` se eliminó como dependencia muerta (GP4).

La nueva petición es distinta: un **modo propio** que enfrenta siempre la
primera campaña del catálogo (1956) con la última («hoy»), como forma
adicional de «comprobar con otras fuentes». No reemplaza FOTO ni su dúo.

## Decisión

1. **Quinto modo de escena:** `app.mode` admite `'swipe'`, serializado como
   `?view=swipe` (ADR-013/015 intactos: mismo invariante de vista, misma
   exclusividad de escena).

2. **Lienzo principal = «hoy».** Entrar en `swipe` activa la última campaña
   del catálogo sobre el `MapView` existente, reutilizando toda la
   maquinaria `orthoCampaign`/`orthoVisible`/`orthoState` + sonda
   `probeOrtho` (optimista, fail-closed, procedencia visible).

3. **Overlay = «antes».** `SwipeCompare.svelte` monta un segundo `Map`
   MapLibre **no interactivo** con solo la campaña 1956 (preview
   first-party + raster), sincronizado unidireccionalmente desde
   `mapSync.main` (mismo patrón que `CompareMap`). Se recorta con
   `clip-path: inset(0 X% 0 0)` — sin WebGL extra ni plugin.

4. **Componente propio, sin dependencia.** El patrón clip-path + slider es
   ~50 líneas; reintroducir `maplibre-gl-swipe` (ya eliminada) aporta menos
   que su coste de mantenimiento.

5. **Control único con semántica.** El divisor es `role="slider"` con
   `aria-valuemin/max/now`, teclado (←/→/↑/↓ paso 2, ⇧ paso 10, Inicio/Fin)
   y pointer events solo en el handle de 44 px (`touch-action: none`):
   el resto del lienzo sigue panéando el mapa — sin captura global de
   gestos.

6. **Sonda propia del «antes».** `probeCampaign` verifica contenido real
   de 1956 en el lugar antes de mostrar la cortina; si falla, el overlay
   queda oculto y se informa con `role="status"` — nunca un recorte
   vacío silencioso.

7. **Lazy real.** `SwipeCompare` carga por `import()` dinámico solo en
   `mode === 'swipe'`; registrado en los contratos `perf4_lazy_contract` y
   `perf4_critical_path_contract` (0 peticiones antes de readiness).

8. **Montaje dentro del lienzo (G16c).** El comparador se renderiza como
   snippet `overlay` de `MapView`, **dentro de `.mapwrap`**: hereda la
   caja exacta del canvas y su `overflow:hidden`. Montarlo sobre
   `.mapcell` lo desbordaba por debajo del mapa en móvil (la celda incluye
   leyenda y controles en flujo) e interceptaba toques — regresión
   `swipe_box_eq_canvas` / `legend_below_canvas`.

## Consecuencias

- GV3 (FOTO sin swipe) **sigue siendo válido**: el dúo de campañas no usa
  cortina; el swipe es un modo aparte con ámbito fijo (primera vs última).
- El modo swipe no añade métricas ni fechas derivadas: es evidencia visual
  (GV4), con atribución dual explícita (Open Data Bizkaia + geoEuskadi).
- El estado de la cortina (`pct`) no se serializa en URL: es efímero de
  sesión, como la posición de scroll.
- Cobertura 1956 ≠ cobertura actual: donde el vuelo de 1956 no tiene
  imagen, el overlay muestra fondo papel — es la evidencia real, no un hueco
  inventado.
