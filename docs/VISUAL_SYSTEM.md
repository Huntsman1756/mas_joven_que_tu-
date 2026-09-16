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
