# Cinco cambios con mayor retorno

No implementados. Prioridad por efecto en entrega y criterios de Base 10.a, no por interés técnico.

| Orden | Bloque | Criterio y evidencia de debilidad | Alternativa demostrada | Esfuerzo/riesgo | Aceptación propuesta para FASE B |
|---|---|---|---|---|---|
|1|Release única verificable (RT01/02/13)|D25/U10/Rg 25: SHA distinto, CI rojo, gates reales pendientes|Atribución inmutable y ensayo de la URL que recibirá el jurado|M/MED|Mismo SHA producto, artefacto, memoria y URL; falloCI adjudicado; Safari/NVDA con evidencia real o limitación explícitamente aceptada, nunca PASS inventado|
|2|Entrada coherente en Fotos (RT03)|D25/C25/U10: lienzo vacío 1945 en producción y local|IGN ejemplo directo; Swisstopo capa marcada con contenido|S/MED|Tab, CTA y deep link coinciden en campaña/imagen/estado; no red extra antes de opt-in; errores y sin cobertura distinguidos|
|3|Verdad en cifras/unidades/compartir (RT04/05/11)|Rg 25/C25:0% «exacto» con 1/3528; huella 1,9 sin unidad; enlace con datos contextuales|Recuentos trazados y unidades explícitas del propio contrato|S/LOW|Extremos no se leen como cero real;1,9%; descripción exacta de campos URL; ES/EU coherentes|
|4|Recorrido editorial breve dentro de la visualización (RT06)|C25/I15: hallazgo principal oculto tras bloques secundarios|Avispa: tesis visible; Pudding: explicar encoding antes de explorar|M/MED|Un jurado encuentra pregunta→hallazgo→prueba visual→límite en 90 s; prueba humana de recuerdo; eje principal sigue siendo visualización|
|5|Paquete de entrega reproducible y actual (RT07/08/09/10)|Rg 25: memoria antigua; recetaCLI inválida; archivo/fijación incompletos; EU pendiente|Base 6; separación manifiesto de fuentes/artefacto/versión|M/LOW|Receta ensayada en entorno aislado, fuentes congeladas o límites descritos, memoria exacta,24 clavesEU revisadas y estado nativo global honesto|

El orden no significa publicar tras 1: preparar candidato, aplicar lo a probado y cerrar su verificación al final. Las pruebas físicas requieren personas/dispositivos; código no las puede sustituir.

## Next 10, solo después

1. Hero responsive con presupuesto de bytes y medición repetida (RT12).
2. Baseline browser explícita y timeout fallback si procede (RT15).
3. Reintento de import tras fallo de red, solo si se reproduce (RT16).
4. Adjudicar cookie LOW sin downgrade ciego (RT14).
5. Acotar uploads de CI al run actual (RT17).
6. Evitar duplicar población cuando el año coincide (RT18).
7. Publicar claim OG consistente con corpus temporal (RT21).
8. Validación de artefactos JSON en build (RT20).
9. Mejorar instrucción de cuota frente a huella sin cambiar encoding (RT19).
10. Corregir warnings concretos al tocar su componente, sin barrido cosmético.

No construiría nuevas features para cubrir estos diez puntos. No todos justifican entrar antes del concurso.
