# G2 — DIRECTION (benchmark congelado + dirección prerregistrada)

> **Estado: DIRECCIÓN CONGELADA (enmendada 2026-09-18). G2 preregistrado, sin
> implementación de producto hasta congelar `docs/gates/G2.md` y cerrar los spikes.**
> `G1_PASS` ya está declarado (`docs/gates/G1-REPORT.md`); NVDA y móvil físico
> quedan `PENDING_HUMAN` en `LAUNCH_QUALITY.md` y **no bloquean G2**.
> Este documento fija el benchmark y la dirección; los criterios ejecutables del
> gate se preregistran en `docs/gates/G2.md` antes de escribir producto.
> Referencias ampliadas: `docs/INSPIRATION.md` §8–§16.
>
> **Enmienda (post-G1_PASS):** se elimina «estar cerca de una campaña» — la timeline
> usa marcadores exactos de campaña y el contrato `AVAILABLE/NOT_COVERED/
> SERVICE_ERROR` (§3); se congela el modelo `selected_year ≠ play_year` (§4) y el
> contrato de tres señales para hotspots (§7).

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
3. **«Y desde el aire»** — la timeline muestra **marcadores exactos de campañas
   oficiales** (1956, 1965, 1970, 1975, 1983, 1990, 1995, 1999, 2002, 2025…).
   Un marcador significa «existe una campaña oficial»; **no** significa que cubra
   el punto actual. Al activarla se aplica el contrato existente
   `AVAILABLE / NOT_COVERED / SERVICE_ERROR`. Nunca hay petición de ortofoto
   automática (P5 intacto); con el modo fotográfico activo se puede avanzar entre
   campañas. Fusión que ni Urban Layers ni los comparadores tienen: **dato
   constructivo + evidencia fotográfica en el mismo espacio y momento**.
4. **«Edificios o territorio»** — contraste C-05 vs C-08: «48 de cada 100 edificios
   son posteriores a ti / pero representan el 63 % de la huella con año conocido».
   Explica crecimiento compacto vs extensivo. No es otra métrica principal.
5. **«Historias que quizá no encontrarías solo»** — exploración libre arriba,
   casos editoriales seleccionados debajo.

## 4. Modelo de estados temporales (decisión arquitectónica congelada)

**`selected_year` ≠ `play_year` — son estados distintos.**

- **`selected_year` (ej. 1987):** «tu año». Ancla personal: titular, resultado
  personalizado, denominadores y URL permanecen anclados a él. Solo cambia cuando
  el usuario cambia explícitamente su año. **Nunca se muta durante el Play.**
- **`play_year` (1987 → 2026):** cabezal temporal transitorio de la animación.
  Valor inicial = `selected_year`; avanza hasta el año del snapshot. No afecta a
  titular, métricas ni URL.

Si se reutilizara el mismo estado, el Play estaría cambiando la pregunta del
usuario mientras se reproduce el mapa.

Semántica visual durante el Play:

- edificios con `Ano_Constr <= play_year`: visibles;
- posteriores a `play_year`: aún no visibles o muy atenuados;
- el color de los que aparecen expresa su relación con **tu año** (`selected_year`),
  no con el cabezal;
- `UNKNOWN` permanece visible con su trama, **fuera de la animación** (no sabemos
  dónde colocarlo temporalmente; nunca se le asigna año artificial);
- el mapa distingue siempre `TU AÑO · 1987` y `REPRODUCCIÓN · 2003`.

En celdas no se recalcula desde datos crudos: se usan las series canónicas `ys/ya`
existentes con una proyección G2 nueva — «de los edificios actuales con año
conocido, cuántos constan como terminados hasta el año P». Sigue siendo stock
actual, nunca reconstrucción.

## 5. Principio de diseño: MAPA · TIEMPO · FOTO

Tomado de Ten & Taller, adaptado. Tres maneras de contestar la misma pregunta,
no tres aplicaciones:

- **Mapa:** ¿dónde?
- **Tiempo:** ¿cuándo?
- **Foto:** ¿cómo se ve?

Las tres comparten siempre `place + year + view` (el estado ya es compartible por
URL — F-10). Este principio puede ser la columna de todo G2.

