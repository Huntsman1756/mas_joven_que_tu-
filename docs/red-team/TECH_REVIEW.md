# Revisión técnica

2026-09-27. Auditoría de producto, código y evidencia; no pentest externo ni certificación. No modificaciones de código, dependencias, permisos, datos publicados o configuración remota. Build local generado para comprobación; solo docs/red-team queda nuevo en Git.

## Baseline comprobada

|Elemento|Resultado|
|---|---|
|Rama|`g11-visual-renewal`|
|HEAD|`0a2c7f6dd52eda880a0f2d5a6eb6ae5f98582d35`|
|Último producto app/src|`9a1a782eee807a026e9132876ad7e8f0fe8bce30`|
|Posteriores|4 f 406 a 5 documental;0 a 2 c 7 f 6 añade probes/scriptsQA y evidencia, **no solo documentación**|
|Producción|https://huntsman1756.github.io/mas_joven_que_tu-/|
|Pages|Legacy, rama gh-pages/root;SHA`df842fb97818243fbf2d5feaf0d9e0fd3f4e5133`;build 25 sept 21:40:55 Z|
|Atribución fuente|Mensaje del commitPages dice fuente 1848 c 74. No equivale a atestación criptográfica de todos los artefactos|
|CI más reciente consultado|run 36216032651, HEAD54 e 35194067002 d 56841549 bbafc 28 bd 744 ca 107;data/app éxito, E2 Efallo|
|Working tree|Limpio antes; después solo `?? docs/red-team/`|

Evidencia: git-log/status, pages, pages-build, ci-runs/failed-jobs/failure. El rollback podría recuperar una revisión de gh-pages, pero **no se ha ejecutado un simulacro**. Rama gh-pages sin protección; permisos Actions por defecto read y sin aprobarPR. No hay workflow de deploy en `.github/workflows/ci.yml`: CI verde no demuestra qué se publica. No se consultaron valores de secretos.

## Arquitectura e inventario

Frontend Svelte 5/SvelteKit 2.70.3, adapter-static 3.0.10, TypeScript, Vite 6; MapLibre 6.10.0, PMTiles 4.5.0, LucideSvelte. Dos rutas prerender `/` y `/como-lo-sabemos`; sin backend de aplicación. Node≥20 (CI20), Python≥3.11. Versiones transitorias contrastadas con lock/package actuales, no recomendación de actualizar por popularidad.

Pipeline Python/DuckDB Spatial y tippecanoe en Docker fijado. FamiliasG0 descubrimiento/viabilidad, G1 catastro/agregados, G2 selección editorial, G3 planeamiento/contexto/direcciones, G4 índices, G5 población, G6 series/callejero, G7 miniaturas. Tests de datos, unitarios dominio/copy/locale, servidorRange y sondas de navegador. Documentación/gates/ADRs y evidencia histórica abundantes; no se consideran por sí mismos prueba de la versión actual.

Datos publicados:catalog, municipalities, metrics 112, cells, buildings, building-index, planning, context, streets, population, previews, hero, story-thumbs; PMTiles cells/municipalities y archivos por municipio. RawZIP e interim ignorados; parquet derivados y evidencias sí aparecen versionados. Fuentes Catastro/ODB principales; geoEuskadi, NORA, Eustat complementarias. No se detectó necesidad de backend, PostGIS o IA.

## Pruebas ejecutadas ahora

|Comprobación|Resultado y límite|
|---|---|
|npm check|0 errores,2 warnings estado inicial capturado en AddressSearch/CompareYear|
|npm lint|0 errores,5 warnings variables sin uso en scriptsQA|
|format:check|PASS|
|npm test|24 archivos/244 Vitest+15 tests servidorNode PASS|
|npm build|PASS, adapterstatic;warningchunk>500 k;build local sinBASE_PATH dePages|
|pytest tests/data|45 PASS|
|Invariantes 112 JSON|sum(dist.n)=c 02=último acumulado en 112;139447 total/138501 válidos/10 unknown/936 suspicious/0 invalid|
|Hashesraw|020/054/908 ZIP local coinciden con registroG0; no se recalcularon 112 hashes|
|npm audit|3 entradasLOW por un advisorycookie;1 alertaDependabot abierta|
|Axe producciónfoto móvil|0 violaciones,4 nodoscolorcontrast inconclusos|
|Axe localswipe móvil|0 violaciones,8 nodoscolorcontrast inconclusos|

