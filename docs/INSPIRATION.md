# INSPIRATION — referencias internacionales

> Copiamos **aprendizajes**, no diseños ni identidad gráfica.
> Ninguna referencia se usa como evidencia factual sobre Bizkaia.

## 1. elDiario.es — «¿Cuánto ha crecido tu ciudad desde que naciste?»

- **Qué funciona:** entrada de año, búsqueda local, gráfico temporal, personalización
  inmediata, advertencias metodológicas.
- **Qué no transfiere:** su métrica de crecimiento es urbana y agregada; su alcance no
  incluye evidencia fotográfica multitemporal.
- **Qué aprendemos:** el patrón «introduce tu año → resultado local» es la puerta de
  entrada correcta; el aviso metodológico debe ir pegado a la cifra.
- **Nuestra diferencia:** Bizkaia/Euskadi, Catastro foral con `Ano_Constr` por edificio,
  y ortofotografía histórica oficial **sincronizada** con el año elegido.

## 2. Morphocode — Urban Layers

- **Qué funciona:** visualización de edad de edificios, timeline, tratamiento visible de
  `UNKNOWN`, relación mapa ↔ histograma.
- **Qué no transfiere:** es un caso de una ciudad concreta, sin ortofotos ni
  personalización por año de nacimiento.
- **Qué aprendemos:** `UNKNOWN` merece estilo y leyenda propios; el histograma debe estar
  cableado al mapa.
- **Nuestra diferencia:** dos escalas de evidencia (Catastro + ortofoto) y estado temporal
  personal.

## 3. Bert Spaan — Buildings (Países Bajos)

- **Qué funciona:** rendimiento a gran escala, timeline/play, sistema de color,
  búsqueda por dirección, generación de tiles, arquitectura SvelteKit + MapLibre + PMTiles.
- **Qué no transfiere:** **no tiene licencia** ⇒ no se copia código. Otro país, otra
  fuente, ortofotos distintas.
- **Qué aprendemos:** multiescala obligatoria, clustering de edificios recientes,
  y que el stack SvelteKit + PMTiles es viable para cientos de miles de edificios.
- **Nuestra diferencia:** sólo estudiamos arquitectura; implementación propia.

## 4. geoEuskadi — Comparador de ortofotos

- **Qué funciona:** ergonomía antes/después, transparencia de fuente, navegación temporal
  entre campañas 1956–2025.
- **Qué no transfiere:** es un comparador de imágenes; no cruza el dato de edificios ni
  personaliza por año del usuario.
- **Qué aprendemos:** nomenclatura de campañas y sus fechas; la necesidad de mostrar
  fuente y año real.
- **Nuestra diferencia:** no replicamos el comparador: lo integramos como **una capa** de
  la experiencia personalizada, sincronizada con el Catastro.

## 5. swisstopo — «Journey Through Time»

- **Qué funciona:** navegación temporal con transiciones claras, continuidad espacial.
- **Qué no transfiere:** cartografía nacional suiza y su modelo de datos.
- **Qué aprendemos:** mantener centro/zoom/bearing/pitch al cambiar de época.
- **Nuestra diferencia:** el estado temporal está anclado al año del usuario.

## 6. IGN Francia — «Remonter le Temps»

- **Qué funciona:** comparación de mapas/ortofotos antiguos con explicación de fuentes.
- **Qué no transfiere:** cobertura francesa; foco en mapas históricos más que en datos de
  edificios.
- **Qué aprendemos:** cómo declarar la procedencia y la incertidumbre de fechas.
- **Nuestra diferencia:** el cruce cuantitativo Catastro ↔ ortofoto.

## 7. Sigma Awards / «Green to Grey» y otras visualizaciones geoespaciales premiadas

- **Qué funciona:** claridad narrativa apoyada en UNA idea visual fuerte.
- **Qué no transfiere:** el tema y su escala.
- **Qué aprendemos:** restringir el producto a una idea (tu año) y no acumular widgets.

## 8. Block & Paper — «Every building in Manhattan»

- **Qué funciona:** Play/scrub temporal, edificios sin fecha mantenidos explícitamente
  como contexto, distinción visible de evidencia sobre edificios demolidos, shortcuts
  a zonas reconocibles.
- **Qué no transfiere:** un solo municipio hiperdenso; nosotros cubrimos 112 con
  densidades muy dispares.
- **Qué aprendemos:** la honestidad semántica (sin fecha ≠ inexistente; sin ledger
  histórico ≠ sin demolición) convive con el efecto visual del Play. Es la referencia
  conceptual más cercana a nuestra filosofía `OBSERVED/DERIVED/UNKNOWN`.
- **Nuestra diferencia:** personalización por año del usuario + ortofotografía oficial
  sincronizada, que Block & Paper no combina.

## 9. Skyscraper Museum — «Ten & Taller»

- **Qué funciona:** tres representaciones coordinadas del mismo corpus (GRID visual +
  MAP + TIMELINE), no widgets independientes.
- **Qué no transfiere:** corpus acotado (rascacielos NYC); nuestra escala es el parque
  completo de Bizkaia.
- **Qué aprendemos:** un mismo universo puede contestarse desde vistas múltiples que
  comparten estado; eso sugiere nuestro principio MAPA·TIEMPO·FOTO con
  `place + year + view` compartidos.
- **Nuestra diferencia:** nuestras vistas son mapa / tiempo / fotografía aérea, no
  imágenes de catálogo.

## 10. OldNYC

