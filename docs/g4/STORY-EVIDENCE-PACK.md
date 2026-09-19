# G4-R · STORY-EVIDENCE-PACK — las 5 historias con toda su evidencia

Corpus SELECT (`evidence/g2/editorial-desk/candidates.json`) + desk packs
(`map.png`, `ortho_pre/post.png`, `temporal.svg`, `contrast.svg`, `pair.png`
por caso en `evidence/g2/editorial-desk/<id>/`).

Deep link propuesto por caso: `?story=<id>` = `year=<ref>` +
`place=<slug>` + `lat/lon=<centroid>` + `z≈15` + `play=<ref_year>` —
la escena ya configurada al abrir.

---

## 01 · c2803 — Portugalete (ancla territorial)

- Señal: STRONG_SPATIAL_COHERENCE — componente de **21 celdas**, 4 520
  edificios con año conocido, cobertura 99,9 %, dominante 1960s, cruza
  **6 municipios** (Getxo, Leioa, Portugalete, Santurtzi, Sestao,
  Trapagaran).
- ref_year 1969 · target period 1960–1969 · centroid −3,0154 / 43,3146.
- Distribución: pico absoluto 1960s (863) tras 1950s (279) — la ola del
  desarrollismo en la margen izquierda.
- Hook factual: «una ola de construcción que no respetó fronteras
  municipales: el mismo impulso en seis municipios».
- Hook visual: el componente multi-celda coloreado uniformemente en el
  mapa — se ve como un territorio, no como puntos.
- Evidencia que SOBRA: contexto G3-D (ruido/paradas) — no añade a la
  señal; planning podría aportar solo si hay suelo vacante relevante.
- Trampa semántica: el componente cruza municipios — NO decir «el
  crecimiento de Portugalete» como si fuera municipal; es de la margen.
- Estado ideal: year=1969, play=1969 pausado en el pico, cámara sobre el
  bbox entero (z≈13,5), vista MAPA.
- Frase segura: «Entre 1960 y 1969 se terminaron más edificios de los
  que hoy quedan en este tramo de la margen izquierda que en ningún
  otro periodo registrado.»
- Frase NO soportada: «el baby boom construyó la margen» (causalidad no
  documentada).

## 02 · f4036 — Mungia (contraste conteo↔huella)

- Señal: STRONG_BUILDING_FOOTPRINT_CONTRAST — a 1979, **85,7 % de
  edificios posteriores** pero solo **1,9 % de huella posterior**;
  d_max 96,3 pp (el mayor del corpus).
- 70/70 edificios conocidos, cobertura 100 %, dominante 1970s.
- centroid −2,8427 / 43,3280 · target 1970–1979.
- Hook factual: «casi todos los edificios llegaron después — pero casi
  todo el suelo ocupado ya estaba»: muchos edificios pequeños sobre un
  casco consolidado.
- Hook visual: el contraste C-05/C-08 en el módulo existente + el mapa
  de edificios pequeños densos.
- Evidencia de apoyo: Contrast component es LA herramienta de esta
  historia — aquí deja de ser módulo huérfano y pasa a ser el dato.
- Trampa: huella posterior baja ≠ poco crecimiento; son muchos
  edificios pequeños (relleno), no una anécdota.
- Estado ideal: year=1979, mapa en edificio (z≈16), contraste visible.
- Frase segura: «De cada 100 edificios actuales aquí, 86 se terminaron
  después de 1979; pero solo el 1,9 % del suelo que ocupan es posterior
  a ese año.»
- Frase NO soportada: «Mungia se densificó sin crecer» (densificación
  es interpretación; el dato muestra edificios nuevos pequeños).

## 03 · f4233 — Muskiz (patrón temporal puro)

- Señal: STRONG_TEMPORAL_PATTERN — **51/51 edificios conocidos son de
  los 1970s**, cobertura 100 %, divergencia 0.
- centroid −3,1141 / 43,3280 · target 1970–1979 · ref 1979.
- Hook factual: «un barrio entero construido en una década» — la
  lectura más limpia posible de un pulso temporal.
