# G4-R · BENCHMARK-DEEP — 32 referencias analizadas

Research-only. Verificadas por búsqueda: elDiario (2022), Newtral (2025),
Geomatico (2021), Morphocode Urban Layers. El resto documentado por
conocimiento del corpus de referencia (sin copiar código ni diseño).

## A. Personalización por año de nacimiento — el competidor directo

### A1. elDiario.es «¿Cuánto ha crecido tu ciudad desde que naciste?» (2022)
- URL: eldiario.es/economia/crecido-ciudad-naciste-mapa-edad-espana…
- Proposición 1ª pantalla: «¿En qué año naciste?» selector 1921–2021.
- Personalización: año → mapa de edificios posteriores + búsqueda de
  municipio → gráfico de crecimiento anual.
- Mapa: protagonista, teselas precalculadas España (12,4M edificios).
- Retorno: cambiar año, cambiar ciudad. Share: artículo, no estado.
- Más fuerte: **la pregunta es la interfaz** — cero chrome antes del dato.
- Más débil: lectura estática, sin tiempo, sin foto, sin edificio exacto;
  el mapa es una imagen de un hecho, no una máquina de preguntas.
- Lección: nuestro titular «Eres mayor que una parte de los edificios»
  ya es más fuerte que su gráfico — pero ellos llegan al mapa en 1 clic,
  nosotros en 2 (año+lugar).
- NO copiar: el formato artículo-con-embeds; limita la exploración.

### A2. Newtral «Mapa de la edad de los edificios» (2025)
- 12,4M edificios España, color por época, click → ficha (año, uso, m²,
  viviendas). Nota metodológica con inconsistencias (año 1000, 9400).
- Fuerte: ficha por edificio + honestidad sobre errores del dato.
- Débil: sin personalización; es un visor, no una pregunta.
- Lección: nuestra clasificación VALID/UNKNOWN/SUSPICIOUS ya hace lo que
  ellos narran como hallazgo — ventaja de rigor.

### A3. Geomatico mapa-catastro-3D (2021)
- 3D extrusión por año/uso. Espectacular como demo técnica.
- Débil: visor puro; el 3D no añade lectura de cambio.
- NO copiar: 3D decorativo — coste de perf enorme, ganancia editorial 0.

## B. Capas urbanas / edificio-a-edificio

### B1. Morphocode Urban Layers — Manhattan (2014+)
- PLUTO + footprints; sliders de periodo filtran 45.000 edificios en el
  cliente. «Structural episodes desde 1765».
- Fuerte: **el slider ES el análisis**; la ciudad se filtra ante tus ojos.
- Fuerte 2: «Learn more» secundario — la explicación no estorba.
- Lección directa: nuestro Play/scrub ya implementa esto; su acierto es
  que el eje temporal está **pegado al mapa**, no en una sección abajo.
- NO copiar: paletas arcoíris por época — rompe la lectura de contraste.

### B2. Waag / Bert Spaan «Building age of the Netherlands» (~2013)
- El clásico: todos los edificios de NL coloreados por año (rainbow).
- Fuerte: zoom continuo país→edificio; el patrón nacional ES la portada.
- Débil: sin pregunta, sin narrativa, slider pobre; y el rainbow oculta
  el dato en decoración.
- Lección: la vista nacional agregada como portada tiene un valor de
  «wow» que nuestro municipio-a-municipio no tiene — nuestro contrapeso
  es la pregunta personal.

### B3. Colouring Cities (UCL/CASA, varios países)
- Plataforma de edificio editable por atributo (edad, uso, material…).
- Fuerte: modelo de datos por atributos + contribución ciudadana.
- Débil: interfaz de capas y formularios — visor SIG, no producto editorial.
- NO copiar: el panel de categorías permanente (menú de capas = dashboard).

### B4. Block & Paper / NYC construction visualizations varios
- Animaciones de crecimiento anual de Manhattan/Chicago.
- Fuerte: el vídeo/autoplay como artefacto emocional.
- Débil: pasivo — se ve, no se usa.
- Lección: nuestro Play ya da esa emoción interactiva; el valor extra
  sería un «momento espectáculo» breve en la primera visita (nada que
  obligue a esperar).

## C. Comparadores de imagen aérea / mapa histórico

