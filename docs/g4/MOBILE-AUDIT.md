# G4-R · MOBILE-AUDIT — 320/360/390/430 (no solo overflow)

Evidencia: `state-atlas/41-fullpage-w390.png`, `atlas.json` (w320/w390
capturados; 360/430 interpolables — misma clase de layout ≤700px).

## Medidas reales (390×844)

- Altura total resultado: **2491 px ≈ 3,0 viewports**.
- Primer viewport: headline 321 px + inicio del mapa — la recompensa
  llega íntegra.
- Mapa: 441 px ≈ 52 % del viewport — protagonista correcto.
- Timeline: 218 px con 18 acciones potenciales en su zona.
- `.sheet` móvil: ~1390 px de contenido seguido (dist 240 → caveat 41).

## Inventario por viewport (390)

| Viewport | Contenido | Acción primaria | ¿Una sola? |
|----------|-----------|-----------------|-----------|
| 1 | headline + cifra + cobertura | ninguna (leer) + topbar×2 | 🔶 topbar compite |
| 2 | switch + mapa + «Ver datos» + zoom | explorar mapa | 🔶 4 acciones de mapa |
| 3 | timeline (Reproducir/Reiniciar/eje/marcas) + caption + inicio dist | Reproducir | 🔶 marcas = acciones ocultas |
| 4 | dist + propuesta ortofoto + propuesta histórico | «Ver la foto» + «Ver 1923-25» | ❌ 2 CTAs oscuros juntos |
| 5 | MI EDIFICIO + DOS AÑOS + contraste | «Buscar una dirección» + «Añade otro año» | ❌ 2 invitaciones |
| 6 | planning + caveat + footer | leer | ✅ |

**Violaciones de la regla «1 acción primaria por viewport»:** 2
violaciones claras (vp4 y vp5) + 2 zonas grises (vp1 topbar, vp3
timeline denso). En 320px el apilamiento empeora: los dos CTAs opt-in
quedan casi consecutivos.

## Detalles móviles

- **Thumb reach**: los controles del mapa (zoom, «Ver datos») están
  arriba — fuera del pulgar pero son controles de mapa (convención).
- **Timeline**: en 390 las marcas de campaña con etiqueta compiten con
  el eje de décadas — la función de marca (llevar a la foto) es
  invisible hasta usarla (descubribilidad baja, no error).
- **MI EDIFICIO abierto en móvil**: inputs calle/portal/bis + submit +
  links — el flujo es el tramo más denso del producto; correcto al
  estar plegado por defecto.
- **FOTO en móvil**: el panel aparece bajo el mapa — el switch promete
  «ver la foto» pero hay que hacer scroll para encontrarla.
- **Portales variantes**: lista de opciones funciona (atlas 18/19/20).
- **Bottom**: planning editorial lee bien; caveat + footer limpios.

## Lo que funciona (no tocar)

- Hero móvil: 2 campos + CTA — ejemplar.
- Recompensa completa en el primer viewport.
- 44px verificado en gates; reflow 320 sin overflow; 400% zoom.
- Mapa 52svh: altura correcta para operar con una mano.

## Cambios que G4 debe hacer para móvil (documento)

1. Separar los dos opt-ins de evidencia (foto/histórico) — nunca dos
   CTAs oscuros seguidos (resuelto por el contrato de escena: dejan de
   ser secciones).
2. Juntar las dos invitaciones personales en un solo tramo de acción
   con una sola jerarquía (CUT B).
3. Distribución plegable o más corta en ≤430px (contexto, no cifra).
4. El asomo del siguiente tramo debe enseñar UNA invitación, no una
   lista (regla de composición, no de CSS).
