# Contraste Itzuli — frase a frase (muestra)

Fecha: 2026-09-21. Motor: Itzuli web oficial (`euskadi.eus/traductor/`,
modelo `es2eu`, dominio general), conducido con Playwright —
`app/scripts/_eu_itzuli_contrast.mjs`. La traducción de cada frase se lee
del cuerpo del POST a `api.euskadi.eus/itzuli/es2eu/v2/translate`,
emparejado con su entrada por `text` — no del área de salida (una
respuesta en vuelo dejaría registros desfasados). Datos completos:
`itzuli.json`.

Muestra: 25 claves representativas (titular, cobertura, caveat, leyenda,
ortofoto, errores, dirección, metodología, contexto). Los placeholders se
sustituyeron por valores reales antes de traducir, porque Itzuli traduce
frases completas, no patrones.

**Alcance real**: comparación de una muestra contra traducción automática.
NO es validación lingüística ni revisión humana. Una frase coincide con
Itzuli no la valida; una diferencia no la invalida (Itzuli también comete
errores — ver discrepancias).

## Resultados

### Coincidencias fuertes (borrador ≈ Itzuli)

- `result.coverage`: idéntico («Erregistratutako urtearen estaldura: % 92,1.»)
- `result.calc`, `histmap.note`, `ortho.service_error`, `dist.heaping`:
  equivalencia completa con diferencias de estilo menores.
- `result.lead.some`: equivalente («10etik ia 8» vs «ia 10etik 8»).

### Discrepancias donde el borrador era mejor (se conserva)

- `map.cell.sentence`: Itzuli intercambió los papeles de numerador y
  denominador («9.780 urte ezagunekoak dira»), perdiendo la semántica del
  contrato métrico. El borrador conserva universo/numerador correctos.
- `result.lead.none`: Itzuli produjo orden poco natural y «urte
  ezagunarekin» con caso incorrecto. El borrador es más fiel.
- `result.kicker`: «1952 urtetik» (borrador) y «1952tik» (Itzuli) son ambas
  válidas; se conserva la del borrador.

### Discrepancias donde Itzuli era mejor (aplicadas al borrador)

- `result.caveat`: «desagertu ziren ezta noiz» (el borrador omitía el
  verbo: «desagertu edo noiz»).
- `map.tooltip.cell.no_known`: «Gune honetan ez dago … eraikinik» (orden
  más natural que «Gune honek ez du …»).
- `ortho.not_covered`: «kanpaina hurbilenak» (orden adjetival natural).
- `result.population` / `place.population` / `planning.intro`:
  «{ref_date} datan,» era un calco del español («a fecha de»). Resuelto
  con «{ref_date}: …» — sin sufijo sobre el placeholder y sin calco.
- `address.*`: «kalejero» → «kale-izendegi(a)» (nombre oficial del
  dataset) y «atari zenbatu» → «atari zenbakidun» (aportación Itzuli).
- Vocabulario: «zifr*» → «zenbaki*» (estándar; «zifra» es posible pero
  minoritario en administración vasca).

### Divergencia de criterio registrada

- «monte público»: Itzuli da «mendi publikoa» (uso de la normativa foral).
  El dataset citado por la app se titula oficialmente «Bizkaiko baso
  publikoak» → se usa «baso publikoa» por coherencia con la fuente citada.
  Ambas atestiguadas; elección documentada.
- «geocodificador oficial (NORA)»: Itzuli traduce literalmente
  «geokodetzailea». El servicio se denomina oficialmente
  «kale-izendegia» → se adopta el nombre oficial.

## Pendiente (limitaciones)

- `search.network_error` figura como `reused`: su texto ES es idéntico al
  de `address.street.network_error` (enviada justo antes), así que se
  reutilizó esa salida en lugar de fingir una traducción duplicada. El
  estado queda registrado como `reused` en `itzuli.json`, no oculto.
- `time.first_decade` fue a Itzuli con `<end_year>` literal (la muestra no
  tenía valor para ese placeholder); la salida se registra tal cual.
- Cobertura del contraste: 25/≈290 claves con salida útil — 24
  `translated` + 1 `reused` (muestra dirigida a frases con semántica de
  datos y riesgo). Las claves de interfaz cortas (botones, etiquetas) son
  de menor riesgo pero no fueron todas contrastadas.
- Itzuli dominio general; no se usó el dominio «Administratiboa» (podría
  mejorar términos administrativos concretos).
- Sin revisión humana: la equivalencia final no está certificada.