No se ejecutó pipeline completo, ni E2 Ecompleto actual, ni builds limpios en otra máquina. No convertir resultados históricos de fixtures en validación de servicios reales actuales. `g18_now_follows` puede comparar dos ticks diferentes porque lee cabezal yDOM por separado durante playback; es una hipótesis apoyada en código, no fallo adjudicado. No se alteró el test para ponerCIverde.

## Frontend, estado y ciclo de vida

Fortalezas: estado central explícito, parserURL con años decimales/rangos/cámara validada, pausa al cambiar de modo, secuencias para descartar respuestas antiguas, AbortController en sondas, cachés de datos que eliminan promesas rechazadas. ResizeObserver dePhotoPanel se desconecta. StoryChapter respeta reducedmotion; MOB-R2 ancla stage solo por evento explícito, no cada render. VisualViewport tiene módulo/test propio. No pedir una reescritura de Svelte por tamaño de archivos.

Defectos concretos: foto inicial desactivada aunque muestra campaña; `applyCampaign(null)` no activa imagen; `ViewSwitch` no cambia orthoVisible al entrarphoto. `enginePromise` no borra rechazo como sí hace metricsCache: riesgo reconexión, pendiente de reproducción. `fetchJson<T>` confía en tipoTS yJSON sin validación de esquema, mientras callejero sí valida. Son cambios acotables si se demuestra impacto; no justificación para refactor global.

URL/deeplinks: casosgolden y modos observados; `lat=999` local conserva municipio/año y muestra aviso explícito, confirmado en bad-camera-dom. `year`, place, lat, lon, z, ortho/ortho 2, building, play, view, compare, story se serializan; locale se guarda enlocalStorage. Ticktemporal no debe crear una entradaHistory porframe. Back/forward completo y carreras tras reconexión solo tienen evidencia histórica/test, no nueva cobertura total.

## Cadena de datos SOURCE→RAW→TRANSFORM→EXPORT→UI

|Fuente|Raw/transformación|Export/UI|Verificación/límite|
|---|---|---|---|
|CatastroODB ZIP|112 descargas conhash en recon-bizkaia;SHP Edificio;Ano_Constr literal→clasificadorPython/SQL;ST_MakeValid con registro|Parquet, GeoJSON, PMTiles, dist/cum, headline|Invariantes 112 y 3 hashes; no descargar de nuevo todo ni mezclar cortes|
|Límitesmunicipales|Municipio/catálogoNORA y geometría|GeoJSON ligero/PMTiles/borde|IDs municipales/provincia explícitos; no deducir ámbito por viewport|
|OrtofotosODB/geoEuskadi|Catálogo de campañas, fecha nominal/vuelo;sonda imagen real|RasterWMTS/WMS/tiles y pre view|1956/1923–25/swipe con contenido observados;1945 enfoto inicialmente no solicitado|
|PlaneamientoODB|Snapshots+solapes/uso actual|JSONmunicipal yfacets|No previsão ni uso histórico;pipeline no rehecho|
|ContextoODB|Montes, ruido, paradas, solape/proximidad|JSONlazy y geometrías opt-in|No causalidad ni medición puntual de ruido|
|Eustat|PXWeb/censo+padrón;operaciones separadas|eustat-population yconstants.population|Snapshot/revisión de código;API no necesaria en runtime|
|NORA/callejero|Catálogo local y servicio portal/edificio|Búsqueda en sesión, matching municipalexacto|204 sin resultado,10 stimeout, ambigüedad declarada;no visita privada usada|

Números:after=c 02−cum(≤year);huella usa geomválida/año conocido;0 no se vuelve 1900. `metrics.ts:43` devuelve 0 si c 02=0: **potencial semántico** a vigilar al introducir universos sinválidos; ninguno de los 112 comprobados originó un headline falso por este caso. No confundir este potencial con RT04, que sí está reproducido.