## 6. Contrato de copy del Play (no negociable)

Permitido:

> «Así se incorpora al mapa el parque que existe hoy según el año de construcción
> registrado en Catastro.»

Prohibido (reconstrucción histórica implícita):

> «Así era Leioa en 1995.»

El efecto visual de NY Construction/Urban Layers sin la suposición histórica.
Misma regla para los hotspots: nunca presentar ausencia de registro como
inexistencia, ni el stock actual como reconstrucción del pasado.

## 7. Hotspots: metodología (contrato de descubrimiento)

No se inventan los lugares, y **no hay un único score opaco que podamos ajustar
hasta obtener los lugares que «quedan bonitos»**. El pipeline genera candidatos
desde **tres señales independientes**, sobre las celdas canónicas de 500 m y las
series C-05/C-08 existentes, con `n_known >= 15` y cobertura suficiente:

1. **Concentración temporal** — una década canónica concentra una proporción
   especialmente alta del stock actual con año conocido.
2. **Divergencia edificios/huella** — máxima diferencia absoluta entre la
   distribución acumulada por número de edificios y por huella (estadístico
   interpretable; descubre «pocos edificios, mucho terreno» y viceversa).
3. **Coherencia espacial** — componentes conexos deterministas de celdas que
   comparten la misma década dominante.

Cada señal aporta sus mejores candidatos; se deduplican → ~20. **Solo después**
se verifica idoneidad de ortofoto, se inspecciona visualmente y se eligen ~5
editorialmente. Se persiste todo: universo de candidatos, exclusiones, métricas,
ordenación determinista, casos seleccionados y rechazados con motivo.
No se decide «Getxo representa X» antes de que los datos ofrezcan el caso.

Formato de historia (extremadamente corta, periodismo de datos, no catálogo GIS):

- **Qué vemos** — una frase.
- **El dato** — una cifra.
- **Muévelo** — pequeña interacción.
- **Míralo desde el aire** — swipe.
- **Lo que sabemos / lo que no sabemos** — una línea.

## 8. No-objetivos explícitos

- **3D** por efecto visual: `Numero_Alt` existe pero la narrativa vertical no es la
  pregunta del concurso; solo experimento si un hotspot lo requiere.
- **Amplitud Colouring Cities:** no un atlas de ~150 atributos; una pregunta
  memorable.
- **Edificios demolidos / ledger histórico:** no tenemos los datos; no simularlos.
- **Reconstrucción histórica:** prohibida por contrato semántico (§6).
- **Filtro por uso / nº de viviendas:** semántica o cobertura insuficientes hoy.
- **Fotos de archivo OldNYC:** post-G2; derechos y geolocalización por resolver.

## 9. Combinación única (claim del benchmark)

Ningún proyecto del benchmark reúne simultáneamente: año personal + lugar personal
+ stock de edificios actual a nivel de huella + agregación espacial multiescala +
timeline/Play + ortofotos oficiales multitemporales + swipe + provenance explícito
+ tratamiento de unknowns + accesibilidad real. Hay proyectos que hacen algunas de
esas cosas mejor de forma aislada.

## 10. Disciplina / siguiente paso

1. ~~`G1_PASS` primero~~ — **hecho** (`docs/gates/G1-REPORT.md`; NVDA y móvil físico
   quedan `PENDING_HUMAN` en `LAUNCH_QUALITY.md`, no bloquean G2).
2. Preregistrar `docs/gates/G2.md` (criterios binarios + umbrales congelados,
   metodología idéntica a G1) **antes** de tocar producto.
3. Spikes preregistrados (ver `docs/gates/G2.md` §spikes): S1 representación
   temporal en tiles/series; S2 semántica temporal y denominador; S3 contrato de
   descubrimiento de hotspots (§7). La «proximidad a campaña» quedó sustituida por
   marcadores exactos de campaña (§3) — no hay umbral que inventar.
4. Implementación G2: Play/scrub → modo foto sincronizado → contraste C-05/C-08 →
   historias.
5. `G1.md` y sus umbrales quedan congelados; G2 no puede reabrirlos.