- Hook visual: el Play — todo aparece de golpe entre 1970 y 1979; la
  historia ideal para enseñar el cabezal temporal.
- Evidencia de apoyo: ortofoto pre/post 1970–1983 (ya en el desk pack:
  `ortho_pre`/`ortho_post`) — «compruébalo desde el aire».
- Evidencia que SOBRA: contraste (d=0, no hay señal), contexto.
- Trampa: un solo decenio dominante no implica «se construyó todo en
  los 70» en el municipio — es ESTE conjunto de 51 edificios.
- Estado ideal: year=1979, play activo (o pausado en 1975), z≈15,5.
- Frase segura: «Los 51 edificios con año conocido de este conjunto se
  terminaron todos en la década de 1970.»
- Frase NO soportada: «Muskiz nació en los 70» (el conjunto ≠ el
  municipio).

## 04 · f4738 — Santurtzi (contraste inverso)

- Señal: contraste opuesto a f4036 — tras 1999, **11,1 % de los
  edificios concentran el 94,7 % de la huella posterior**; d_max 83,6 pp.
- 54/54 conocidos, cobertura 100 %, dominante 1990s.
- centroid −3,0586 / 43,3416 · target 1990–1999.
- Hook factual: «pocos edificios, muchísimo suelo» — probable gran
  equipamiento/polígono frente a tejido menudo.
- Hook visual: huella dominante en el mapa — el área grande salta a la
  vista.
- Pareja editorial con f4036: las dos formas de leer «cuántos» vs
  «cuánto suelo» — capítulos 02 y 04 se explican mutuamente.
- Trampa: huella grande ≠ viviendas; puede ser equipamiento/
  industrial/logística — no llamarlo «barrio nuevo».
- Estado ideal: year=1999, z≈15, contraste.
- Frase segura: «El 11 % de los edificios posteriores a 1999 ocupa el
  95 % del suelo ganado desde entonces en este conjunto.»
- Frase NO soportada: «Santurtzi creció hacia el polígono» (la huella
  no distingue uso).

## 05 · f149 — Abanto Zierbena (caso reciente-límite)

- Señal: STRONG_TEMPORAL_PATTERN — **69/69 edificios conocidos son de
  los 2000s**, cobertura 100 %; el caso más reciente del corpus.
- centroid −3,0648 / 43,3281 · target 2000–2009 · ref 2009.
- Hook factual: «un conjunto entero posterior a 2000» — el borde
  temporal del dato (el stock más nuevo registrado).
- Hook visual: en el Play todo aparece en el último tramo del eje —
  cierre cronológico del arco de historias.
- Evidencia de apoyo: ortofoto 2004 vs última campaña — la comparación
  que nadie más puede enseñar (la era digital de la fototeca).
- Trampa: es el conjunto MÁS reciente — tentador sobredramatizar
  «nuevo»; el dato dice solo «posterior a 2000».
- Estado ideal: year=2009 (o año del usuario si entra por Descúbreme),
  FOTO con campañas 2004↔2024.
- Frase segura: «Los 69 edificios con año conocido de este conjunto se
  terminaron en la década de 2000.»
- Frase NO soportada: «la última expansión de la zona» (no sabemos si
  hay suelo pendiente — planning podría decirlo, sin verificar aquí).

## Notas transversales

- Los 5 casos cubren: territorio (c2803), contraste ×2 (f4036/f4738),
  tiempo puro ×2 (f4233/f149) — arco editorial 1960s→2000s coherente.
- Cada historia usa 1–2 evidencias, nunca todas (regla: no forzar
  fuentes que no aportan a la señal).
- Todos: cobertura ≥99,9 % — el dato soporta la afirmación sin caveat
  de cobertura, solo el caveat universal (parque actual).
- Los `ortho_pre/post.png` del desk pack prueban que cada caso tiene
  evidencia visual de campaña — la acción «míralo desde el aire» es
  real en los cinco.