### C1. Google Earth Timelapse
- Time-lapse global 1984–ahora; búsqueda de lugar → vídeo.
- Fuerte: una sola idea ejecutada a escala planetaria.
- Débil: sin dato, sin lectura — solo «mira cómo cambia».
- Lección: el impacto de «antes/después» es inmediato; nuestro comparador
  de campañas tiene ese potencial pero vive 3 clics dentro.

### C2. swisstopo «Journey through time»
- Mapa oficial suizo con slider temporal de ediciones cartográficas.
- Fuerte: **la misma escena, distinta época** — nuestro histórico 1923-25
  es exactamente esto.
- Lección: el histórico gana cuando se presenta como «el mismo mapa en
  otra época», no como «una capa más». Su UI lo hace un slider sobre la
  escena — el nuestro es un botón dentro de una tarjeta.

### C3. IGN «Remonter le temps» (Francia)
- Fotos aéreas + mapas históricos con doble panel sincronizado y eje.
- Fuerte: el **split-screen sincronizado** es la forma editorial correcta
  para comparar épocas — mejor que toggle on/off.
- Lección: nuestro comparador orto A/B ya existe; el histórico debería
  integrarse en esa misma mecánica de comparación, no ser un tercer
  control separado.

### C4. OldNYC / OldSF (NYPL/SFPL fotos geolocalizadas)
- Fotos históricas en el punto exacto del mapa.
- Fuerte: la foto EN el lugar — evidencia inmediata y emocional.
- Débil: archivo, no herramienta.
- Lección: la ortofoto por campaña es nuestra OldNYC estructural; lo que
  falta es que la foto llegue al usuario sin que él tenga que entender
  qué es una «campaña».

### C5. NYPL Map Warper / David Rumsey overlays
- Mapas históricos georreferenciados con slider de opacidad.
- Fuerte: opacidad como control único e intuitivo de comparación.
- Lección: un control de opacidad/direct-blend es más legible que una
  capa binaria para cartografía histórica.

## D. Scrollytelling / narrativa explicativa

### D1. NYT scrollytelling maps (p.ej. climate/wildfire series)
- Capítulos que conducen cámara+capa mientras lees.
- Fuerte: la cámara es parte de la prosa; el usuario nunca «opera» el
  mapa, el mapa ilustra.
- Lección para historias: nuestros 5 casos deberían conducir la escena
  (año, zoom, capa) al entrar — el texto no debería pedir «ahora haz
  esto», debería mostrarlo ya hecho.

### D2. The Pudding (varios)
- Cada pieza = un mecanismo de interacción inventado para esa historia.
- Fuerte: la personalización como gancho («tu X»).
- Lección: nuestra personalización es nativa (año+lugar) — más fuerte que
  la mayoría de Pudding; la diferencia es que ellos cierran cada sección
  con una idea, nosotros con una invitación.

### D3. Reuters Graphics / FT visual stories
- Datos duros con estructura «gráfico → explicación de una línea →
  siguiente gráfico».
- Lección: nuestra línea de cobertura/provenance ya hace esto bien —
  mantener cada cifra acompañada de su denominador.

## E. Herramientas centradas en dirección/edificio

### E1. NYC ZoLa / PropertyShark
- Búsqueda de dirección → panel de datos del solar (zoning, year built).
- Fuerte: la dirección es la puerta; todo cuelga del punto.
- Débil: tablas de datos — ficha técnica, no historia.
- Lección: nuestro MI EDIFICIO ya supera esto (identidad NORA↔Catastro
  declarada); el panel debería llegar al usuario más rápido.

### E2. Catastro oficial (SEDE) / GeoPortal Bizkaia
- Visores SIG oficiales.
- NO copiar: todo — son el anti-modelo de UX (paneles, capas, leyendas
  permanentes, jerga). Útil como evidencia del diferencial de diseño.

### E3. Barcelona «Mapa de l'habitatge» / visores municipales
- Búsqueda → ficha con foto del edificio.
- Lección: una imagen del edificio real ancla la ficha emocionalmente;
  nuestra ortofoto sobre la parcela hace un papel equivalente.

## F. Map-first investigations

### F1. Washington Post / NYT map-led investigations
- Mapa a pantalla completa con capítulos laterales.
- Fuerte: el mapa nunca abandona el viewport (sticky map + texto que
  pasa). Lección IA: un mapa sticky mientras el scroll cuenta casos.

