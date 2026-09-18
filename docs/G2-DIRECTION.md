# G2 — DIRECTION (benchmark congelado + dirección prerregistrada)

> **Estado: DIRECCIÓN CONGELADA. G2 NO INICIADO.**
> Ningún cambio de producto hasta `G1_PASS` (NVDA + móvil físico + HR1/HR2 ACCEPTED).
> Este documento fija el benchmark y la dirección; los criterios ejecutables del gate
> se preregistrarán en `docs/gates/G2.md` antes de escribir una línea de producto.
> Referencias ampliadas: `docs/INSPIRATION.md` §8–§16.

## 1. Tesis

La oportunidad no es «otro mapa de edad de edificios». Casi todos los proyectos
buenos resuelven muy bien **una parte** del problema; pocos juntan personalización,
evolución temporal, evidencia fotográfica, exploración por edificio y narrativa
editorial. La aportación de este producto es **la combinación**, no una interacción
revolucionaria: cada parte ya ha demostrado funcionar en otro producto.

Cinco patrones a combinar:

1. **Personalización (elDiario):** «nací en 1987 y conozco Leioa».
2. **Play temporal (Urban Layers / Block & Paper):** ver incorporarse los edificios
   actuales según `Ano_Constr`.
3. **Evidencia fotográfica (comparadores históricos):** verificar el cambio con
   ortofotos oficiales.
4. **Hotspots editoriales (Google Timelapse):** no obligar a que todo el mundo
   encuentre las historias por sí mismo.
5. **Rigor semántico (propio):** OBSERVED / DERIVED / UNKNOWN, denominadores,
   cobertura y provenance.

La secuencia entera responde una única pregunta:

> **Naciste aquí. ¿Qué parte de la Bizkaia que conoces llegó después que tú?**

Y su orden narrativo: **cuánto → dónde → cuándo → compruébalo desde el aire →
descubre otros cambios.**

## 2. Viabilidad con los datos actuales

| Feature | ¿Datos? | Dificultad | Decisión |
|---|---|---|---|
| Play temporal de edificios | Sí, `Ano_Constr` | Baja-media | **Sí** |
| Scrub por año | Sí | Baja-media | **Sí** |
| Mapa ↔ distribución sincronizados | Sí | Baja | **Sí** |
| Hotspots automáticos | Sí, C-05/C-08/celdas | Media | **Sí** |
| Historias editoriales | Sí + ortofotos | Media | **Sí** |
| Swipe antiguo/actual | Sí | Ya existe | **Sí** |
| Timeline de campañas 1956–2025 | Sí | Baja-media | **Sí** |
| Edificio individual | Sí | Ya existe | **Sí** |
| Compartir exactamente la vista | Sí | Ya existe | **Sí** |
| Comparar edificios vs huella | Sí, C-05/C-08 | Baja | **Sí** |
| 3D por alturas actuales | `Numero_Alt` existe | Media-alta | No prioritario |
| Filtro por uso | Código disponible, semántica incompleta | — | **No todavía** |
| Nº de viviendas | Mala cobertura | — | **No** |
| Edificios demolidos | No hay ledger histórico | — | **No** |
| Reconstrucción «Bizkaia en 1970» | No | — | **No** |
| Fotos de archivo tipo OldNYC | Fuente potencial; derechos/geoloc por resolver | Alta | Después |
| Población histórica | Fuente externa posible | Media | Solo para historias |

No hace falta buscar veinte fuentes adicionales.

## 3. Experiencia G2 (secuencia)

No abre con un mapa. Abre con:

> **¿Qué parte de la Bizkaia que ves hoy apareció después que tú?**

Usuario: `1987` + `Leioa` → resultado personalizado (lo que ya existe). Después:

1. **«Mira dónde»** — distribución espacial, municipio → celdas → edificios.
   Sin dashboard lateral; el dato y el mapa ocupan la escena.
2. **«Mira cómo fueron llegando»** — botón `▶ Ver los que llegaron después que tú`.
   Play desde el año del usuario hasta el presente; los edificios del stock actual
   se incorporan según `Ano_Constr`.
