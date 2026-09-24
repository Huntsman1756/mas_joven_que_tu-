# Gates humanos de cierre — build congelado

**SHA desplegado (gh-pages):** `0d6e868` — build de `4c7677d`
(adjudicación visual G19). Los commits posteriores de la rama
(`b78bad4`, `e68cbb0`) solo tocan harness/docs: el producto desplegado
es idéntico al contenido de `4c7677d`.
URL: `https://huntsman1756.github.io/mas_joven_que_tu-/`

Desarrollo congelado: sin cambios de cosmética, copy ni dependencias
sobre este build. Si aparece un bloqueo real → fix mínimo + repetir
solo el gate afectado + smoke relacionado. Detalles cosméticos menores
→ documentar aquí, sin ronda de rediseño.

---

## Gate A — NVDA real (producción)

| Campo | Valor |
| --- | --- |
| Fecha | |
| Dispositivo / OS | |
| Navegador + versión | |
| NVDA versión | |
| SHA verificado | `0d6e868` |

Recorrido (anunciar en voz alta lo leído):

- [ ] Portada: título, formulario año+lugar, envío.
- [ ] Búsqueda NORA: opciones anunciadas, selección, confirmación.
- [ ] Resultado (modo map): orden de lectura = titular → apoyo → mapa.
- [ ] Cambio a cada uno de los 5 modos: foco tras el cambio, nombre del
      modo anunciado, sin pérdida de contexto.
- [ ] Evolución: play/pausa anunciado, año grande (aria-live), scrubber
      con `aria-valuetext`, pasos ±1 si reduced-motion.
- [ ] Fotos aéreas: ◀ ▶ campaña, año grande, marcas del eje no leídas
      como ruido (aria-hidden), ⓘ «Fuente y detalles» abre popover y su
      contenido se lee completo (editor, vuelo real, licencia).
- [ ] Antes/ahora: cortina con slider accesible, chips honestos.
- [ ] «Cambiar año o lugar»: editor con errores asociados al campo.
- [ ] Mapa: el canvas no genera ruido (aria-label propio, sin volcado
      de features).
- [ ] Copiar enlace: estado/confirmación anunciada.

Resultado: PASS / BLOCKED / detalles →

## Gate B — móvil físico (producción)

| Campo | Valor |
| --- | --- |
| Fecha | |
| Dispositivo + OS | |
| Navegador + versión | |
| SHA verificado | `0d6e868` |

- [ ] Flujo completo táctil: búsqueda → resultado → modos.
- [ ] Chrome temporal como bottom bar sobre el lienzo (no sección debajo).
- [ ] Drag/snap del rail de campañas con el dedo; prev/next por toque.
- [ ] Swipe antes/ahora: cortina arrastrable, chips legibles.
- [ ] Menú «Vista · modo»: abre, selecciona, Esc/cierre, checked state.
- [ ] Zoom/pan del mapa con gestos; controles ± alcanzables (≥44px).
- [ ] Back/forward del navegador restaura modos y búsquedas.
- [ ] «Copiar enlace» funciona y pega la URL con estado.
- [ ] Rotación vertical↔horizontal sin romper el layout.
- [ ] Tamaño de fuente del sistema aumentado: sin cortes críticos.
- [ ] **Red móvil real (no solo Wi-Fi)**: estados de carga de ortofoto
      comprensibles con latencia; sondas/probing no dejan la vista en
      ambigüedad; textos de estado («Comprobando…», no-cobertura,
      reintento) legibles y honestos.

Resultado: PASS / BLOCKED / detalles →

---

## Incidencias observadas

| # | Gate | Descripción | Severidad (bloqueo/cosmético) | Resolución |
| --- | --- | --- | --- | --- |