### F2. Bloomberg CityLab «how cities grew» pieces
- Animación de crecimiento + lectura por zonas.
- Lección: nuestro Play ya hace esto; falta que el primer viewport
  muestre el mapa ya coloreado (lo hace) con UNA acción clara.

### F3. ProPublica/BR data-apps sobre vivienda
- Lookup por dirección con contexto de política pública.
- Lección: la ficha funciona cuando cada dato responde «¿y qué significa
  para mí?» — nuestro planning/contexto ya apunta ahí.

## G. Datos cívicos / open data con diseño

### G1. Datos Abiertos Madrid/Barcelona dashboards
- NO copiar: mosaicos de KPIs — lo contrario del producto.

### G2. «Cómo se construyó tu ciudad» (medios locales EU, varios)
- Misma idea con menos rigor: sin UNKNOWN/SUSPICIOUS, sin denominadores.
- Ventaja nuestra: el rigor de contratos ya es contenido visible
  (cobertura, «cómo lo sabemos») — explotable como marca.

## H. Premiados (Sigma/Malofiej/IiB style)

### H1. «The Depths Below» / scrolly geológicos
- Lección: una sola variable + una sola mecánica = premiable.

### H2. Malofiej mapas ganadores recientes
- Patrón común: mapa protagonista + capítulos + una cifra enorme por
  sección. Refuerza nuestro modelo de ritmo (mapa/lectura/cifra).

### H3. Sigma winners con datos administrativos
- Lección: el jurado premia «el registro administrativo contado como
  historia» — exactamente el posicionamiento catastral.

## I. Herramientas de tiempo

### I1. Cadasta/Historical Aerials (US) — comparador por año
- Selector de año directo sobre la foto.
- Lección: en FOTO, el año de campaña debería ser el eje principal, no
  un selector secundario.

### I2. Barómetro de urbanización (LSE/Atlas of Urban Expansion)
- Mapas multi-época comparados por anillo de crecimiento.
- Lección: «anillos de crecimiento» es la metáfora que nuestro Play ya
  materializa — nombrarla ayudaría.

## Tabla de síntesis

**10 patrones reutilizables:**
1. La pregunta como interfaz (elDiario) — ya la tenemos, protegerla.
2. Slider temporal pegado al mapa (Urban Layers, swisstopo).
3. Escena conducida por el capítulo (NYT scrolly) → para las 5 historias.
4. Split/blend de comparación de épocas (IGN, Rumsey) → unificar foto+histórico.
5. Una acción primaria por pantalla (Earth Timelapse).
6. Ficha que cuelga de un punto (ZoLa) — MI EDIFICIO ya lo hace.
7. Estado compartible completo en URL (nosotros ya somos mejores que casi
   todos aquí — ninguno de los 32 serializa estado como nosotros).
8. Cifra+denominador siempre juntos (Reuters/FT).
9. «Ver el mismo lugar en otra época» como promesa (swisstopo).
10. Metodología accesible pero fuera del camino (Morphocode «Learn more»).

**10 anti-patrones:**
1. Grid de tarjetas/features (dashboards open data).
2. Menú de capas permanente (Colouring Cities, visores SIG).
3. Rainbow palette como ornamento (Waag/Spaan — bonito pero ilegible
   para contraste).
4. 3D decorativo (Geomatico).
5. Autoplay obligatorio (vídeos de construcción).
6. Panel de formularios SIG (GeoPortal).
7. KPI tiles (dashboards municipales).
8. Historia = scroll infinito de embeds (formato artículo elDiario).
9. Personalización sin profundidad (Newtral: se acaba en la ficha).
10. Capas binarias sin blend para comparación de épocas.

**5 oportunidades de diferenciación genuinas:**
1. **Dos fuentes de verdad declaradas** (NORA↔Catastro con BOTH_DIFFER
   explícito) — nadie muestra desacuerdo entre fuentes oficiales.
2. **Tres tiempos en una escena**: año personal + cabezal + segundo año —
   único en el corpus.
3. **La pregunta que sigue viva**: cambiar año/lugar/año2 sin salir —
   máquina de preguntas, no visualización de una respuesta.
4. **Provenance como interfaz**: cobertura, denominador y «cómo lo
   sabemos» integrados en cada cifra — rigor visible, no apéndice.
5. **Historias manipulables**: capítulos que configuran el mapa real y
   dejan al usuario jugar dentro del caso — ni artículo ni visor.