Geometría: transformado desdeSHP aCRS84; celdas 500 m encoordenadas proyectadas por centroide; no reparto de huella entre celdas. Reparación conserva hashoriginal, áreasantes/después, motivo genérico y resultado, original recuperable desdeZIP. Ese motivo genérico no es un diagnóstico topológico de tal lado. MD5 aquí esidentificador de geometría, no autenticación de descarga. El digest del inventario 176 URLs no reemplaza los 112 SHA deZIP, que **sí existen**: se retiró la hipótesis de ausencia total dehashes al encontrarlos.

Reproducibilidad **PARTIAL**: frontend construye aquí; inputs locales disponibles; no ensayo unclonlimpio. Python usa rangos, extensiónSpatialruntime;README/AGENTS recetaG1 incorrecta (`--only` frente a argumentos posicionales y pre ingesta omitida). Archivar snapshot y receta completa antes de proclamar FULLY_REPRODUCIBLE.

## Dependencias runtime y caída durante evaluación

|Servicio|Propósito|Timeout/retry/fallback/cache|CORS/contenido/privacidad|
|---|---|---|---|
|GitHubPages|HTML, JS, JSON, fuentes, PMTiles|JSON15 s;promesas deduplicadas;sinmirror operativo probado|Range 206 observado;hosting conoceIP/URL;httpsenforced|
|NORA geoEuskadi|Municipios/direcciones/portales|10 s+Abort;municipioslocales siguen;dirección puede fallar|CORS permitióconsulta municipal;texto/identificadores enviados a GobiernoVasco|
|opengis.bizkaia.eus|Ortohistórica/cartografía|Sonda+estados;otras campañas verificadas pueden ofrecerse|1956 ymapa histórico con imagen;recibeIP/teselas|
|geo.euskadi.eus|Orto 1945/otras/2004–25 y base cartográfica|Sonda contenido, no soloHTTP;fallo no implica cerodato|Swipereal;proveedor recibeIP/BBOX/tiles|
|Eustat|Adquisiciónpoblación/callejero|Snapshotprimero|Sin dependenciaPXWeb al abrir resultado|
|CatastroODBZIP|Pipeline|Rawcache/hash;no descargaedificios en runtime|Licenciaporrecurso;actualizacionesdeorigen no equivalen a actualizar release|
|Fuentes/CDN|Fuentes autoalojadas;workerlocal|Cachebrowser|NoGoogleFonts runtime encontrado en flujos examinados|

Caos seguro: se intentó bloqueoCDP de dominios en local, pero siguió apareciendoimagen 1956. **Prueba no válida; no PASS de degradación**, captura 18 preserva el contraejemplo. Tests de dominio yCIhistórico sí cubren errores, pero no sustituyen ensayo actual de redcortada. Pendientes: rasterlento/caído verificado, NORAfalla, reconnect, abort/stale, missingmunicipio yfixture sin conocidos enUI. No se sabotearon servicios públicos. Badcamera sí validado. La foto vacía inicial esestado por diseño, nochaos.

## Rendimiento y bundle

Muestras producción medianteCDP, cache deshabilitada;desktop libre y 390×844 conCPU4, perfiles solicitados 1,6 Mbps/80 ms y 0,4 Mbps/150 ms. Una corrida por perfil, navegador compartido; no Lighthouse niCrUX niINPde campo. Eventos incluyen `paintTime` y `presentationTime` muy separados: no atribuir todo a la app ni comparar estosLCP como benchmark estable. TTFB~5 ms en perfileslimitados tampoco acredita 80/150 ms end-to-end: proxy/caché/interposición requieren calibración.

|Muestra|LCP registrado|paint del último candidato|CLS acumulado sin input|Longtasks|TTFB nav|
|---|---:|---:|---:|---:|---:|
|Desktoplibre|3048 ms|2008 ms|0,0084|2, máx 116 ms|150,6 ms|
|Móvil 4 G-ish|24528 ms|8494 ms|0,0190|2, máx 770 ms|5,1 ms|
|Móvillenta|31268 ms|30264 ms|0,0197|6, máx 691 ms|5,3 ms|

Estas mediciones detectan carga cara, **no cierran PERF4 ni un gate nuevo**. No cambiar umbrales históricos. Evidencia robusta debytes: heroJPEG574728+734707=1309435 bytes; MapLibre 1066489 decoded/~291448 transferidos en primera visita con resultado; fuentesprecargadas~119 k. El motor eslazy yjustifica un chunk grande; no se ha demostrado duplicación niLucidecompleto enbundle. Buildchunkwarning noesfalloporsísolo. Recomendación acotada: imágenesresponsive antes de refactorizar motor. No se midiómemoria sostenida/INP ni se atribuye leak sinperfil.

