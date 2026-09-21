# Contraste terminológico EU — registro de consultas

Fecha: 2026-09-21 (UTC aprox). Método: consulta directa a las fuentes
oficiales citadas por término en la tabla (definiciones de Eustat,
datasets EU de Open Data Bizkaia/datos.gob.es, capas/servicios
geo.bizkaia.eus y geo.euskadi.eus, valores de DPD oficiales, documentos
normativos). **Euskalterm no fue consultado como servicio**: su
formulario en vivo no es consultable por script y ninguna fila de la
tabla afirma provenir de una ficha Euskalterm concreta. Cuando una
coincidencia con Euskalterm se infiere, es por uso del término en fuente
oficial, no por ficha identificada.

Esto NO es revisión lingüística humana ni certificación: verifica que cada
término técnico elegido existe con ese significado en la fuente citada en
su fila — no en «Euskalterm» en abstracto.

## Términos verificados

| Término en `eu.ts` | ES pretendido | Fuente consultada | Resultado |
|---|---|---|---|
| eraikuntza-urtea | año de construcción | Ficha Eustat «Eraikinaren eraikuntza-urtea» (eustat.eus/documentos/opt_1/tema_24/elem_26996/definicion.html) | CONFORME — definición oficial: «eraikina eraiki zen urtea» |
| atari / ataria | portal (nº de edificio) | Campo `Atari-gakoa` del CSV oficial; «Atari Ofizialak» en «Euskal Autonomia Erkidegoko kale-izendegia» (opendata.euskadi.eus) | CONFORME |
| kale-izendegia | callejero oficial | Nombre EU oficial del dataset NORA/EUSTAT («Euskal Autonomia Erkidegoko kale-izendegia») | CONFORME (sustituye a «geokodetzailea», que era descripción inventada) |
| ortoargazki | ortofoto | Nombre de capa WMS_ORTOARGAZKIAK (geoEuskadi) | CONFORME |
| errolda | padrón municipal | «Udalerriko errolda» (Eustat) | CONFORME |
| zentso | censo | «Eraikinen eta lokalen zentsua» (Eustat) | CONFORME |
| estaldura | cobertura | «Estaldura geografikoa» en metadatos (datos.gob.es) | CONFORME |
| lurzoru / hiri-lurzoru / lurzoru urbanizagarria | suelo / suelo urbano / urbanizable | DPD oficial «PlaneamientoUrbanistico» (opengis.bizkaia.eus): valores «Hiri-lurzorua», «Lurzoru urbanizagarria», «Lurzoru urbanizaezina» | CONFORME |
| oinplano / oinplano-azalera | huella en planta | Uso consolidado en literatura técnica («oinplano-atlas», «oinplano angeluzuzena»); no hay ficha Euskalterm aislada localizada | ACEPTABLE — sin ficha; uso documentado |
| kanpaina | campaña (ortofoto) | «argazki-kanpaina» atestiguado en euskadi.eus/prensa | CONFORME — uso genérico, no ficha fotogramétrica específica |
| udalerri | municipio | Uso generalizado oficial (Eustat, opendata) | CONFORME |

## Discrepancia encontrada y corregida

| Término erróneo | Pretendía | Corrección aplicada | Fuente |
|---|---|---|---|
| **jende-basoa** | «monte público» | **baso publikoa** | El título EU oficial del dataset citado es «Bizkaiko baso publikoak» (datos.gob.es/eu/catalogo/l02000048-montes-publicos; capa «Baso Publikoak» en el DPD). La norma foral vasca usa «mendi publiko» («mendi publiko nahiz pribatuen sailkapena», NF 7/2006 Gipuzkoa). «jende-basoa» no está atestiguado; Elhuyar da «herri-baso» = *monte comunal*, figura distinta |
| **geokodetzailea** | descripción de NORA | **kale-izendegia** | NORA no se denomina oficialmente «geocodificador»; su dataset es el «kale-izendegia» (callejero) |

Ambas corregidas en `app/src/lib/i18n/eu.ts` (7 ocurrencias de «jende-baso» →
«baso publiko»; 4 de «geokodetzaile*» → «kale-izendegi*»).

## Decisión final: «baso publiko» vs «mendi publiko»

Tres términos atestiguados para conceptos próximos pero distintos:

| Término | Significado | Estatus |
|---|---|---|
| **baso publiko** | «bosque/monte público» — título EU oficial del dataset citado («Bizkaiko baso publikoak», Open Data Bizkaia / datos.gob.es L02000048; capa «Baso Publikoak» del DPD) | **ADOPTADO** — coherencia con la fuente que la app cita por nombre |
| **mendi publiko** | «monte público» en sentido jurídico-foral (normas forales; capa «Mendi Publikoak» de geo.bizkaia.eus; salida de Itzuli) | atestiguado — alternativa válida si el copy hablara de la figura legal, no del dataset |
| **herri-baso** | «monte comunal» (Elhuyar) — figura de titularidad vecinal, distinta | no aplicable |

Regla aplicada: donde el copy nombra el dataset se usa «baso publiko»;
«jende-basoa» queda descartado de forma permanente (no atestiguado).

## No contrastado

- Equivalencia frase a frase completa (gramática, orden, naturalidad):
  requiere Itzuli u otra traducción automática completa, o revisión humana.
  Ver `itzuli.md` para el estado del intento de contraste frase a frase.
- Niveles de registro oral/escrito y variantes dialectales.
- Corrección de declinaciones en frases completas (los sufijos sobre nombres
  comunes se revisaron manualmente contra patrones de batua, no contra
  gramática automática).
