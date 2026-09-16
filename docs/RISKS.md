# RISKS — riesgos, test, fallback

Probabilidad e impacto: `L` baja · `M` media · `H` alta.
Cada riesgo tiene un **test** que lo verifica y un **fallback** si falla.

## R-01 CORS / consumo directo de ortofotos en navegador

- **Descripción:** el navegador puede bloquear WMS/WMTS por CORS o cambiar cabeceras.
- **Probabilidad:** L · **Impacto:** H
- **Estado (verificado 2026-09-16):**
  - `geo.bizkaia.eus` (tiles Catastro/ortofoto) devuelve `Access-Control-Allow-Origin`
    reflejando el `Origin`. ✅
  - `www.geo.euskadi.eus` devuelve `Access-Control-Allow-Origin: *`. ✅
- **Test:** en G0, cargar una tesela de cada origen desde un `Origin` real y desde un
  dominio de build; comprobar en Chrome/Edge/Firefox/Safari.
- **Fallback:** seleccionar el servicio oficial más estable; si fuera imprescindible,
  caché propia derivada **solo** con licencia que lo permita y atribución conservada
  (ADR-004). Nunca proxy permanente sin evidencia.

## R-02 Cambio de nomenclatura de capas WMS (geoEuskadi)

- **Descripción:** geoEuskadi cambió nombres de capa (espacios/guiones → `_`) en 2026-06.
- **Probabilidad:** M · **Impacto:** M
- **Test:** validar en cada build que `WMS_ORTOARGAZKIAK` contiene las capas esperadas
  (`ORTO_2025`, …) y que `GetMap` responde 200.
- **Fallback:** resolver el nombre de capa leyendo `GetCapabilities` en build time y
  generar un mapping versionado; si una capa desaparece, mantener la UI con mensaje
  explícito y usar la campaña adyacente.

## R-03 Latencia / disponibilidad de WMS no cacheado

- **Descripción:** 2004–2025 llegan por WMS `GetMap` (sin caché en origen).
- **Probabilidad:** L/M · **Impacto:** M
- **Estado medido (2026-09-16):** `ORTO_2025` en `EPSG:3857` devuelve **imagen real** a
  **≈40 ms/tesela 256 px** (frío 41 ms); **24 teselas con 8 workers en 0,34 s**, 0 en blanco.
  Respuesta `Cache-Control: private`, `Access-Control-Allow-Origin: *`.
- **Test:** en G0 medir además 512 px, varios zooms y sesión móvil.
- **Fallback:** mostrar placeholder con mensaje y mantener el mapa base; la **caché propia
  es legalmente viable** porque geoEuskadi publica bajo **CC BY 4.0** (atribución visible),
  pero solo se implementa si las mediciones lo justifican (ADR-004).

## R-04 Semántica de campos de Catastro distinta de la asumida

- **Descripción:** nombres y valores reales difieren del encargo (`Ano_Constr`, no
  `Ano_Construccion`; `Ano_Calcul` sin documentar).
- **Probabilidad:** H (ya confirmado) · **Impacto:** M
- **Estado:** corregido y documentado en `DATA_SOURCES.md` §1.3 y `DATA_SEMANTICS.md`.
- **Test:** `tests/data` verifica el esquema observado.
- **Fallback:** si `Ano_Calcul` no se documenta, queda prohibido como métrica (ya lo está).

## R-05 Cobertura de `Ano_Constr` desigual entre municipios

- **Descripción:** Leioa tiene 99,79 %; otros municipios pueden tener cobertura baja.
- **Probabilidad:** M · **Impacto:** H
- **Test:** medir cobertura en cada municipio del ámbito en G0/G1 (`coverage_pct`).
- **Fallback:** mostrar la cobertura siempre junto a la cifra; activar aviso < 90 %;
  disclaimer reforzado < 70 %. No ocultar el dato.

## R-06 Valores centinela / heaping en años

