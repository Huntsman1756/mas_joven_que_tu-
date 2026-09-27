# Decisiones editoriales — etapa post-B.3 (2026-09-28)

Registro de lo valorado en `NEXT_EDITORIAL_DELIVERY.md` y lo decidido.

## Nombre y subtítulo

- **Nombre: se mantiene** — «Más joven que tú» es la entrada personal
  memorable; no hay problema demostrado que justifique el coste del
  renombrado (ES/EU, OG, documentación, candidatura).
- **Subtítulo: sustituido.** `hero.tagline` pasa de «Tu vida como medida del
  territorio» a **«La edad de los edificios de Bizkaia, comparada con la
  tuya»** — la hipótesis de NEXT_EDITORIAL (el nombre solo no explica qué
  se compara) se resuelve con una línea descriptiva. Propagado a:
  `app.html` (og:title/twitter:title), `app/scripts/build-social-card.mjs`
  (og-card.png regenerada), `app/scripts/_dbg_eu_leak.mjs` (patrón de fuga),
  `RELEASE.md` (checklist de verificación post-publicación), EU (`eu.ts`).
- Pendiente: comprobar con personas nuevas si el subtítulo resuelve la
  ambigüedad (observación real, no sustituir por preferencia del agente).

## «Ver un ejemplo»

Implementado: acceso opcional en la portada que abre el capítulo destacado
`f4036` (contraste recuento↔huella de Mungia) sin exigir el formulario.
Reutiliza el capítulo existente y la misma escena que `?story=f4036`;
«Volver» regresa a la portada si no había estado personal.

## Conclusiones de capítulos

Implementado: bloque «En síntesis» en los cinco capítulos (pregunta →
evidencia → conclusión → límite → acciones). No duplica la franja
«Un hallazgo» del panel de resultado (que solo anticipa `f4036`).

## Trazabilidad «Comprueba un resultado»

Implementado en `/como-lo-sabemos`: el caso `f4036` trabajado completo
(numerador 60, denominador 70, fuente, artefactos, procedimiento, límites)
+ `data/editorial-cases.csv` con diccionario, generados desde los briefs.

## Imágenes

Decisión: **sin nuevas imágenes producidas.** Los recursos existentes
cubren las funciones (og-card regenerada con el nuevo subtítulo, capturas
golden por caso, story-thumbs reales del pipeline `g7`). No se genera
ilustración con IA: ninguna función conceptual/editorial la necesita y el
documento prohíbe que pueda confundirse con material factual.

## Demo 60–90 s

Guion listo en `DEMO-SCRIPT.md` ajustado al producto real. **Grabación
pendiente** del candidato congelado; no se ha decidido proveedor de voz
ni cuenta nueva (referencia SalidaCyL evaluada solo como técnica).

## Paquete de evaluación

`EVALUATION-PACKAGE.md`: una página — qué mide, el hallazgo, tres enlaces,
cuatro capturas propuestas, snapshot, SHA y URL (`⧗` pendientes del
congelado). Reutiliza TECHNICAL-MEMORY y SOURCES-LICENSES; nada duplicado.
