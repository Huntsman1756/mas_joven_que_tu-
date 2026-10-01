# Revisión asistida EU y lectura de la publicación — 01/10/2026

Revisión pedida por el usuario tras publicar `f0f8458` (Pages `981410a`).
Checkout: `47bb4e7`. No se ha cambiado el producto ni enviado copy nuevo a producción.

## Euskera

Las 566 claves ya se habían enviado a LATXA y Xuxen el 30/09: véase
`../map-guidance-20260930/README.md`. La comparación de las entradas actuales
con los textos realmente enviados a Xuxen detecta 17 cambios, incluidos
los ajustes posteriores al corrector del 30/09 y tres frases del 01/10.
[Comparación y hash del diccionario](current-delta.json).

Los 17 textos se han enviado de nuevo a [Xuxen](https://xuxen.eus/), corrector
ortográfico y gramatical desarrollado por Elhuyar y EHU/IXA, según su
[descripción oficial](https://xuxen.eus/zer-da-xuxen).
Se usan valores de prueba para sustituir las variables antes de corregir;
no son datos nuevos ni aparecen en el producto. Cada clave se procesa separada.
Se comprueba que el texto reconstruido excluyendo los menús del corrector
coincide con el enviado. No se aplican sustituciones automáticas.

[Primer registro por clave](xuxen-per-key.json): 16 reconstrucciones válidas;
la primera captura de sources.catastro.what estaba incompleta y se descartó.
[Repetición completa](xuxen-last-key-recheck.json): reconstrucción idéntica,
una marca sobre Katastro-partzelarioa. Resultado final: 17 claves cubiertas,
15 sin marcas y seis marcas ortográficas en dos textos; sin marcas gramaticales
en esta muestra renderizada. Eso no demuestra que toda frase sea idiomática.

Decisiones:

- No traducir Edificio ni Ano_Constr: son nombres exactos de capa y campo.
- No cambiar SHA: identifica el algoritmo del registro de procedencia.
- Conservar partzelarioa: el corrector propone partzelazioa, pero hay uso
  institucional de Partzelario en [Bizkaia](https://www.bizkaia.eus/eu/gaia-xehetasuna/-/edukia/dt/12212).
  Ese uso apoya conservar el término; no se presenta como dictamen normativo
  sobre cada compuesto o contexto.
- Se conservaron las frases de cobertura, denominador municipal y zona central:
  el corrector no marcó las versiones renderizadas y no se encontró motivo
  para cambiar el contrato de significado.

Los dos envíos agrupados iniciales, con variables y distintas presentaciones
de párrafos, produjeron fragmentos corruptos en el editor. No cuentan como
revisión válida; se conservan en xuxen-multiline-rejected.json y
xuxen-flat-result.json (roundTripMatches=false). La repetición por clave evita
tomar fragmentos del editor como supuestos errores lingüísticos.

[Itzuli](https://www.euskadi.eus/itzuli/) es un traductor del Gobierno Vasco,
no una certificación de corrección. Se comprobó su documentación, sin producir
traducciones nuevas como copy final. La revisión humana nativa sigue pendiente;
la revisión asistida permite avanzar sin exigir que el usuario conozca a una
persona euskaldun. Ninguna fuente consultada acredita que las herramientas
sustituyan una revisión humana de naturalidad o certifiquen este producto.

## Recorrido visual observado

Capturas nuevas de la web publicada en el navegador Brave disponible.
Se preservó la pestaña del usuario y se abrió otra para portada y ejemplo.
El viewport de 390×844 se restauró al terminar. No son teléfonos físicos.

1. Resultado de Bilbao en escritorio: 01-result-bilbao.jpg. La pregunta,
   cifra y condiciones están claras; la base cartográfica verde/amarilla
   compite con el rojo/azul de edificios. Además, el bloque destacado de Mungia
   introduce otro municipio en el resultado personal de Bilbao.
2. Portada de escritorio: 02-home.jpg. Formulario breve, comparación visual
   real y procedencia visible. El acceso al ejemplo tiene menos peso que el
   botón personal desactivado cuando aún no se han completado los campos.
3. Portada móvil: 03-home-mobile.jpg. Sin desbordamiento horizontal observado;
   formulario y ejemplo caben, pero la comparación fotográfica queda al final
   de la primera pantalla. Los placeholders podrían confundirse con valores
   ya seleccionados; es una hipótesis para probar, no un fallo confirmado.
4. Ejemplo móvil ES: 04-example-mobile.jpg. El contexto local/municipal está
   separado, hay botones directos al mapa y a la fotografía. La explicación
   repite el contraste entre número/huella y deja el mapa fuera de la primera
   pantalla. Compactar la síntesis permitiría llegar antes a la evidencia.
5. Mismo ejemplo EU: 05-example-mobile-eu.jpg. Misma jerarquía y cifras;
   texto EU visible sin cortes. Hay más altura de lectura antes del mapa.

Prioridad propuesta, sin rediseño aplicado:

1. Atenuar la base cartográfica en la vista de antigüedad, conservando etiquetas
   y atribución. Comprobar que rojo/azul y trama siguen distinguibles.
2. Compactar la introducción móvil, manteniendo universo, fecha, cobertura
   y numerador/denominador accesibles. Conservar el salto al mapa existente.
3. Reubicar el ejemplo de Mungia fuera del bloque del resultado personal cuando
   el municipio sea otro; mantenerlo en los cinco capítulos y en portada.
4. Dar al ejemplo un botón secundario claro y verificar con personas nuevas
   si los placeholders se entienden como ejemplos.

Límites: esta pasada no repite axe, NVDA ni toda la matriz de QA; los controles
de publicación están en ../published-release-20261001/RELEASE.md. Las capturas
permiten valorar jerarquía y reflujo, no certificar accesibilidad completa.
