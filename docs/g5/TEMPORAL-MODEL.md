# G5 · MODELO TEMPORAL — tres relojes, tres naturalezas

> Problema que resuelve (feedback humano 6/7): hoy el eje temporal
> catastral, las campañas de ortofoto y el mapa 1923–25 se presentan
> demasiado cerca/equivalentes, y una lectora normal no entiende por
> qué 1923–25 va aparte.

## Las tres naturalezas (nunca mezclarlas en un eje)

| Naturaleza | Qué es | Qué NO es | Dónde vive |
|------------|--------|-----------|------------|
| **Año de construcción** | dato catastral por edificio (`Ano_Constr`, año registrado) | una foto del pasado; incluye solo edificios que existen HOY | eje temporal + distribución + modos MAPA/TIEMPO |
| **Campaña de ortofoto** | año nominal de un vuelo/ensamblaje oficial | una fecha exacta de vuelo; una prueba de cuándo se construyó | modo FOTO (selectores de campaña) |
| **Mapa 1923–25** | cartografía oficial 1:25.000 levantada por hojas | una fotografía; una reconstrucción del parque | modo «Mapa 1923–25», standalone |

## Reglas congeladas

1. **Un solo eje temporal** en la interfaz, y solo lleva años de
   construcción (TU AÑO, OTRO AÑO, cabezal de reproducción, décadas).
   Ninguna marca de campaña de foto ni de cartografía aparece en él
   (GT1 — aserción DOM: `time.campaigns_note` y `.camp` desaparecen
   del eje).

2. **Las fotos se eligen dentro del modo FOTO** con su propio control
   (prev/next + etiquetas de campaña). El modo FOTO declara en su
   copy: «año nominal de campaña; la fecha real del vuelo puede
   diferir». Comprobar una foto no mueve el eje temporal ni el año
   personal.

3. **El mapa de 1923–25 es un modo aparte con nombre propio**
   («Mapa 1923–25»), no una fecha más. Su panel dice explícitamente:
   «Es un mapa dibujado por cartógrafos entre 1923 y 1925, no una
   fotografía. La fecha de cada hoja es nominal.» Va separado porque
   no es imagen ni dato de año: es otra naturaleza de evidencia.

4. **Jerarquía de lectura**: el eje temporal responde «cuándo consta
   terminado lo que existe hoy». Las fotos y el mapa responden
   «compruébalo con otras fuentes». Ninguna de ellas afirma nada
   sobre el año de construcción.

5. **Copy puente** (aparece una vez, junto al grupo de modos):
   «El tiempo de este producto es el año de construcción registrado.
   Las fotos y el mapa de 1923–25 son otras fuentes para comprobarlo
   con tus ojos — no miden fechas.»

## Estados y excepciones

- Modo TIEMPO: eje + reproducción; sin marcas de campaña.
- Modo FOTO: selectores de campaña prev/next, dos paneles o toggle.
  Las marcas de campaña desaparecen del eje temporal; su selección
  vive solo en este modo.
- Modo 1923–25: raster histórico bajo nada (sin overlay vectorial por
  defecto); salir vuelve a MAPA.
- Deep links: `view=photo&ortho=YYYY&ortho2=YYYY`,
  `view=hist`, `view=time&play=YYYY` — sin cambios de contrato.