- **Descripción:** años como 0, 1500, 1640; acumulación en acabados en 0/5.
- **Probabilidad:** H (ya observado: 29 % acabados en 0/5 en Leioa) · **Impacto:** M
- **Test:** informe QA de heaping y fuera-de-rango por municipio.
- **Fallback:** clasificar como `UNKNOWN` y documentar; nunca "limpiar" en silencio.
  Comunicar el heaping en *Cómo lo sabemos* cuando distorsione el histograma.

## R-07 Rendimiento a gran escala (100k+ edificios)

- **Descripción:** intentar dibujar toda Bizkaia a zoom bajo degradaría la experiencia.
- **Probabilidad:** M · **Impacto:** H
- **Test:** presupuestos de rendimiento medidos en G0 (JS inicial, primer mapa usable,
  latencia de tiles, memoria, móvil).
- **Fallback:** agregados por celda/municipio a zoom bajo; edificios individuales solo a
  zoom urbano; PMTiles multizoom.

## R-08 Fechas reales de vuelo desconocidas

- **Descripción:** los metadatos CKAN no publican el rango real del vuelo de cada campaña.
- **Probabilidad:** H · **Impacto:** L/M
- **Test:** intentar localizar la fecha en Fototeca geoEuskadi / IGN PNOA histórico.
- **Fallback:** mostrar el año nominal y una nota de que puede corresponder a un rango.

## R-09 Límites municipales sin dataset directo

- **Descripción:** no hay dataset de límites municipales completo en Open Data Bizkaia.
- **Probabilidad:** M · **Impacto:** M
- **Test:** comprobar WFS `Katastro_Catastro_WFS:Municipios` y ensamblado desde ZIP.
- **Fallback:** usar límites IGN/CNIG, documentando la fuente distinta.

## R-10 Ambigüedad de interacción (dos sliders, filtros solapados)

- **Descripción:** varias nociones de tiempo/filtro en pantalla confunden.
- **Probabilidad:** L · **Impacto:** M
- **Test:** pruebas de usabilidad; revisión de copy.
- **Fallback:** un único control temporal; eliminar la interacción ambigua.

## R-11 Privacidad

- **Descripción:** pedir «año de nacimiento» puede percibirse como dato personal.
- **Probabilidad:** L · **Impacto:** M
- **Test:** revisar que el año no se envía a ningún servidor ni se guarda.
- **Fallback:** todo el estado vive en la URL del cliente; sin cookies; copy de privacidad.

## R-12 Dependencia de servicios externos en la demo de entrega

- **Descripción:** un servicio oficial caído durante la evaluación.
- **Probabilidad:** M · **Impacto:** H
- **Test:** probar en G5 con servicios simulados caídos.
- **Fallback:** degradación elegante con mensajes (`UX_COPY.md` §9); considerar
  snapshot local de las ortofotos más críticas si la licencia lo permite.

## R-13 Alcance (feature creep)

- **Descripción:** añadir capas/datos por estar disponibles.
- **Probabilidad:** M · **Impacto:** M
- **Test:** revisión contra `PROJECT_CHARTER.md` §7 (no-objetivos) en cada gate.
- **Fallback:** una capa entra solo si resuelve un capítulo o métrica concreta y queda
  documentada en `DATA_SOURCES.md`.

## R-14 WAF bloquea el datastore del portal

- **Descripción:** `www.opendatabizkaia.eus/api/3/action/datastore_search` y `/download/`
  devuelven `Request Rejected` (WAF) desde la red usada en P0.
- **Probabilidad:** M (red-dependiente) · **Impacto:** M
- **Test:** en G0, probar desde otra red/CI (spike S-2) y comprobar si el datastore CSV es
  accesible y si contiene `Ano_Constr`.
- **Fallback:** ingesta por **ZIP de `opengis.bizkaia.eus`** (verificada) + `ST_Read`.
  No se asume que el datastore esté caído en general: es una limitación de entorno.

## R-15 El WMS responde 200 en errores y puede devolver imagen en blanco

- **Descripción:** un `layers` inválido devuelve **HTTP 200 con XML `ServiceExceptionReport`**;
  un bbox/CRS incorrecto devuelve una **imagen blanca válida** (`image/jpeg`).
  Verificar solo «HTTP 200 + image/jpeg» es insuficiente (error cometido y corregido en P0).