## CI, repo y supply chain

Pirámide real:244 dominio/copy/locale,45 datos,15 servidor;E2 EChromium variosscripts conCI_STUBS=1;gates físicos fueraCI. CI no corre todas las sondasone-off ni navegadorSafari/Firefox real. Assertions con temporizadores y capturas históricas necesitan adjudicación, no conteo.

Último fallo sube 3056 archivos y 573167741 bytes, porqueupload apunta a evidenceentero. git pack 597670 KiB+loose 97575 KiB; mayorarchivoactual 61,7 MB source-matrix. Reducir uploads futuros, no historyrewrite. No se inspeccionó cada blobhistórico buscando secretos.

Advisory[cookie GHSA-pxg 6-pf 52-xh 8 x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)LOW:serialización de nombre/path/domain no confiables. Hosting estático sinservidorCookies deKit, por tanto no se demostró vía explotable en producción. `npm audit fix` propone downgradespre 1.0: rechazarlos como recomendación automática. Licencias software comprobables enOSS_REUSE ypaquetes; la revisión no certifica cada transitoria. Datosrequieren suslicencias propias.

## Seguridad y privacidad: threat model ligero

Activos: integridad de cifras/artefactos, consulta de lugar, dirección, disponibilidad ycredenciales de entrega. Fronteras: URL→estado;NORA→UI;serviciosimágenes→canvas;fuentes→pipeline;GitHubbuild→Pages. Atacantes plausibles: enlace manipulado, respuesta externa malformada, dependencia/credencialcomprometida. No se hicieron pruebas activas contraNORA/ODB ni fuzzing público.

Lectura `app/src`: no usos encontrados de `@html`, innerHTML, eval/newFunction;textoSvelteescapado;queryencoded yslugsdeprecarga filtrados. CSPhash conself, hostsGISacotados, objectnone, formself, workerself/blob;no mixedcontent observado. No afirmar que CSPmeta cubre protecciones solo válidas enheaders. Clipboard solo por acción;errorhandled. Noanalítica/cookies deapp observadas;localStorage `mjt-lang`. Proveedores pueden registrar solicitudes: no prometer ausencia delogs externos.

Direcciónliteral no se persisteenURL, pero cámara/edificio/año sí pueden compartirse. Esa combinación puede serinformativa sobre una persona: RT11 es una corrección de transparencia, no una conclusión jurídica automática de infracción. Revisión basada encomportamiento ycampos, noasesoramiento sobre cumplimiento integral.

PipelineTLSverificado por defecto; opt-ininseguro explícito allowlist ytraza. En `g0_recon.py:56–59`cache existente devuelve tls=True sin consultar evidenciaoriginal: **riesgo de etiquetar procedenciaTLS como verificada al reutilizarcache**. No hay prueba de interceptación ni de uso inseguro en esta corrida; registrar como RT22 P2, arreglable sin debilitarTLS.

## Compatibilidad real y cobertura

|Plataforma|Evidencia actual|Resultado|
|---|---|---|
|BraveChromiumdesktop|Producción,5 modos, goldencases|Observado; no sustituyeChrome puro|
|ChromeAndroid 109/API33|QA/Maestro previo sobreproducción 1848 c 74;fallbackany|Heredado, no rerun físico|
|iOSSafari|MOB-R1/R2 documentado, candidato 9 a 1 a 782 pendiente|NO PASS actual|
|SafarimacOS|Sininstancia utilizable en esta sesión|NOT_TESTED|
|Firefox|Unit/código no equivalen aFirefox|NOT_TESTED|
|Edge/Chromecurrent|Motorrelacionado, no ejecución independiente|NOT_TESTED|

AbortSignal.timeout sin fallback exige baseline documentada;any sí tiene fallback. VisualViewport tienefallback/test;ResizeObserver, PointerEvents, Clipboard, matchMedia, History, svh/dvh deben verificarse sobreversiones soportadas. No se aplicaron cambios de compatibilidad duranteFASEA. Matriz de todos losbrowsercomoPASSsería falsa.
