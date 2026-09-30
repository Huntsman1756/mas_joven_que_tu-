# RT-10 — Revisión lingüística nativa de EU (pendiente)

Estado: **`REQUIRES_HUMAN` / `NATIVE_EU_REVIEW = PENDIENTE`**.

28-09: segunda revisión asistida con correcciones y tests específicos,
documentada en `docs/submission/EU-REVIEW-20260928.md`. El gate nativo NO se cierra.


Ampliación editorial final 27-09: revisar de nuevo `contrast.buildings`,
`contrast.note`, `story.f4036.concl` y `about.contest`. Equivalencias asistidas
modificadas para evitar duplicidad porcentual, mantener el corte 1979 y decir
«preparada» sin afirmar presentación administrativa. No certificadas por hablante nativo.

La paridad estructural **no** acredita corrección lingüística: este documento
reúne lo que hay que revisar y con qué criterio. **No se ha contratado ni se
ha dado por hecha ninguna revisión nativa**, y ninguna traducción automática
se presenta como copy final.

## 1. Estado medido (2026-09-27)

| Comprobación | Resultado |
|--------------|-----------|
| Claves ES / EU | **531 / 531** (paridad exacta) |
| Placeholders por clave | idénticos ES↔EU (`locale-contract.test.ts`, 2/2 PASS) |
| `npm run verify:eu` | PASS |
| Suite EU `g14_eu_qa.mjs` | **101/101 PASS** — `lang=eu`, sin overflow horizontal (1440 y 390), sin placeholders sin resolver, convención de porcentaje vasca (`% 79,3`), sin fugas de ES, 0 pageerrors |
| Layout EU a 320 px con el nombre largo (Karrantza Harana/Valle de Carranza) | PASS (`golden-eu-320-karrantza.png`) |
| Revisión nativa del corpus | **NO REALIZADA** |

## 2. Claves tocadas en FASE B / FASE B.1 (21) — revisión prioritaria

Son cadenas nuevas o modificadas por esta remediación; el EU es un borrador
asistido que hay que validar o reescribir con criterio nativo. Las marcadas
**(B.1)** se añadieron en la FASE B.1 (estado explícito de universo vacío y
reintento de métricas).