- **Qué funciona:** convierte un archivo enorme en algo emocionalmente sencillo:
  «mira qué había en el lugar que conoces». Navegación basada en familiaridad,
  no en estructura de archivo.
- **Qué no transfiere:** su corpus es fotografía de archivo geolocalizada (derechos y
  georreferenciación que nosotros no tenemos aún resueltos).
- **Qué aprendemos:** el lugar conocido del usuario es el ancla emocional correcta;
  ya lo tenemos con `place`, falta explotarlo narrativamente.
- **Nuestra diferencia:** evidencia fotográfica oficial por campaña (ortofotos)
  en lugar de archivo fotográfico de calle.

## 11. Here Grows New York / New York Construction

- **Qué funciona:** animación temporal como narrativa (pausa, fuentes históricas
  inspeccionables); año + Play para hacer visible el cambio espacial por periodos
  constructivos.
- **Qué no transfiere:** su animación tiende a presentarse como «así era la ciudad» —
  reconstrucción histórica que nuestro contrato semántico prohíbe.
- **Qué aprendemos:** el Play puede ser espectacular **y** honesto si el copy dice
  exactamente qué se está mostrando (stock actual incorporándose por año registrado,
  nunca «así era X en Y»).
- **Nuestra diferencia:** nuestro Play describe el parque actual por `Ano_Constr`
  registrado, no una reconstrucción.

## 12. Google Earth Timelapse

- **Qué funciona:** dos modos que no compiten: exploración libre + historias temáticas
  guiadas; las historias hacen comprensibles fenómenos que el usuario no descubriría solo.
- **Qué no transfiere:** escala planetaria y sensores remotos.
- **Qué aprendemos:** hotspots editoriales seleccionados encima de la exploración libre;
  el usuario no debe encontrar todas las historias por sí mismo.
- **Nuestra diferencia:** nuestros hotspots se derivan de señales internas del propio
  dataset (C-05/C-08, cobertura, clusters, campañas disponibles).

## 13. Auckland / Tallahassee — archivos de fotografía aérea histórica

- **Qué funciona:** timeline de vuelos/campañas como eje comprensible; comparador
  histórico/actual; selección de casos especialmente ilustrativos del archivo.
- **Qué no transfiere:** son archivos fotográficos; no cruzan el dato constructivo.
- **Qué aprendemos:** el timeline de campañas 1956–2025 es un eje narrativo propio;
  la selección editorial de casos dentro del archivo multiplica su comprensibilidad.
- **Nuestra diferencia:** la campaña de ortofoto se ofrece como evidencia sincronizada
  con el año constructivo, no como archivo separado.

## 14. Esri — Manhattan Skyscraper Explorer

- **Qué funciona:** año + altura + 3D con mapa, gráficos y selección perfectamente
  coordinados.
- **Qué no transfiere:** la narrativa vertical (altura) no es nuestra pregunta;
  `Numero_Alt` existe pero el 3D añade WebGL, oclusión, cámara e interacción sin
  mejorar «¿qué llegó después que tú?».
- **Qué aprendemos:** la coordinación mapa↔selección↔gráfico que ya tenemos es el
  patrón correcto; el 3D queda como experimento solo si un hotspot lo requiere.
- **Nuestra diferencia:** renuncia deliberada al 3D para mantener foco y rendimiento.

## 15. Colouring Cities (CCRP)

- **Qué funciona:** plataforma abierta, reproducible, con decenas de atributos
  verificados (forma, uso, materiales, sostenibilidad, historia).
- **Qué no transfiere:** precisamente su amplitud — un atlas de ~150 atributos es
  lo contrario de una pregunta memorable.
- **Qué aprendemos:** su rigor de verificación/provenance; no su alcance.
- **Nuestra diferencia:** una única pregunta editorial, no un atlas exhaustivo.

## 16. Resumen de diferenciación

| Referencia | Qué tomamos | Qué evitamos |
|------------|-------------|--------------|
| elDiario.es | Patrón de personalización + caveats | Su métrica y alcance |
| Urban Layers | `UNKNOWN` visible, mapa ↔ histograma | Diseño gráfico |
| Bert Spaan | Multiescala y arquitectura (estudio) | Código (sin licencia) |
| geoEuskadi | Ergonomía before/after | Replicar el comparador aislado |
| swisstopo / IGN | Continuidad espacial y transparencia | Cartografía no vizcaína |
| Block & Paper | Play + honestidad sobre sin-fecha/demolidos | Un solo municipio |
| Ten & Taller | Vistas coordinadas del mismo corpus | Corpus acotado |
| OldNYC | Navegación por familiaridad del lugar | Archivo fotográfico |
| Here Grows NY | Play como narrativa con fuentes | «Así era X» (reconstrucción) |
| Google Timelapse | Explorar + historias guiadas | Escala planetaria |
| Auckland/Tallahassee | Timeline de campañas + casos elegidos | Archivo sin dato cruzado |
| Manhattan Skyscraper | Coordinación mapa↔gráfico↔selección | 3D por defecto |
| Colouring Cities | Rigor de verificación | Atlas de 150 atributos |

**Combinación no encontrada en el benchmark:** año personal + lugar personal + stock de
edificios actual a nivel de huella + agregación espacial multiescala + timeline/Play +
ortofotos oficiales multitemporales + swipe + provenance explícito + tratamiento de
unknowns + accesibilidad real. Cada parte existe por separado; la combinación es la
aportación. Dirección congelada en `docs/G2-DIRECTION.md`.

**Identidad gráfica: 100 % propia.** Ninguna paleta o layout se copia de las referencias.
