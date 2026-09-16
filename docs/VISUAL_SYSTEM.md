# VISUAL_SYSTEM — mapa, color, tipografía, timeline, motion

> No copiamos la identidad gráfica de los proyectos de referencia
> (ver `docs/INSPIRATION.md`). Definimos nuestro propio sistema.

## 1. Jerarquía visual

```
1. Mapa (raster oficial + capa de edificios)
2. Titular personalizado (la respuesta a la pregunta)
3. Cifra principal + cobertura
4. Histograma / timeline
5. Contexto y metodología (disclosure)
```

## 2. Color semántico (invariante en todo el producto)

El color **codifica el estado temporal**, no la estética:

| Estado | Semántica | Requisito |
|--------|-----------|-----------|
| `BEFORE` (`≤ Y`) | Ya existía | Color base apagado |
| `AFTER` (`> Y`) | Terminado después de tu año | Color de acento, mayor prominencia |
| `UNKNOWN` | Año no consta | Tercer color/patrón propio, **nunca** igual que `BEFORE` |
| Ortofoto de fondo | Evidencia visual | Saturación controlada para no competir con los datos |

Reglas:

- **No depender solo del color**: `UNKNOWN` lleva además patrón (trama) y etiqueta.
- La paleta debe ser **perceptualmente uniforme** y accesible (contraste AA sobre el mapa).
- `UNKNOWN` es visualmente distinguible en escala de grises.
- No se reutilizan automáticamente las paletas de Urban Layers / Bert Spaan.

> `PENDING`: elección final de paleta, validada con contraste medido y prueba en
> daltonismo (protanopía/deuteranopía) durante G0/G1. Candidatas a evaluar: paletas
> secuenciales accesibles (p. ej. esquemas tipo viridis/cividis o rampas propias).

## 3. Tipografía

- Titulares: familia editorial con buen peso, legible en móvil.
- Cuerpo: sans legible, tamaño base ≥ 16 px.
- Cifras: tabulares (para que no "bailen" al animar).
- El texto nunca se superpone al mapa sin fondo/velo que garantice contraste.

## 4. Histograma / timeline

- Barras por año o década; altura = nº de edificios actuales con año conocido.
- Línea vertical clara marcando el año elegido `Y`.
- Segmentación de color por estado (`BEFORE` / `AFTER` / `UNKNOWN`).
- Etiqueta del denominador visible: «sobre {known} edificios con año conocido».
- El eje X siempre etiquetado con la unidad «año».

## 5. Mapa

- Zoom bajo/medio: agregados (municipio/celda) — nunca miles de polígonos individuales.
- Zoom urbano: edificios individuales.
- La leyenda está siempre accesible y sincronizada con el estado.
- En comparación: divisoria de swipe visible, con etiquetas de campaña en cada lado.

## 6. Motion

- Animaciones **funcionales** (transición de filtro, cambio de campaña), no decorativas.
- `prefers-reduced-motion`: sustituir animación por cambio instantáneo + texto de estado.
- El autoplay de la serie es opcional y siempre detenible.
- Duración corta; nada que retrase la comprensión.

## 7. Estados de interfaz

| Estado | Representación |
|--------|----------------|
| Cargando datos locales | Skeleton discreto |
| Ortofoto oficial lenta | Placeholder con mensaje, resto de la UI operativa |
| Ortofoto caída | Mensaje + mantener mapa base |
| Sin cobertura de dato | Aviso ámbar junto a la estadística |
| Selección | Resalte con contraste y foco visible |

## 8. Iconografía y affordances

- `¿Cómo se calcula?` = icono discreto junto a la cifra, abre la explicación en línea.
- Sin iconos que no aporten significado.
- Todos los controles con estado de foco visible (teclado).

## 9. Responsive visual

- Móvil: bottom sheet, tipografía escalada, leyenda colapsable.
- Desktop: paneles flotantes contenidos.
- Probar portrait y landscape; sin solapamientos con `safe-area`.

## 10. Accesibilidad visual

Ver `docs/ACCESSIBILITY.md` para contraste mínimo, foco y alternativas textuales.
Ninguna decisión visual puede invalidar un requisito de accesibilidad.

---

# G1 — Sistema visual de «Tu Bizkaia»