| Clave | ES (revisado) | EU (borrador) | Contexto en pantalla |
|-------|---------------|---------------|----------------------|
| `result.support` | La cifra: | Zenbatekoa: | Cifra de apoyo bajo el titular (antes «La cifra exacta:» / «Zenbateko zehatza:») |
| `result.pct_value` (extremos) | `<0,1 %` / `>99,9 %` | `% <0,1` / `% >99,9` | **Decidir cómo lee un vascohablante «% &lt;0,1»**: ¿se queda el signo después del «%»? ¿convendría «&lt;%0,1» o reformular? Afecta a todos los formatos de cuota |
| `result.text_summary_one` | …y **1 se terminó** después de {selected_year}. | …eta eraikin 1 {selected_year} ondoren amaitu zen. | Resumen para lector de pantalla (numerador = 1) |
| `map.legend.cells.universe` | Porcentaje sobre los edificios con año de construcción conocido de cada zona: **cuenta edificios, no la superficie que ocupan**. | Gune bakoitzeko eraikuntza-urte ezaguna duten eraikinen ehunekoa: eraikinak zenbatzen ditu, ez haien oinplanoa. | Sublínea de la leyenda del mapa (RT-19; también estaba en el delta heredado) |
| `share.done` | Enlace copiado. Incluye tu año, el municipio y la vista que estabas viendo (posición del mapa, modo y capas activas). | Esteka kopiatuta. Zure urtea, udalerria eta ikusten zenuen ikuspegia dauzka (maparen posizioa, modua eta aktibatutako geruzak). | Tras «Copiar enlace» (RT-11) |
| `photo.hint` | La imagen aún no está activada: elige una campaña en el eje o pulsa el botón para cargarla. | Irudia oraindik ez dago aktibatuta: aukeratu kanpaina bat ardatzean edo sakatu botoia kargatzeko. | Estado inicial de Fotos aéreas (RT-03) |
| `photo.activate` | Ver la campaña de {year} | Ikusi {year} kanpaina | Botón del estado inicial (RT-03) |
| `finding.kicker` | Un hallazgo | Aurkikuntza bat | Franja del hallazgo en el primer panel (RT-06) |
| `finding.lead` | En una zona de 500 m de Mungia hay 70 edificios: el 85,7 % se terminó después de 1979, pero solo suponen el 1,9 % de la huella en planta del conjunto. | Mungiako 500 m-ko eremu batean 70 eraikin daude: horien % 85,7 1979 ondoren amaitu ziren, baina multzoaren oinplano-azaleraren % 1,9 baino ez dute osatzen. | Cuerpo del hallazgo (RT-06) |
| `finding.cta` | Ver el caso de Mungia | Ikusi Mungiako kasua | CTA al capítulo `f4036` (RT-06) |
| `result.calc.one` | El cálculo: **1 edificio terminado** después de {selected_year} de un total de {known}… | Kontua: {selected_year} urtearen ondorengo **eraikin 1** · urtea erregistratuta duten {known} eraikin = 100etik {post_share}… | Disclosure «Cómo lo calculamos» con numerador 1 (RT-18) |
| `dist.tooltip.decade.one` | años {decade} · **1 edificio** · {share} % del parque con año conocido | {decade} hamarkada · **1 eraikin** · urte ezaguneko parkearen % {share} | Tooltip de la distribución con década de 1 edificio (RT-18) |
| `compare.partition.before.one` | Hasta {earlier}: **1 edificio** ({pct} %) | {earlier} arte: **1 eraikin** (% {pct}) | Comparación de dos años, partición con 1 (RT-18) |
| `compare.partition.between.one` | Entre {earlier} y {later}: **1 edificio** ({pct} %) | {earlier} eta {later} artean: **1 eraikin** (% {pct}) | ídem |
| `compare.partition.after.one` | Después de {later}: **1 edificio** ({pct} %) | {later} ondoren: **1 eraikin** (% {pct}) | ídem |
| `result.lead.no_denominator` **(B.1)** | No podemos comparar con {selected_year}: en {municipality} ningún edificio actual tiene año de construcción conocido. | Ezin da {selected_year}ekin alderatu: {municipality} udalerrian ez dago eraikuntza-urte ezaguna duen egungo eraikinik. | Titular cuando `known = 0` (RT-04) |
| `result.lead.no_known` **(B.1)** | {total} edificios actuales en {municipality} y ninguno con año de construcción conocido. | {total} egungo eraikin daude {municipality} udalerrian eta bat ere ez du eraikuntza-urte ezaguna. | Recuento factual bajo el titular con `known = 0` (RT-04) |
| `result.text_summary.no_known` **(B.1)** | En {municipality} hay {total} edificios actuales y ninguno con año de construcción conocido: no se puede calcular la comparación con {selected_year}. | {municipality} udalerrian {total} egungo eraikin daude eta bat ere ez du eraikuntza-urte ezaguna: ezin da {selected_year}rekin alderaketa kalkulatu. | Resumen accesible con `known = 0` (RT-04) |
| `dist.no_known` **(B.1)** | Sin edificios con año de construcción conocido en {municipality}: no hay distribución por décadas que calcular. | Ez dago eraikuntza-urte ezaguna duen eraikinik {municipality} udalerrian: ez dago hamarkaden banaketarik kalkulatzeko. | Sustituye al histograma cuando `c02 = 0` (RT-04) |
| `compare.partition.no_known` **(B.1)** | Sin edificios con año de construcción conocido en {municipality}: no hay reparto posible entre {earlier} y {later}. | Ez dago eraikuntza-urte ezaguna duen eraikinik {municipality} udalerrian: ez dago banaketarik egin {earlier} eta {later} artean. | Sustituye a la lista de particiones con `known = 0` (RT-04) |
| `result.calc.no_known` **(B.1)** | Sin edificios con año de construcción conocido no hay cálculo posible: todo porcentaje necesitaría un denominador. | Ez dago eraikuntza-urte ezaguna duen eraikinik, ezin da ezer kalkulatu: edozein ehunekok izendatzailea beharko luke. | Disclosure «Cómo lo calculamos» con `known = 0` (RT-04) |
| `error.metrics_retry` **(B.1)** | Reintentar cargar los datos. | Saiatu berriro datuak kargatzen. | Botón junto al fallo de métricas (RT-20) |

> `map.tooltip.cell.no_known` («Esta zona no tiene edificios…») pasó a usarse
> **también** en el chip de celda de la columna de resultado (RT-04): misma
> clave ya existente, contexto nuevo — revísalo con el resto.

> `result.pct_value` no cambió de texto (sigue siendo `{pct} %` /
> `% {pct}`), pero sus **extremos** ahora pueden ser `<0,1` y `>99,9`: es la
> decisión de lectura que más necesita ojo nativo.

## 3. Delta heredado (24 claves) — sigue `REQUIRES_NATIVE_EU_REVIEW`