3. **«Y desde el aire»** — cuando el Play se acerca a una campaña disponible
   (1990, 1995, 1999, 2002, …), aparece discreto: «Existe fotografía aérea de esta
   época → verla». Nunca carga ortofotos automáticamente (P5); con el modo
   fotográfico activo, se puede avanzar entre campañas. Fusión que ni Urban Layers
   ni los comparadores tienen: **dato constructivo + evidencia fotográfica en el
   mismo espacio y momento**.
4. **«Edificios o territorio»** — contraste C-05 vs C-08: «48 de cada 100 edificios
   son posteriores a ti / pero representan el 63 % de la huella con año conocido».
   Explica crecimiento compacto vs extensivo. No es otra métrica principal.
5. **«Historias que quizá no encontrarías solo»** — exploración libre arriba,
   casos editoriales seleccionados debajo.

## 4. Principio de diseño: MAPA · TIEMPO · FOTO

Tomado de Ten & Taller, adaptado. Tres maneras de contestar la misma pregunta,
no tres aplicaciones:

- **Mapa:** ¿dónde?
- **Tiempo:** ¿cuándo?
- **Foto:** ¿cómo se ve?

Las tres comparten siempre `place + year + view` (el estado ya es compartible por
URL — F-10). Este principio puede ser la columna de todo G2.

## 5. Contrato de copy del Play (no negociable)

Permitido:

> «Así se incorpora al mapa el parque que existe hoy según el año de construcción
> registrado en Catastro.»

Prohibido (reconstrucción histórica implícita):

> «Así era Leioa en 1995.»

El efecto visual de NY Construction/Urban Layers sin la suposición histórica.
Misma regla para los hotspots: nunca presentar ausencia de registro como
inexistencia, ni el stock actual como reconstrucción del pasado.

## 6. Hotspots: metodología

No se inventan los lugares. El pipeline produce candidatos usando **solo señales
internas**: cobertura alta, concentración temporal fuerte, clusters espaciales
claros, gran diferencia C-05 vs C-08, ortofotos antes/después disponibles.
De ~20 candidatos se eligen ~5 editorialmente. No se decide «Getxo representa X»
antes de que los datos ofrezcan el caso.

Formato de historia (extremadamente corta, periodismo de datos, no catálogo GIS):

- **Qué vemos** — una frase.
- **El dato** — una cifra.
- **Muévelo** — pequeña interacción.
- **Míralo desde el aire** — swipe.
- **Lo que sabemos / lo que no sabemos** — una línea.

## 7. No-objetivos explícitos

- **3D** por efecto visual: `Numero_Alt` existe pero la narrativa vertical no es la
  pregunta del concurso; solo experimento si un hotspot lo requiere.
- **Amplitud Colouring Cities:** no un atlas de ~150 atributos; una pregunta
  memorable.
- **Edificios demolidos / ledger histórico:** no tenemos los datos; no simularlos.
- **Reconstrucción histórica:** prohibida por contrato semántico (§5).
- **Filtro por uso / nº de viviendas:** semántica o cobertura insuficientes hoy.
- **Fotos de archivo OldNYC:** post-G2; derechos y geolocalización por resolver.

## 8. Combinación única (claim del benchmark)

Ningún proyecto del benchmark reúne simultáneamente: año personal + lugar personal
+ stock de edificios actual a nivel de huella + agregación espacial multiescala +
timeline/Play + ortofotos oficiales multitemporales + swipe + provenance explícito
+ tratamiento de unknowns + accesibilidad real. Hay proyectos que hacen algunas de
esas cosas mejor de forma aislada.

## 9. Disciplina / siguiente paso

1. `G1_PASS` primero: NVDA + móvil físico → HR1/HR2 `ACCEPTED` → merge/tag.
2. Preregistrar `docs/gates/G2.md` (criterios binarios + umbrales congelados,
   metodología idéntica a G1) **antes** de tocar producto.
3. Hotspot discovery en pipeline (señales §6) → revisión editorial.
4. Implementación G2: Play/scrub → modo foto sincronizado → contraste C-05/C-08 →
   historias.
5. `G1.md` y sus umbrales quedan congelados; G2 no puede reabrirlos.
