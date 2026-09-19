# G4-R · FIRST-10 — auditoría de los primeros 10 segundos

Método: inspección de capturas del atlas (`01-intro`, `05-result-ready`)
sin conocimiento del repo, en 1440×900 y 390×844.

## Pantalla inicial (intro)

**A los 3 s** se entiende: «Más joven que tú» + la pregunta «¿Qué parte
de la Bizkaia que ves hoy apareció después que tú?» + dos campos (año,
lugar) + CTA. **Qué es**: un mapa personalizado. **Qué pido**: mi año +
mi pueblo. **Qué obtengo**: «qué edificios actuales se terminaron
después». Nada exige conocimiento previo. Desktop y 390 igual de
claros — la intro es el mejor 3-segundos del producto.

**A los 10 s:** el usuario ya escribió el año y ve el listbox de
municipios. Única fricción: Enter no compromete (BUG-04) — el usuario
teclea «Bilbao», pulsa Enter y nada pasa hasta elegir con flecha o clic.

## Primera pantalla de resultado

**A los 3 s** se entiende: «Eres mayor que una parte de los edificios
que hoy forman Leioa» — la respuesta personalizada en segunda persona,
inmediata. Debajo: la cifra «47,6 de cada 100… después de 1987». El mapa
empieza a verse.

**A los 10 s:** la página muestra headline + 4 líneas de
cobertura/cálculo/área + switch + mapa + leyenda + «Ver datos de esta
zona» + el timeline asomando con Reproducir/Reiniciar.

### Lo que compite por atención en esos 10 s (medido: 10 acciones)

1. Cambiar año o lugar · 2. Compartir · 3–5. MAPA/TIEMPO/FOTO ·
6. «Ver datos de esta zona» · 7–8. zoom ± · 9–10. Reproducir/Reiniciar
   (asoman si el timeline entra en viewport).

Diagnóstico: **la recompensa se entiende, pero el siguiente paso no**.
Nada dice «ahora pulsa TIEMPO» ni «prueba tu calle». El primer scroll
es un salto de fe: aparece la distribución (¿para qué?) y luego tres
botones oscuros seguidos (¿cuál primero?).

### Lo que requiere conocimiento previo

- «Campaña» (marcas del eje) — técnico, no explicado en superficie.
- «FOTO» como modo — el usuario espera que el mapa se vuelva foto; en
  realidad se añade un panel abajo (verificado en atlas).
- «Huella en planta» — se explica en línea, bien, pero dos veces.
- «¿Cómo se calcula?» plegado — bien.
- El significado de los colores del mapa — la leyenda lo resuelve.

### En 390×844

El titular ocupa más (321 px), el mapa 441 px: la recompensa llega
íntegra en el primer viewport + asomo de timeline. Bien. El problema es
el mismo: tras la recompensa, la invitación siguiente no existe hasta
el tercer viewport («¿Quieres bajar hasta tu calle?»).

## Veredicto first-10

- **Qué es + qué pido + qué obtengo: PASS** — la propuesta se entiende
  sin ayuda, mejor que la mayoría del benchmark.
- **Qué hago después: FAIL parcial** — hay 10 acciones y ninguna es «la
  siguiente». La regla G4: un solo next-action obvio por tramo.
- **Por qué es interesante: PASS** — segunda persona + evidencia real.