Cambiadas en ES en la pasada de copy previa y nunca adjudicadas en EU
(`docs/COPY_AUDIT.md` §11.4): `result.lead`, `result.coverage`,
`result.coverage.detail.body`, `result.calc`, `dist.summary`,
`dist.denominator`, `map.tooltip.cell.denominator`, `map.legend.cells.nodata`,
`map.legend.cells.pending`, `map.legend.cells.universe` *(también tocada en
FASE B)*, `map.cell.inspect`, `map.cell.inspect.title`, `map.intro.munis`,
`map.intro.cells`, `map.intro.buildings`, `map.visible_universe`,
`map.scale.zones`, `time.status`, `map.legend.cells.play`,
`view.cta_era.note`, `photo.nodata`, `planning.intro`, `empty.catalog`,
`sources.planning.what`.

### 3.1 Etapa editorial (2026-09-28) — 21 claves nuevas/modificadas

| Clave | ES | EU (borrador) | Contexto |
|-------|----|---------------|----------|
| `hero.tagline` | La edad de los edificios de Bizkaia, comparada con la tuya | Bizkaiko eraikinen adina, zurekin alderatuta | Subtítulo descriptivo (sustituye «Tu vida como medida del territorio») |
| `hero.example` | O ver un ejemplo: el caso de Mungia | Edo ikusi adibide bat: Mungiako kasua | Acceso opcional desde la portada al capítulo f4036 |
| `story.k.concl` | En síntesis | Laburbilduz | Bloque de conclusión del capítulo |
| `story.c2803.concl` | Entre los edificios actuales de estas 21 zonas, la década de los sesenta es la más frecuente de todo el registro: 863 de 4.520 con año conocido. | 21 gune hauetako egungo eraikinen artean, hirurogeiko hamarkada da erregistro osoan ohikoenena: urte ezaguna duten 4.520tik 863. | Conclusión capítulo c2803 |
| `story.f4036.concl` | Contar edificios y medir el terreno que ocupan responden a preguntas distintas: aquí ambas curvas divergen hasta 96 puntos porcentuales. | Eraikinak zenbatzeak eta hauen lursaila neurtzeak galdera desberdinei erantzuten diete: hemen bi kurbak 96 ehuneko-puntu arte desbideratzen dira. | Conclusión capítulo f4036 |
| `story.f4233.concl` | Los 51 edificios actuales de este conjunto se registran todos en la misma década. | Multzo honetako egungo 51 eraikinak hamarkada berean erregistratuta daude guztiak. | Conclusión capítulo f4233 |
| `story.f4738.concl` | La divergencia aquí es inversa: el 11,1 % de los edificios concentra el 94,7 % de la huella. | Dibergentzia alderantzizkoa da hemen: eraikinen % 11,1k oinplanoaren % 94,7 kontzentratzen du. | Conclusión capítulo f4738 |
| `story.f149.concl` | El conjunto más reciente de los cinco: sus 69 edificios actuales se registran todos en la década de 2000. | Bost multzoen artean berriena: bere egungo 69 eraikinak 2000eko hamarkadan erregistratuta daude. | Conclusión capítulo f149 |
| `how.check.*` (10 claves) | Sección «Comprueba un resultado»: numerador/denominador/fuente/artefactos/procedimiento/límites del caso f4036 + enlaces al CSV y al capítulo | Egiaztatu emaitza bat … | `/como-lo-sabemos`; revisar el sufijo «-k» en «% 11,1k» y el tono «datuatik … esatzera» |

## 4. Qué debe cubrir la revisión (criterio, no traducción literal)

1. **Registro**: el EU del producto es divulgación sobria, sin calcos del
   castellano ni anglicismos innecesarios.
2. **Unidades y porcentajes**: convención `% 79,3`; decidir el tratamiento de
   los extremos (`% <0,1` / `% >99,9`) y de «de cada 100».
3. **Singular/plural**: los cinco `.one` nuevos; el vasco no marca igual que
   el castellano — validar número y concordancia.
4. **Glosario coherente**: eraikina / oinplano-azalera / kanpaina / udalerria
   / urte ezaguna vs. urte balioduna — que aparezcan donde corresponda y no se
   mezclen sinónimos.
5. **Universos**: que quede claro que el hallazgo de Mungia es una zona de
   500 m con 70 edificios, **no** todo el municipio.
6. **Límites del dato**: parque actual ≠ parque histórico; sin causalidades.

## 5. Formato de entrega esperado

Una tabla `clave | EU propuesto | comentario` (o reescritura completa de
`eu.ts`), devuelta como parche o como lista para aplicación manual. Mientras
tanto: `EU_NATIVE_REVIEW` **no** se marca completado, y en la memoria y el
README consta como pendiente.

## LATXA / Xuxen - 2026-09-30

566 claves enviadas a LATXA, en 13 lotes. Correcciones manuales,
variables y cifras conservadas. Estado: **REQUIRES_HUMAN**.
[Registro](../../../evidence/map-guidance-20260930/README.md).
