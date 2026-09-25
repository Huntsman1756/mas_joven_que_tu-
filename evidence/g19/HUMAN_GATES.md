# Gates humanos de cierre — build congelado

**SHA desplegado (gh-pages):** `5474c5a` — build de `ed4142e`
(G19-R4 cierre visual: clase única en Evolución + `orthoRender`).
Anterior: `0d6e868` (build de `4c7677d`).
URL: `https://huntsman1756.github.io/mas_joven_que_tu-/`

Smoke post-deploy (2026-09-26, en producción):

- `GET /` 200 — entry `app.Y8AcBEkn.js` (bundle de `ed4142e`)
- `GET /como-lo-sabemos` 200 · `GET /data/catalog.json` 200
- `Range` en `data/cells.pmtiles` → 206 · `data/buildings/048.pmtiles` → 206
- Boot funcional real (Playwright, producción): tabs
  `Por antigüedad | Evolución | Fotos aéreas | Mapa 1923–25 | Antes / ahora`,
  `mode=map`, `orthoRender=IDLE`, sin pageerrors.

Desarrollo congelado: sin cambios de cosmética, copy ni dependencias
sobre este build. Si aparece un bloqueo real → fix mínimo + repetir
solo el gate afectado + smoke relacionado. Detalles cosméticos menores
→ documentar aquí, sin ronda de rediseño.

**Identidad de artefactos congelada:**

- producto fuente: `ed4142e`
- rama con documentación/evidencias: `4d6e62b`
- producción evaluada: `gh-pages 5474c5a`

**Regla de cambio:** solo un finding reproducible del test de
comprensión (5 s), NVDA, móvil físico o producción justifica tocar el
producto. Comentarios estéticos no son findings.

**Orden de los controles restantes:** ① test de 5 s (3 personas) →
② NVDA real → ③ móvil físico (Wi-Fi + datos). Si el ① revela
confusión de modos, ②/③ se repiten tras el fix. Si los tres pasan:
commit documental con resultados, este archivo se cierra y se crea el
tag/release final.

---

## Gate A — NVDA real (producción)

| Campo | Valor |
| --- | --- |
| Fecha | |
| Dispositivo / OS | |
| Navegador + versión | |
| NVDA versión | |
| SHA verificado | `5474c5a` |

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
| SHA verificado | `5474c5a` |

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
