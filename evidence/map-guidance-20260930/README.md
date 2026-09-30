# Mapa y euskera — 30 septiembre 2026

## Decisiones y fuentes

Se hacen explícitos zoom, selección de zona/edificio y navegación con teclado,
ratón y dedos; se añade recuperar el encuadre municipal. No se añaden modos,
datos, backend ni servicios comerciales. Las métricas y geometrías no cambian.

Referentes oficiales consultados para orientación y ayuda contextual:
[geo.admin.ch](https://www.geo.admin.ch/fr/visualiseur-de-cartes-navigation-et-orientiation),
[cartes.gouv.fr](https://cartes.gouv.fr/aide/fr/guides-utilisateur/visualiseur-cartographique/generalites-visualiseur/).
Son referencias de interacción; no se copia código ni material gráfico.

## CARTO

[Condiciones oficiales](https://www.carto.com/legal/basemap-terms/), actualizadas
el 29 de septiembre de 2026: el servicio gratuito requiere una API key; las
solicitudes sin autenticación pueden recibir una marca visible. **No usamos ese
servicio**. MapView usa el export de geoEuskadi y PMTiles propios; worker y
glifos son locales. La CSP no permite hosts CARTO.

[Captura pública inicial](before/report.json): 636 solicitudes en mapa, tiempo,
foto, histórico y cortina; cero hosts CARTO. No prueba disponibilidad permanente
ni activación completa de cada capa histórica. El nuevo QA comprueba otra vez
los hosts mientras usa los controles, y conserva todos los pageerrors.

## EU: asistencia y decisiones

Se usa [LATXA](https://www.apps.euskadi.eus/latxa/), servicio público presentado
por el [Gobierno Vasco](https://www.euskadi.eus/latxa-un-modelo-de-lenguaje-de-gran-tamano-en-euskera-basado-en-ia/web01-a2eutres/es/),
y [Xuxen](https://xuxen.eus/). Solo se envía copy público, sin credenciales ni
datos personales. No se usa una API de pago. Itzuli se inspeccionó, pero no se
usaron traducciones suyas.

LATXA recibió las 566 entradas en 13 lotes; se conserva el texto enviado, la
respuesta y el hash del archivo en [language/full](language/full/summary.json).
«captured» significa respuesta capturada, no aprobación de todos los textos.

Xuxen procesó los lotes 01–08. El primer intento 09–13 capturó spans del editor,
no una corrección terminada: sus flags cero **no son un resultado válido**.
La [repetición](language/xuxen-recheck/summary.json) esperó los spans con id del
resultado y obtuvo marcas en los cinco lotes. Así quedan cubiertas las 566
entradas, con ambos intentos preservados. Nombres, variables, unidades y términos
especializados producen falsos positivos; no se acepta cada marca como error.

Se corrige `bakotxera` → `bakoitzera`, `parzelarioa` → `partzelarioa`,
`Catastrok` → `Katastroak`; se conserva el nombre propio Open Data Bizkaia.
Se normaliza zentsu y sus formas, según [Eustat](https://eu.eustat.eus/productosServicios/catal_02_e.html).
«ingeradak» para contornos se contrasta con el documento de
[Bizkaia](https://www.bizkaia.eus/documents/880307/15187815/eu_3_2016.pdf),
descargado y leído: página 17, [copia](language/terminology-bizkaia.pdf).
Se simplifica la frase sobre movimiento del mapa y se alinean cinco entradas
con los intervalos/cifras actuales en ES. Los cambios son manuales.

Se rechazan propuestas de LATXA que quitan «egungo», eliminan la condición de
año conocido/geometría, convierten nacimiento en presente, confunden censo con
padrón, cambian variables o traducen el identificador oficial «Edificio».
También se rechaza traducir «Bis» como «Bisita»: cambia un dato de dirección.
El cotejo de números literales y los contratos de variables no certifican
gramática. **EU_NATIVE_REVIEW sigue REQUIRES_HUMAN**.

## Intentos locales

`nav-dev-3/report.json`: 13 checks PASS de desarrollo, antes del ajuste de fila
de acciones y de añadir gestos. Los intentos `nav-dev`, `nav-dev-2` y
`nav-dev-final` fallaron esperando carga/controles en Vite y se conservan; no
se cuentan como verificación del artefacto final. La verificación de publicación
se registra por separado con el SHA exacto en RELEASE.md.
