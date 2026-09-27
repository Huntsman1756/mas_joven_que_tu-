# Siguiente etapa: presentación editorial y entrega

Fecha: 2026-09-27.

## Acuerdo con el usuario y momento de ejecución

El usuario pide conservar las recomendaciones del benchmark para retomarlas
**cuando termine el agente con la ronda técnica anterior (FASE B.1)**.
Este documento es un registro de trabajo pendiente, no una orden para empezar
ahora ni una declaración de que la ronda técnica esté terminada.

No modificar la implementación en curso por estas propuestas. Al retomar:
leer el informe del agente, verificar sus cierres y recuperar el estado real
del candidato. No asumir que todos los hallazgos siguen pendientes ni que
todos están resueltos. Mantener los límites vigentes de publicación y commits.

El usuario también autoriza **valorar** vídeo con audio, imágenes estáticas
(incluida ilustración con IA si aporta valor) y un posible cambio de nombre.
No se ha decidido producirlos ni renombrar el proyecto.

## Recomendaciones que debemos recuperar

1. **Entrada opcional «Ver un ejemplo».** Conservar año y municipio como
   entrada principal y reutilizar un capítulo existente, preferentemente el
   contraste de Mungia. Evitar exigir formulario para entender el valor.
   Comprobar primero si la versión final ya ofrece esta entrada.
2. **Conclusiones de los capítulos existentes.** Pregunta → evidencia →
   hallazgo → límite → siguiente acción. Revisar los cinco casos, sin
   inventar conclusiones ni construir otro visor. La franja «Un hallazgo»
   implementada en FASE B ya cubre parte del problema: no duplicarla.
3. **Demo complementaria de 60–90 segundos.** Grabar el candidato definitivo,
   permitir comprenderla sin sonido y ofrecer transcripción/subtítulos si
   tiene voz. Enlace desde presentación o memoria, sin autoplay ni carga
   pesada inicial. Conservar copia descargable como respaldo. La web debe
   entenderse sin el vídeo.
4. **Paquete de evaluación compacto.** Resumen de una página, memoria técnica
   breve, tres enlaces directos (ejemplo, hallazgo, metodología), cuatro
   capturas seleccionadas (resultado, contraste, antes/después, móvil), URL,
   fecha del snapshot y SHA publicado. Reutilizar y corregir la documentación
   existente; no crear un conjunto paralelo de documentos contradictorios.
5. **«Comprueba este resultado».** Dentro de «Cómo lo sabemos»: numerador,
   denominador, fuente exacta, snapshot, artefacto derivado, procedimiento y
   límites. Valorar un CSV pequeño de los casos editoriales con diccionario,
   generado desde los mismos artefactos; no añadir API ni recalcular con otro
   contrato. La descarga queda detrás de las mejoras de comprensión y entrega.

## Vídeo: referencia aportada por el usuario

Proyecto SalidaCyL, commit:
https://github.com/Huntsman1756/concursos_cyl/commit/a077fc1028440b6f9814739a43aec2e000ccd14c

Comprobado mediante la API de GitHub el 2026-09-27:
- Mensaje: `media: narrate the demo with Ximena in Spanish using Edge TTS (#72)`.
- Incluye MP4 y subtítulos SRT/VTT en `docs/contest/`.
- Incluye `docs/contest/demo-guide.md`, JSON de demo/locución y cambios en
  `scripts/release/buildNarratedDemo.py`.
- Añade `scripts/release/generateEdgeNarration.py`.

**Límite:** se comprobaron metadatos y lista de archivos del commit. No se ha
visto/escuchado el vídeo ni auditado ese código durante esta tarea.

Al retomar, inspeccionar ese flujo antes de crear otro: comprobar licencia,
dependencias, proveedor de voz, reproducibilidad y derechos de los recursos.
No copiar material ni ejecutar instalaciones por el mero hecho de existir
en el otro repositorio. No modificar SalidaCyL.

Guion propuesto, sujeto al candidato real:
- 0–10 s: pregunta e introducción de año/municipio.
- 10–25 s: respuesta, recuento y universo del dato.
- 25–45 s: antes/después con fechas visibles.
- 45–65 s: contraste de edificios y huella de Mungia.
- 65–90 s: fuentes, limitación principal y metodología.

Valorar voz en castellano con subtítulos y transcripción. EU solo con revisión
competente, sin presentar una locución/traducción automática como validada.
No decidir un proveedor nuevo, coste o cuenta sin el alcance correspondiente.
No ocultar fallos de la web con montaje ni presentar fixtures como producción.

## Imágenes estáticas: decisión pendiente

Prioridad inicial: capturas reales bien compuestas y gráficos derivados de
datos verificados. Posibles usos: portada de memoria, resumen del hallazgo,
tarjeta social y secuencias de respaldo cuando un servicio externo falle.

Antes de producir, revisar los recursos existentes y detectar qué función no
cubren. No añadir una imagen únicamente para decorar ni degradar rendimiento.