## 11. Semántica antes que color

La semántica se congela aquí; los valores definitivos se eligen y se **justifican** al
implementar, con contraste medido y prueba en daltonismo. **No se copian paletas de
proyectos de referencia por tradición.**

| Rol semántico | Significado | Prioridad visual |
|---------------|-------------|------------------|
| `AFTER` | terminado después del año del usuario | **protagonista** |
| `BEFORE` | ya existía ese año | contexto, apagado |
| `NO_YEAR` | sin dato o año anómalo | ni protagonista ni fondo |
| `CELL_LOW_N` | celda con < 15 edificios con año | marca de fiabilidad |
| `SELECTED` | edificio o elemento activo | contraste máximo |
| `HOVER` | resalte transitorio | subordinado a `SELECTED` |
| `MAP_BG` | fondo del mapa | nunca compite |

Reglas duras:

- `AFTER` es el **único** color de acento saturado del mapa.
- `NO_YEAR` **no** puede ser igual que `BEFORE` ni confundirse con el fondo.
- **`MAP_BG` nunca es un color de dato.**
- `SELECTED` no puede ser sólo un cambio de color: añade grosor de trazo.

## 12. Redundancia no cromática (obligatoria)

| Clase | Recurso no cromático |
|-------|----------------------|
| `NO_YEAR` | trama discontinua (diagonal) |
| `CELL_LOW_N` | contorno discontinuo + nota en tooltip |
| `SELECTED` | trazo grueso `SELECTED` |
| `AFTER` / `BEFORE` | además del color, la **leyenda** y el **titular** enuncian la distinción |

Debe existir una prueba de escala de grises: `NO_YEAR` sigue siendo distinguible sin color.

## 13. Jerarquía por nivel de escala

| Nivel | Geometría | Relleno | Trazo | Etiqueta |
|-------|-----------|---------|-------|----------|
| Bizkaia | municipios | coroplético discreto | fino | nombre de municipio a partir de z7 |
| Celda | rejilla 500 m | cuota `C-05` (rampa secuencial) | blanco 0,6 px | — |
| Edificio | polígono | clase temporal | — | — |

- **Un solo rango de color con significado temporal** por nivel; el mapa no mezcla dos
  codificaciones a la vez.
- Los umbrales de zoom están congelados en `docs/design/G1-TU-BIZKAIA.md` §6.

## 14. Tipografía y jerarquía editorial

| Rol | Tratamiento |
|-----|-------------|
| Titular personal | serif, 1.ª persona, tamaño grande, máximo 3 líneas |
| Cifra | **numerales tabulares**, peso alto, misma línea que el enunciado |
| Denominador / cobertura | sans, cuerpo menor, **contiguo a la cifra** |
| Etiquetas de gráfico | sans, 12 px, versalitas |
| Notas metodológicas | sans, 13 px, color atenuado |

- El dato domina: no hay tipografía decorativa, ni degradados, ni sombras ornamentales.
- Las cifras nunca bailan: numerales tabulares en todo el producto.

## 15. Densidad y superficies

- Máximo **una** visualización principal por banda.
- El mapa ocupa **banda propia a sangre**; el resto respira.
- Sin tarjetas anidadas, sin rejillas de KPI, sin bordes decorativos.

## 16. Movimiento

| Permitido | Prohibido por defecto |
|-----------|------------------------|
| transición de año (repintado rápido) | partículas, confeti |
| aparición/desvanecido de capa al cambiar de escala | parallax decorativo |
| `flyTo` corto al elegir municipio (≤ 600 ms) | animación permanente |
| transición de la leyenda | scrolljacking |
| swipe de ortofoto | autoplay no solicitado |

`prefers-reduced-motion`: **sin** animación de cámara (se usa `jumpTo`), sin transiciones
obligatorias; la información se actualiza igual y se anuncia por `aria-live`.

## 17. Móvil

- Un solo eje vertical; hoja inferior para distribución y detalle.
- Sin panel lateral fijo. Objetivos táctiles ≥ 44 × 44 px.
- La leyenda es colapsable pero **nunca** desaparece del todo (no depender del color).
- Los wireframes de referencia están en `docs/design/wireframes/`.