- **Probabilidad:** H · **Impacto:** M
- **Test:** en G0, validar el `content-type` y **que la imagen tenga contenido**
  (p. ej. > 1 color único) para cada campaña usada.
- **Fallback:** detectar XML de error y blancos ⇒ usar la campaña adyacente y/o el origen
  alternativo, con mensaje explícito al usuario.
- **Lección de proceso:** documentar en `AGENTS.md` que una respuesta «correcta» no prueba
  contenido correcto.

---

# Riesgos incorporados en G1

## R-16 El hosting elegido no soporta HTTP Range

- **Descripción:** PMTiles **exige** `Range`/`206`. Un hosting que sirve el fichero completo
  rompe el source `pmtiles://` (fallo real reproducido en G0 con un servidor sin Range).
- **Probabilidad:** M · **Impacto:** **H** (bloquea la entrega del mapa)
- **Test:** smoke test de despliegue (`docs/gates/G1.md` §DEPLOYMENT): `Accept-Ranges`,
  `206`, `Content-Range`, MIME, lectura real de una tesela desde el host.
- **Fallback:** cambiar de host. **No** se acepta degradar a descarga completa del fichero.

## R-17 La métrica de celda cambia el mensaje del mapa

- **Descripción:** conteo de edificios y huella edificada divergen; medido en G0:
  divergencia media **14,8 pts**, 25 % de celdas con > 20 pts y **25 % de celdas cambian de
  clasificación** «mayoritariamente nueva» según la métrica.
- **Probabilidad:** **H** (ya cuantificado) · **Impacto:** M
- **Test:** coherencia de `C-05` entre titular y celda; la huella (`C-08`) solo aparece en
  tooltip, etiquetada.
- **Fallback:** si la revisión humana prefiere la lectura física del territorio, se cambia la
  métrica primaria **con enmienda**, no se mezclan.

## R-18 Celdas con pocos edificios dan cifras inestables

- **Descripción:** 36 de 168 celdas de la muestra (21 %) tienen < 15 edificios con año;
  una celda de 9 edificios puede pasar de 24 % a 89 % según la métrica.
- **Probabilidad:** H · **Impacto:** M
- **Test:** marca `CELL_LOW_N` y copy de fiabilidad en el tooltip; conteo publicado.
- **Fallback:** subir el tamaño de celda si la revisión lo considera necesario (exige
  regenerar artefactos y re-medir budgets).

## R-19 La ciudadanía lee picos anuales como «booms»

- **Descripción:** 29–44 % de los años acaban en 0/5 (evidencia G0). Una curva anual
  sugeriría una precisión inexistente.
- **Probabilidad:** M · **Impacto:** M (riesgo reputacional y de rigor)
- **Test:** la vista principal es por décadas; el disclosure de heaping está junto a la
  distribución; el copy prohíbe «boom».
- **Fallback:** reforzar el disclosure en `Cómo lo sabemos` con el detalle por municipio.

## R-20 Ambigüedad estadística al cambiar de escala

- **Descripción:** un mapa multiescala que reescribe la estadística al hacer zoom es
  atractivo y estadísticamente indefendible.
- **Probabilidad:** M · **Impacto:** **H** (afecta al 25 % del rubric, «calidad y comprensión»)
- **Test:** criterio `U4` de `docs/gates/G1.md` (el texto del ámbito no cambia en 5 cambios de
  zoom) y `M2` (0 recálculos).
- **Fallback:** fijar el universo en el estado y **prohibir** que el mapa lo escriba.

## R-21 La ortofoto no cubre el punto elegido y se lee como error

- **Descripción:** la cobertura es **por campaña**; la campaña 1975 no cubre parte de Bilbao
  ni Murueta (404 real, G0).
- **Probabilidad:** **H** (demostrado) · **Impacto:** M
- **Test:** estados `NOT_COVERED` y `SERVICE_ERROR` alcanzables y distinguibles; copy distinto.
- **Fallback:** ofrecer alternativas **solo** si su cobertura se ha verificado; nunca sustituir
  en silencio.
