# ADR-024 — Semántica de modo y aislamiento de estado (G19-R4)

## Contexto

G19-R3 unificó la geometría y el `HistoricalTimePlayer`, pero la revisión
visual mostró dos problemas de fondo:

1. **Ambigüedad semántica**: «Edificios» y «Evolución» no se diferenciaban
   con claridad — a nivel de zoom municipal ambos eran un coropleto rojo, y
   el primer frame de Evolución (cabezal anclado al año personal) parecía
   idéntico al modo por defecto.
2. **Fuga de estado temporal**: `playYear` persistía al salir de Evolución
   (por diseño, para restaurar al volver), pero ese valor seguía pintando
   en otros modos: el filtro `playCond` ocultaba edificios posteriores en
   `map`, las celdas proyectaban la cuota `until`, la leyenda decía «ya
   construidos en {playYear}» y el propio reproductor se montaba en
   Edificios cuando `playYear !== null`. El usuario intuía «capas stale».
3. **Heatmap como fondo de evidencia**: en `photo` sin campaña activada
   (entrar por tab no pide red — opt-in deliberado) el mapa mostraba las
   capas de edad porque `applyEvidenceVisibility` solo ocultaba datos
   cuando existía un raster montado.

## Decisión

1. **`app.playActive`**: `mode === 'time' && playYear !== null`. Toda la
   superficie temporal se gobierna por ese derivado — filtro de
   edificios, cuota `until`, leyendas, montaje del player, serialización
   de `play=` en el URL. `playYear` sigue persistiendo en estado (la
   restauración al volver a Evolución se conserva), pero nunca es una
   vista fuera de `time`. `play=` sin `view=` en deep link implica `time`.
2. **`applyEvidenceVisibility` decide por modo**: en `photo`, `hist` y
   `swipe` las capas de datos de edad están ocultas siempre, con o sin
   raster. La espera de campaña en Fotos es base limpia + boundary +
   player discreto — nunca el heatmap.
3. **Renombre de `view.map`**: «Edificios» → «Por antigüedad» (el modo
   interno sigue siendo `map`; solo cambia la etiqueta visible).
4. **ModeIntroSlot** pasa a título + una frase por modo, con copy que
   declara la pregunta exacta de cada modo.
5. **`.stage` a plena primera pantalla en desktop** para que `.below`
   (lazy chunk) empiece siempre bajo el pliegue — el sentinel de
   `LazyView` no puede dispararse por píxeles de borde.
6. Chrome global ligero: botones de topbar con icono + texto corto,
   `map.cell.inspect` corto con detalle en `title`, titular ~10 % menor.

## Consecuencias

- El invariante `tab == mode == URL == capas == player-mode` es
  verificable y queda bloqueado por `scripts/mode_isolation.mjs`.
- A nivel edificio `map` y `time` difieren siempre: en `map` los
  posteriores a `year` son bermellón; en `time` los posteriores a
  `playYear` no existen en el lienzo (evidencia:
  `evidence/g19r4/buildings-map-vs-time.json`).
- `g2b_views` conserva `rule_playYear_persists`: el valor persiste en
  estado — lo que ya no hace es pintar fuera de Evolución.
- Ningún dato ni métrica cambió: solo el gobierno del estado de vista.
