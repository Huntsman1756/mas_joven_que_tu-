# Entrega, concurso y reproducibilidad

**Estado: NO READY para entregar tal cual.** No se ha presentado solicitud ni publicado cambios. Encaje de producto en Visualización razonable; elegibilidad personal yexpediente administrativo no verificados. Fecha normativa 20 noviembre 2026,13:00 h. [Contrato oficial](CONTEST_2026_CONTRACT.md).

## Checklist porobligación

|Elemento|Obligatorio oapoyo|Estado comprobado / acción pendiente|
|---|---|---|
|Solicitud en modelo oficial|Base 6|No preparada con identidad;tramitar encanaloficial|
|Categoríaúnica|Base 1.4|Visualización recomendada;no duplicar mismo proyecto enotras|
|Participantes 18+, requisitosNF5/2005/igualdad|Base 2|No se puede acreditar conrepo;revisar declaraciones|
|Grupo≤4 yrepresentante|Bases 2/5/6|Definir si aplica;acreditar representación|
|Pieza yacceso|Bases 1/5|URL existe;versión distinta al candidato|
|Dataset original oprocedencia/acceso|Base 6|Catálogo/manifiestos existen;enlaces y archivo de corte debenquedar claros|
|Proceso/herramientas/técnicas|Base 6|MemoriaDRAFTG5 obsoleta, actualizar|
|Código|Apoyo reproducibilidad, no exigencia literal universal encontrada|Repo público;SHA entrega porfijar|
|Datasetsderivados|Apoyo técnico|JSON/PMTiles/parquet;documentar cuáles viajan ycuáles se regeneran|
|Licencias/autoría|Base 18|Registros existen;no asumir softwarecubre datos;declaración finalpendiente|
|Cuenta/obligacionestributarias/SS|Base 7|Verificaciónadministrativa/oposiciónyjustificantes;no guardar datos sensibles aquí|
|Capturas|Apoyo, no requisito literal general encontrado|Evidencia abundante;seleccionar finalmismoSHA, no miles de archivos|
|Demo/vídeo|Apoyo en Visualización, no obligación de 1,5–5 min|No crearvídeo porconfundir conAudiovisual|
|Publicación/difusiónportal|Base 14|Autorización prevista por bases;no realizar publicación extra por esta auditoría|
|Acto y presentación|Base 19|Preverasistencia/representación;fecha comunicada por organización debe revalidarse|
|Resguardo final|Prueba de entrega|No existe en esta auditoría;guardar tras presentación|
|BOB/correcciones|Contrato oficial|Archivar fascículo 2026 exacto yrevalidar eventuales correcciones antes de cierre|

No convertir cada material deapoyo enexigencia legal. La Base 6 permite procedencia/acceso en lugar del dataset original. La ausencia de documentación técnicapuede limitar rigor; el objetivo no esadjuntar todoelrepo, sino permitir evaluar la pieza.

## Memoria actual: correcciones necesarias

`docs/submission/TECHNICAL-MEMORY.md` llamaDRAFTG5 al producto y describe comparación dedoslienzos con swipe descartado; el producto actualtiene Antes/ahora mediantecortina. Tabla fuentesomite 1945 complementaria; incluye afirmaciones generales de reproducibilidad que necesitan receta actual. READMEdeclaraG1 encurso/G2–G5 preregistrados. Son contradicciones visibles, no archivo histórico irrelevante: sonlaentrada deuna personaexterna.

Actualizar memoria como texto coherente de producto final. Mantener gates históricos talcual. Enlazar `evidence/g0/02-recon/recon-bizkaia.json` para 112 hashesRAW y registro dereparaciones;no citar el inventario 176 URL como si fuera un dataset congeladoconhashporarchivo. TresZIPlocales contrastados coinciden; raws no están versionados, por lo que otra persona necesita acceso/conservación oacceptar fuente viva distinta.

Reproducibilidad:frontend localPASS;datosderivadosPARTIAL;producto completoPARTIAL porfuentesruntime/archivo/versiones/gates. No FULLY_REPRODUCIBLE todavía; tampoco NOT_REPRODUCIBLE: hay código, inputs locales, hashes y contratos útiles.

## Release y contingencia para evaluación

Preparar artefacto firmado/identificable porhash ySHAfuente;nota exacta de qué build recibe el jurado;ensayar URL pública después deldeploy autorizado enFASEB. Buildactual local sinBASE_PATH no prueba elsubpathPages. Pagesparece suficiente para esta arquitectura;no justificar migración porhipótesis. RamaPages sin protección ydeploy fueraCIexigen control operativo, no necesariamente nueva plataforma.

Si proveedorortho falla, conservar resultado catastral y explicar fallo;no reemplazar imagen por otra fecha en silencio. Unpaquete pequeño decapturas/demostración y memoria puede documentar contenidos, pero debe identificarse como evidencia fechada, no como servicioonline funcionando. No construir offline integral ni mirrorpúblico sin necesidad/licencias/alcance acordado. Ensayar recuperación de red yrollback antes de entrega si entran enFASEB;no afirmar que yaestán ensayados.

## JURY_PATH — recorrido propuesto, no implementado

|Tiempo|Qué debería ver|Qué acredita|Estado actual|
|---|---|---|---|
|0–10 s|Pregunta personal+un hallazgo visible+fuente principal|Comprensión ypropósito|Pregunta sí;hallazgo territorialno destacado|
|10–30 s|Ejemplo Bilbao 1922 o consulta propia,85,7% y recuento|Personalización y denominador|Funciona;no usar«exacta»sin matiz|
|30–90 s|Mungia:contar edificios≠huella;mapa y unidad correcta|Sorpresa e interpretación legítima|Existe abajo;unidad pendiente|
|2–5 min|Una comparación aérea con fechas reales ymapa 1923–25 opcional|Dinamismo conpropósito|Swipereal;entrada foto ambigua|
|10 min|Fuentes, método, código, limitaciones y versión entrega|Rigor y transparencia|Profundo, pero memoria/releaseinconsistentes|

No asumir que explora los cinco modos,112 municipios ycinco capítulos. Preparar uncamino corto sin ocultar exploraciónlibre. La memoria puede dar los enlaces aescenas exactas, siempre probados en release.

## Cobertura de las 49 fases pedidas

Fases 0–1:contratoactualBDNS/procedimiento y baseline verificados, conreservaBOB.2:visita ciega con marcas, incluida limitación temporal.3–5/41–42:benchmarkcompetitivo/internacional/matriz, conNTporcapacidad.6–7/19/40:simulación y periodismo.8–18/37:UX/copy/estados/diseño, emulación ydeuda humana.20–36:lectura técnica, testsactuales, mediciones limitadas, infra, supplychain, seguridad ligera, privacidad, SEO, resiliencia.38–39:entrega yrecorridopropuesto.43–48:poda, findings, prioridad, ROI, conservar, TOP5.49:STOP.

**No completado como verificación empírica exhaustiva:** todas las combinaciones debrowser/estado;Safari y Android físicos actuales;NVDAreal;revisión nativa EU;Lighthouse/INPcampo;memory leaks;chaosend-to-endvalidado;regeneración completa desde clon limpio;verificaciónprimariaactualdetodaslaslicencias/endpoints;cadenaBOB2026 exhaustiva. Estas limitaciones sonentregables de la auditoría, no PASS. Deben impedir declaraciones de conformidad total, no impedir documentar los defectos yaobservados.

## Decisión

FASE A termina sin cambios de producto. FASE B recomendada solo para los cinco bloques deTOP_5. Requiere «GO FASE B». No se han enviado mensajes aorganización, competidores ni terceros.