Una ilustración generada con IA solo tendría sentido para una función
conceptual/editorial explícita. No debe simular una ortofoto histórica,
edificios reales, cartografía, un antes/después o evidencia documental.
Identificar su naturaleza si pudiera confundirse con material factual.
No usar IA para fabricar métricas ni reconstrucciones históricas.
Si se decide generarla, seguir la herramienta/skill de imagen aplicable.

## Nombre del proyecto: valorar, no cambiar todavía

Nombre actual: **Más joven que tú**.

Hipótesis a comprobar: tiene una entrada personal memorable, pero puede no
explicar por sí solo que compara la edad de los edificios actuales.

Antes de renombrar:
- Probar si un subtítulo descriptivo resuelve la ambigüedad.
- Evaluar comprensión de primera visita y recuerdo con personas nuevas;
  no sustituir esas observaciones por preferencia del agente.
- Comparar un número pequeño de alternativas, si hay un problema demostrado.
- Considerar el coste en ES/EU, OG, vídeo, documentación, enlaces y candidatura.
- Mantener el nombre si no hay una mejora clara y comprobable.

Subtítulo orientativo para evaluar, NO copy aprobado:
«La edad de los edificios de Bizkaia, comparada con la tuya».

## Evidencia del benchmark y límites

- La Diputación identifica 2025 como primera edición del concurso:
  https://www.bizkaia.eus/es/web/comunicacion/noticias/-/news/detailView/la-diputacion-foral-de-bizkaia-y-ehu-refuerzan-su-colaboracion-para-impulsar-el-periodismo-de-datos-a-traves-de-open-data-bizkaia
- Ganadores de representación dinámica: Bizkaia Pedalea (primero) y panel de
  emergencias (segundo): https://www.opendatabizkaia.eus/es/visualizacion
- Bizkaia Pedalea: secuencia explícita y utilidad reconocible. No copiar sus
  generalizaciones sobre seguridad: https://tecnoperiodismo.neocities.org/opendatabizkaia
- Green to Grey, Sigma 2026: ejemplos territoriales, antes/después y metodología
  separada: https://greentogrey.eu/ y https://greentogrey.eu/methodology/
  Nuestro parque actual NO permite inferir su métrica de pérdida de naturaleza.
- Under the Surface, Sigma 2025: equilibrio entre visualización, relato y método;
  premio y valoración: https://www.sigmaawards.org/from-flammable-buildings-to-slaverys-hidden-legacy-to-tainted-groundwater-projects-from-10-countries-win-gijns-2025-sigma-awards/
- Kontinentalist, bronce IIB 2024: pregunta pública más búsqueda de edificios:
  https://www.informationisbeautifulawards.com/showcase/6912-singapore-s-divisive-ethnic-based-housing-policy
- Seeking Shadow, plata IIB 2024: interacción al servicio de una pregunta urbana:
  https://www.informationisbeautifulawards.com/showcase/6995-seeking-shadow-a-cool-fix-for-hot-cities
  Solo ficha consultada; el producto original no cargó en esta consulta.
- IIB 2024 pide captura silenciosa en vídeo para piezas web:
  https://www.informationisbeautifulawards.com/awards/2024
  Es una referencia de presentación, NO una obligación de Bizkaia.

No se verificó exhaustivamente la UX móvil, accesibilidad o rendimiento de
esos competidores. Los patrones son recomendaciones, no garantías de premio.

## Contrato oficial localizado en esta investigación

Se descargó y leyó el BOB oficial (12 páginas, 561.426 bytes, 27/07/2026,
n.º 141, CVE BOB-2026a141-(I-865)):
https://www.bizkaia.eus/lehendakaritza/Bao_bob/2026/07/27/I-865_cas.pdf

- Base 1, p. 5: mantener exploración/comprensión visual como eje principal;
  la categoría Visualización excluye el reportaje o audiovisual como eje.
- Base 6, p. 7: documentación técnica breve con procedencia/acceso y proceso;
  su ausencia puede limitar la valoración del rigor.
- Base 10, p. 8: dinamismo 25%, comprensión 25%, rigor 25%, innovación 15%,
  diseño/usabilidad 10%.

Este enlace resuelve la localización del fascículo base pendiente en la
auditoría original, pero **no prueba ausencia de correcciones posteriores**.
Incorporarlo a la documentación viva de entrega cuando se retome, preservando
la auditoría fechada.

## Orden y prueba de éxito

1. Verificar el cierre técnico del agente y los pendientes humanos reales.
2. Resolver recorrido, resumen y acceso a capítulos; evitar duplicaciones.
3. Evaluar subtítulo/nombre e imágenes antes de congelar materiales.
4. Grabar demo y preparar capturas sobre el candidato definitivo.
5. Completar la verificación sencilla de un resultado si aporta valor.

Comprobar con personas nuevas si pueden explicar qué mide el producto, qué
han descubierto y dónde comprobarlo. Registrar observaciones reales, sin
convertir una muestra pequeña en evidencia estadística de competitividad.

No añadir más modos, IA analítica, 3D, rankings, testimonios decorativos,
reportaje extenso ni otra web para el jurado. No publicar ni presentar por
haber terminado estos materiales: conservar los gates y autorizaciones.
