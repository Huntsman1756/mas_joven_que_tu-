/**
 * Diccionario de copy (es) — única fuente de texto de la interfaz.
 * Criterio G1 C1: 0 literales en componentes. Origen: docs/UX_COPY.md §12–§21.
 * Estructura preparada para `eu` (sin traducción automática como copy final).
 */

export const es: Record<string, string> = {
  'search.choose_from_list': 'Selecciona un municipio de la lista antes de continuar.',
  // ── Hero (INTRO) — UX_COPY §12 · G5: portada editorial ─────────────────
  'hero.title': 'Más joven que tú',
  'hero.tagline': 'Tu vida como medida del territorio',
  // G11: promesa corta — la pregunta larga baja al resultado
  'hero.question': 'Tu municipio también tiene edad.',
  'hero.intro':
    'Descubre qué edificios actuales se construyeron después de que nacieras y compara el mismo lugar en fotografías de otras épocas.',
  'hero.label.year': 'Año de nacimiento',
  'hero.label.place': 'Municipio',
  'hero.placeholder.year': '1988',
  'hero.placeholder.place': 'Getxo',
  'hero.cta': 'Descubrir mi Bizkaia',
  'hero.privacy':
    'Solo usamos el año. No guardamos tu fecha de nacimiento, tu nombre ni tu correo.',
  'hero.sources':
    'Datos oficiales: Catastro de Bizkaia, ortofotos y cartografía histórica · Open Data Bizkaia · geoEuskadi · Eustat.',
  'hero.year.invalid': 'Introduce un año entre 1900 y {snapshot_year}.',

  // ── Titular y cobertura (RESULT) — UX_COPY §13 · G5: respuesta llana ───
  // G13: el titular es la frase llana completa; el porcentaje exacto es
  // cifra de apoyo. Municipio y año van en el kicker, no en la frase.
  'result.kicker': '{municipality}, desde {selected_year}',
  'result.lead.some':
    'De los edificios actuales con año conocido, {approx} se construyeron después de que nacieras.',
  'result.lead.none':
    'Ningún edificio actual con año conocido se construyó después de que nacieras.',
  'result.support': 'La cifra exacta:',
  'result.pct_value': '{pct} %',
  'result.invite': 'Compara las fotografías y descubre dónde se concentran.',
  'result.about_data': 'Sobre este dato',
  'result.lead': '{after} de {known} edificios con año de construcción conocido.',
  // G5-R2: un único dato humano junto al resultado (Eustat, dentro del
  // metrics JSON — sin petición nueva en el critical path). La fecha de
  // observación va explícita; la fuente baja a la línea .src (G9).
  'result.population': 'A {ref_date}, {municipality} tenía {population} habitantes empadronados.',
  'result.population.src': 'Eustat · Padrón municipal',
  // G11.2: cobertura en una línea; el desglose (sin año / anómalos) va
  // en un desplegable junto a ella.
  'result.coverage': 'Cobertura del año registrado: {coverage_pct} %.',
  'result.coverage.detail.body':
    'El año de construcción está registrado para {known} de los {total} edificios actuales; el porcentaje se calcula solo sobre los de año conocido.',
  'result.coverage.unknown_note':
    'Los otros {unknown} no tienen año utilizable y {suspicious} registran un año anómalo.',
  'result.coverage.unknown_only': 'Los otros {unknown} no tienen año utilizable.',
  'result.coverage.suspicious_only': 'Otros {suspicious} registran un año anómalo.',
  'result.caveat':
    'El Catastro describe los edificios que existen hoy. No sabemos por este dato cuántos edificios desaparecieron ni cuándo.',
  'result.calc':
    'La cuenta: {after} edificios posteriores a {selected_year} ÷ {known} edificios con año registrado = {post_share} de cada 100. Los edificios sin año utilizable no entran ni arriba ni abajo.',
  'result.calc.technical':
    'La definición exacta, los contratos de datos y la procedencia están en «Cómo lo sabemos».',
  'result.calc.summary': 'Cómo lo calculamos',
  'result.low_coverage':
    'En este municipio falta el año de construcción en una parte relevante del parque actual. Consulta cómo afecta al cálculo.',
  'result.area':
    'Esos edificios ocupan {area} ha en planta: el suelo que cubre su geometría, no la superficie construida total.',
  'result.change': 'Cambiar año o lugar',
  'result.change.apply': 'Aplicar',
  'result.change.cancel': 'Cancelar',
  'result.map_label': 'Mapa de edificios actuales por estado temporal respecto a tu año.',
  'result.text_summary':
    'En {municipality} hay {total} edificios actuales; {known} tienen año conocido y {after} se terminaron después de {selected_year}.',

  // ── Distribución temporal — UX_COPY §14 ────────────────────────────────
  'dist.title': 'Edificios actuales de {municipality} por periodo de construcción',
  'dist.axis.x': 'Periodo de construcción',
  'dist.axis.y': 'Nº de edificios actuales',
  'dist.bucket.pre1900': 'antes de 1900',
  'dist.bucket.none': 'sin año',
  'dist.marker': 'TU AÑO · {selected_year}',
  'dist.denominator': 'sobre {known} edificios con año conocido',
  'dist.noyear_band': 'Sin año utilizable: {no_year} · {no_year_pct} %',
  'dist.heaping':
    'La distribución se agrupa por periodos, no por años. Parte de las fechas del Catastro están redondeadas y se concentran en años acabados en 0 o 5 (en {municipality}, {heaping_pct} %). Por eso no leemos picos anuales como momentos de construcción.',
  'dist.bucket.pre1900.tooltip':
    'Edificios anteriores a 1900 · {n} · {share} % del parque con año conocido',
  'dist.tooltip.decade': 'años {decade} · {n} edificios · {share} % del parque con año conocido',
  'dist.marker.note':
    'La línea marca tu año exacto. Las barras son periodos: la línea puede caer dentro de una barra.',
  'dist.summary':
    'Periodo con más edificios actuales: {decade} ({n}). Cobertura del año registrado: {coverage_pct} %.',

  // ── Mapa y leyenda — UX_COPY §15 ───────────────────────────────────────
  'map.legend.title': 'Leyenda',
  'map.legend.details': 'Qué significa el color',
  'map.legend.after': 'Terminado después de {selected_year}',
  'map.legend.before': 'Ya existía en {selected_year}',
  'map.legend.noyear': 'Año no utilizable (sin dato o anómalo)',
  'map.legend.cells': 'Edificios construidos después de {selected_year}',
  // G12: los extremos declaran qué significan 0 % y 100 %, no solo la escala
  'map.legend.cells.more': '100 % · todos',
  'map.legend.cells.less': '0 % · ninguno',
  'map.legend.cells.nodata': 'a rayas: zona sin edificios con año conocido',
  'map.legend.cells.pending':
    'El tono neutro sin rayas también puede indicar datos pendientes o no disponibles.',
  'map.cell.loading': 'Cargando los datos de esta zona…',
  'map.cell.missing': 'No se han podido obtener los datos de esta zona.',
  'map.cell.load_error':
    'No se pudieron cargar los datos de algunas zonas. No significa que carezcan de edificios con año conocido.',
  'map.cell.retry': 'Reintentar carga de zonas',
  'map.cell.footprint_detail': 'Ver huella en planta',
  'map.legend.cells.universe': 'sobre los de año conocido de cada zona',
  'map.legend.cells.small_n':
    'Pocos edificios con año válido en esta zona (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje.',
  'map.tooltip.cell.share':
    '{share} de cada 100 edificios de esta zona se terminaron después de {selected_year}',
  'map.tooltip.cell.denominator': 'sobre {known} edificios con año conocido',
  'map.tooltip.cell.footprint':
    'En huella en planta: el {share} % de la superficie con año conocido es posterior a {selected_year}',
  'map.tooltip.cell.no_known': 'Esta zona no tiene edificios con año de construcción conocido',
  // consulta la celda bajo el CENTRO del encuadre — el texto lo dice
  'map.cell.inspect': 'Ver datos de la zona centrada en el mapa',
  'map.cell.detail': 'En esta zona',
  'map.cell.close': 'Cerrar detalle de la zona',
  'map.cell.none': 'No hay ninguna zona en el centro actual del mapa',
  'map.cell.sentence':
    '{after} de {known} edificios actuales con año conocido se construyeron después de que nacieras',
  'map.cell.sentence.play':
    '{until} de {known} edificios actuales con año conocido constan construidos hasta {play_year}',
  'map.cell.zoom': 'Acercar para ver los edificios por separado',
  // G16: del dato de la zona a su evidencia visual — la acción conserva
  // la selección (volver al mapa = volver a la ficha) y encuadra la zona.
  'map.cell.photos': 'Ver esta zona en fotografías',
  'map.legend.munis':
    'Cada municipio colorea el % de sus edificios actuales construidos después de {selected_year}',
  'map.legend.munis.play':
    'Cada municipio colorea el % de sus edificios actuales con año conocido que constan construidos hasta {play_year}',
  // G12: la intro del mapa explica el cuadrado ANTES del lienzo (visible
  // sin leyenda ni hover; en móvil la leyenda va bajo el mapa)
  'map.intro.munis':
    'Cada municipio se colorea según la proporción de sus edificios actuales con año conocido construidos después de {selected_year}. Acércate para verlo por zonas.',
  'map.intro.cells.title': '¿Dónde están los edificios más jóvenes que tú?',
  'map.intro.cells':
    'Cada cuadrado agrupa los edificios actuales de una zona de 500 m de lado. Cuanto más intenso el color, mayor proporción se construyó después de {selected_year}, entre los que tienen año conocido.',
  'map.intro.buildings':
    'Aquí ya no hay cuadrados: cada forma es un edificio que existe hoy. Bermellón si se terminó después de {selected_year}; azul si ya existía; a rayas si el año no es utilizable.',
  'map.intro.play':
    'Mueve el año: el color indica qué proporción de los edificios actuales con año conocido consta construida hasta el año seleccionado. No reconstruye todos los edificios que existían entonces.',
  'map.intro.play.buildings':
    'Mueve el año: se ven los edificios actuales con año conocido que constan construidos hasta ese año. No es una reconstrucción del pasado.',
  'map.visible_universe':
    'Estadística del municipio de {municipality}. El encuadre del mapa no la cambia.',
  // G11: orientación de escala — qué está pintando el mapa a cada zoom
  'map.scale.region': 'Vista de Bizkaia. Acerca para ver tu municipio.',
  'map.scale.zones': 'Vista por zonas. Acerca para ver edificios.',
  // ── Edificio — UX_COPY §16 ─────────────────────────────────────────────
  'building.year': 'Este edificio consta como terminado en {year}.',
  // G11.2: vínculo personal — la ficha también habla de tu año.
  'building.rel.after': '{n} después de tu nacimiento.',
  'building.rel.before': '{n} antes de tu nacimiento.',
  'building.rel.exact': 'Terminado el mismo año en que naciste.',
  'building.unknown': 'El Catastro no indica un año de construcción para este edificio.',
  'building.suspicious':
    'El Catastro registra {raw_value}, un año anómalo: no se usa en las cifras.',
  'building.invalid': 'El año de este edificio no es interpretable: no se usa en las cifras.',
  'building.repaired': 'Geometría reparada y registrada (la original se conserva).',
  'building.fields': 'Uso: {uso} · Alturas: {alturas} · Huella: {area} m²',
  'building.fields.note': 'Huella en planta. No es superficie construida.',
  'building.calc': '¿Cómo se calcula?',
  'building.title': 'Edificio seleccionado',
  'building.close': 'Cerrar ficha del edificio',

  // ── Ortofoto (opt-in) — UX_COPY §17 ────────────────────────────────────
  'ortho.loading': 'Cargando la fotografía de {year}…',
  'ortho.available': 'Fuente: {publisher} · Campaña {year}{flight_range} · CC BY 4.0.',
  'ortho.not_covered':
    'La campaña de {year} no cubre este lugar. Puedes probar {alternatives}: son las campañas más cercanas que sí cubren este punto.',
  'ortho.service_error':
    'La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.',
  'ortho.retry': 'Reintentar',
  'ortho.publisher.bizkaia': 'Open Data Bizkaia — Diputación Foral de Bizkaia',
  'ortho.publisher.geoeuskadi': 'geoEuskadi — Gobierno Vasco',
  // meta corta del chrome temporal (G19): sigla del editor + vuelo
  'ortho.publisher.short.bizkaia': 'DFB',
  'ortho.publisher.short.geoeuskadi': 'geoEuskadi',
  // Sufijos de fecha de vuelo (ortho.flightSuffix): el catálogo mezcla
  // rangos neutros con notas en prosa — las notas conocidas se localizan
  // aquí sin alterar la información original.
  'ortho.flight.range': ' (vuelo {range})',
  'ortho.flight.unknown_exact': ' (vuelo entre {from} y {to}, fecha exacta desconocida)',
  'ortho.flight.american': ' ({range} · vuelo americano)',
  'ortho.section_label': 'Ortofoto',
  'ortho.fallback_alt': 'otra campaña',

  // ── Mapa histórico 1923–25 (standalone; es un mapa, no una foto) ───────
  'histmap.view': 'Ver el mapa histórico 1923–25',
  'histmap.loading': 'Cargando el mapa histórico…',
  'histmap.available':
    'Fuente: Open Data Bizkaia — Diputación Foral de Bizkaia · Cartografía histórica 1:25.000 (1923–1925) · CC BY 4.0.',
  'histmap.note':
    'Es un mapa dibujado por cartógrafos, no una fotografía. Cada hoja tiene su propio año de levantamiento entre 1923 y 1925. Lo anterior a ese mapa y lo construido después no aparecen.',
  'histmap.unavailable':
    'El mapa histórico oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.',
  'histmap.retry': 'Reintentar',
  'histmap.hide': 'Ocultar el mapa histórico',
  'histmap.exit': 'Volver al mapa actual',
  'histmap.section_label': 'Mapa histórico 1923–1925',

  // ── Búsqueda de lugar — UX_COPY §18 ────────────────────────────────────
  'search.too_short': 'Consulta demasiado corta: escribe al menos 3 caracteres.',
  'search.searching': 'Buscando…',
  'search.searching_more': 'Buscando más resultados…',
  'search.results': '{m} municipios encontrados ({n} coincidencias en el registro NORA)',
  'search.results_one': '{m} municipios encontrados (1 coincidencia en el registro NORA)',
  'search.no_results': 'No encontramos «{query}» en Bizkaia. Prueba con un municipio.',
  'search.out_of_scope': 'NORA reconoce {n} lugares, pero están fuera de Bizkaia.',
  'nav.lang': 'Idioma / Hizkuntza',
  'search.network_error': 'No hay conexión con el geocodificador oficial (NORA).',
  'search.selected': 'Seleccionado {municipality}. La estadística es la municipal.',
  'search.listbox': 'Lugares de Bizkaia',
  'ui.loading': 'Cargando…',
  // G11.3: fallo de descarga de un módulo diferido (chunk) — estado de
  // error accesible + reintento (antes el panel desaparecía en silencio).
  'ui.load_error':
    'No se pudo cargar esta parte de la página. Al recargar se conserva tu año y tu lugar.',
  'ui.retry': 'Recargar la página',
  'ui.dismiss': 'Descartar el aviso',
  // G11.3: cámara del enlace fuera de rango o incompleta → se conserva
  // municipio/año y se encuadra el municipio, con aviso.
  'url.camera_reset':
    'El enlace traía una posición de mapa no válida; se ha encuadrado el municipio.',

  // ── Compartir y estados vacíos — UX_COPY §19 ───────────────────────────
  'share.label': 'Copiar enlace',
  'share.done': 'Enlace copiado. Incluye tu año y el lugar; no incluye ningún dato personal.',
  'share.error': 'No se pudo copiar el enlace. Puedes copiarlo de la barra de direcciones.',
  'empty.catalog': 'Ahora mismo no hay datos disponibles para este lugar.',
  'error.pmtiles':
    'No se pudieron cargar los edificios. La estadística y la distribución siguen disponibles.',
  'error.metrics': 'No se pudieron cargar los agregados canónicos del municipio.',
  'error.generic': 'Algo ha fallado. La parte de datos que ya estaba cargada sigue disponible.',

  // ── Control temporal ───────────────────────────────────────────────────
  'year.slider.label': 'Tu año',
  'year.slider.help': 'Usa las flechas del teclado para cambiar el año.',
  'year.valuetext': 'año {year}',

  // ── Reproductor temporal (G18-R) — reproducción del stock actual ─────────
  // El tiempo es un control cartográfico, no una biografía: play/pausa,
  // año, scrubber y ticks. El año elegido es un marcador sutil en el eje;
  // la edad del usuario no forma parte del control.
  'time.axis_label': 'Eje temporal: incorporación del parque actual por año registrado',
  'time.play_aria': 'Reproducir evolución',
  'time.pause_aria': 'Pausar evolución',
  'time.step_back': 'Un año atrás',
  'time.step_fwd': 'Un año adelante',
  'time.scrub_label': 'Año en reproducción',
  'time.explain': 'Qué muestra esta vista',
  'time.reduced_note':
    'La reproducción automática está desactivada por tu preferencia de movimiento reducido.',
  'time.status':
    'Año en reproducción {play_year}: se muestra el parque actual con año registrado hasta {play_year}.',
  'time.caption':
    'Esta vista ordena los edificios que existen actualmente según su año de construcción registrado en Catastro. No reconstruye todos los edificios que existían en cada fecha: ese conjunto es desconocido. La evidencia fotográfica independiente está en «Fotos aéreas».',
  'map.legend.cells.play': 'Edificios actuales ya construidos en {play_year}',
  // G10-03/G12: en play la variable es «constatado hasta T», no
  // «posteriores a tu año» — los extremos declaran la escala.
  'map.legend.cells.play.less': '0 % · ninguno',
  'map.legend.cells.play.more': '100 % · todos',
  'map.legend.buildings.play': 'Se muestran los edificios registrados hasta {play_year}',

  // ── Modos del visor (G8): una sola jerarquía de cinco vistas ────────
  'view.label': 'Vista del mapa',
  'view.explore': 'Explora {municipality}',
  'view.vista': 'Vista',
  'view.map': 'Edificios',
  'view.time': 'Evolución',
  'view.photo': 'Fotos aéreas',
  'view.hist': 'Mapa 1923–25',
  'view.swipe': 'Antes / ahora',
  'view.cta_era': 'Comparar fotografías',
  'view.cta_era.note': 'Campaña cercana a tu nacimiento: {campaign_year}',
  // G19: en los modos de visor el panel editorial se colapsa — esta
  // puerta devuelve a la pantalla narrativa del resultado (modo map)
  'view.back_result': 'Resultado',
  // controles cartográficos agrupados (popover de capas del lienzo):
  // capas ≠ tiempo — familias distintas de chrome
  'layers.label': 'Capas del mapa',
  'layers.ortho': 'Fotografía aérea',
  'layers.buildings': 'Contorno de los edificios actuales',
  'photo.label': 'Fotografía aérea oficial sobre la misma vista del mapa',
  'photo.prev': 'Campaña anterior: {year}',
  'photo.next': 'Campaña siguiente: {year}',
  'photo.prev_none': 'No hay campaña anterior',
  'photo.next_none': 'No hay campaña siguiente',
  'photo.nodata':
    'Las zonas sin cobertura de la campaña se muestran con fondo neutro, no como imagen.',
  'photo.panel_a': 'Campaña {year}',
  'photo.details': 'Fuente y detalles',
  'photo.hint': 'Elige una campaña en el eje para cargar su fotografía aérea.',
  // G13: reproducción por campañas reales — avanza con la misma sonda
  // honesta del rail; se detiene donde falta cobertura.
  'photo.play': 'Reproducir fotografías',
  'photo.pause': 'Pausar',
  // patrón timelapse: un solo control de eje — arrastrar recorre el eje
  // y las flechas del teclado saltan de campaña en campaña
  'photo.scrub_label': 'Elegir campaña de fotografía en el eje de años',
  'photo.scrub_valuetext': 'Campaña {year}',
  'photo.rail_note':
    'Las marcas son campañas reales, no una serie anual: el control salta a la campaña más cercana. El año de cada campaña es nominal: el vuelo real pudo ser de otra fecha (si la fuente la publica, se indica).',
  'photo.ended': 'Fin de la serie de campañas. «Reproducir» vuelve a la primera.',
  // G19: sin selector de velocidad ni CTA de comparación en el chrome —
  // la comparación es el modo «Antes / ahora»; el dúo editorial sigue
  // existiendo para historias/deep links (orthoCompare + CompareMap).
  'photo.toggle.a11y': 'Elegir qué campaña se ve en el mapa',
  'photo.rel_before': '{n} antes de que nacieras',
  'photo.rel_after': '{n} después de que nacieras',
  'photo.rel_exact': 'tu año de nacimiento',
  // G9 §10 — sub-líneas cortas de card (contexto temporal)
  'rel.short.before': '{n} antes',
  'rel.short.after': '{n} después',
  'rel.short.exact': 'tu año',

  // ── SWIPE (G6): cortina antes/después sobre la misma vista ───────────
  // G9 §5: la ortofoto «de hoy» es una campaña observada (2025), no el día
  // actual — la etiqueta dice el año, no «hoy».
  'swipe.today': 'Actualidad · {year}',
  'swipe.hint': 'Desliza para comparar',
  // G10.1: alternativa de puntero sin arrastrar — botones que fijan la
  // cortina en cada extremo (la manipulación completa sigue en el slider).
  'swipe.presets': 'Posiciones de la cortina',
  'swipe.only_before': 'Solo {year}',
  'swipe.only_after': 'Solo {year}',
  'swipe.slider': 'Cortina de comparación: {before_year} a la izquierda, {after_year} a la derecha',
  // G16: las dos imágenes son elegibles (IGN «Fond 1 / Fond 2»); ambas
  // son campañas del catálogo y nunca pueden ser la misma fecha.
  'swipe.pick.a11y': 'Elegir las dos imágenes aéreas que se comparan',
  'swipe.pick.first': 'Primera imagen',
  'swipe.pick.second': 'Segunda imagen',
  'swipe.pick.note':
    'Dos campañas del catálogo oficial. Si una no tiene imagen en esta zona se declara; no se cambia por otra fecha.',
  'swipe.loading': 'Comprobando la ortofoto de {year}…',
  'swipe.tiles': 'Cargando la ortofoto de {year}…',
  'swipe.error': 'No se pudo comprobar la ortofoto de {year} en esta zona.',
  'swipe.gaps': 'Esta campaña contiene zonas sin imagen.',
  'swipe.after_error':
    'No se pudo comprobar la campaña {year} en esta zona; a la derecha se muestra el mapa de edificios, no esa ortofoto.',
  // G16c: cuando la campaña derecha falla el lienzo es el mapa de
  // edificios (respaldo) — chip, preset, slider y atribución lo dicen
  // en vez de prometer la imagen inexistente.
  'swipe.after_missing': 'Mapa · {year} sin imagen',
  'swipe.only_map': 'Solo el mapa',
  'swipe.slider_map':
    'Cortina de comparación: {before_year} a la izquierda, mapa de edificios a la derecha',
  'swipe.src_map':
    'Izquierda: {before_pub} · Campaña {before_year}{before_flight} · Derecha: mapa de edificios (la campaña {after_year} no se pudo comprobar) · CC BY 4.0',
  'swipe.retry': 'Reintentar',
  // G11.3: ficha por lado desde su campaña real — organismo, año nominal
  // y fecha de vuelo si la fuente la publica (antes: atribución genérica
  // «Open Data Bizkaia y geoEuskadi» aunque ambas imágenes fuesen geoEuskadi).
  'swipe.src':
    'Izquierda: {before_pub} · Campaña {before_year}{before_flight} · Derecha: {after_pub} · Campaña {after_year}{after_flight} · CC BY 4.0',

  // ── Contraste edificios / huella (C-05 vs C-08, denominadores explícitos) ─
  'contrast.title': 'Edificios frente a huella en planta',
  'contrast.buildings':
    'de cada 100 edificios actuales con año conocido se terminaron después de {selected_year}',
  'contrast.footprint':
    'de la huella en planta de los edificios con año conocido y geometría válida es posterior a {selected_year}',
  'contrast.note': 'El número de edificios y el terreno que ocupan cuentan historias distintas.',

  // ── Pie / créditos — UX_COPY §20 ───────────────────────────────────────
  'footer.sources':
    'Fuente principal: Open Data Bizkaia — Diputación Foral de Bizkaia (Catastro y ortofotos 1956–2002, CC BY 4.0). Complemento: geoEuskadi / Gobierno Vasco (ortofotos 2004–2025 y geocodificador NORA, CC BY 4.0).',
  'footer.code': 'Código: MIT.',
  'footer.snapshot': 'Fecha del conjunto de datos: {snapshot_date}.',
  'footer.how': 'Cómo lo sabemos',

  // ── Cómo lo sabemos — UX_COPY §8 ───────────────────────────────────────
  'how.title': 'Cómo lo sabemos',
  'how.catastro':
    'El Catastro es el registro administrativo de los bienes inmuebles. Para cada edificio de Bizkaia incluye, entre otros datos, su geometría y, cuando consta, el año de construcción.',
  'how.catastro.title': 'Qué es el Catastro',
  'how.measure.title': 'Qué mide «año de construcción»',
  'how.measure':
    'Es el año que el Catastro asigna al edificio en el campo Ano_Constr. No es una fecha de proyecto ni de licencia. Una rehabilitación posterior no lo cambia.',
  'how.current.title': 'Qué es un «edificio actual»',
  'how.current':
    'Es un edificio que existe en la capa catastral que usamos. No sabemos por este dato cuántos edificios desaparecieron ni cuándo.',
  'how.unknown.title': 'Por qué puede faltar el año',
  'how.unknown':
    'Si el Catastro no lo tiene, aparece como 0 o vacío. Nosotros lo tratamos como desconocido, nunca como 1900 ni como «antiguo».',
  'how.ortho.title': 'Qué es una ortofoto',
  'how.ortho':
    'Es una fotografía aérea corregida para poder medir sobre ella. La usamos como evidencia visual, no para calcular cifras.',
  'how.campaign.title': 'Por qué el año de una campaña puede no ser la fecha exacta del vuelo',
  'how.campaign':
    'Una campaña se identifica por un año nominal, que no siempre coincide con la fecha exacta del vuelo. Cuando la fuente publica esa fecha o rango, lo mostramos junto a la campaña.',
  'how.calc.title': 'Qué calculamos',
  'how.calc':
    'Número de edificios actuales con año conocido, porcentaje de los terminados después de tu año, cobertura del dato y huella en planta.',
  'how.nocalc.title': 'Qué NO calculamos',
  'how.nocalc':
    'No reconstruimos el parque histórico, no medimos superficie construida y no extraemos cifras de las fotografías.',
  'how.sources.title': 'Fuentes',
  'how.sources':
    'Catastro de Bizkaia y ortofotos (Open Data Bizkaia / Diputación Foral de Bizkaia; geoEuskadi / Gobierno Vasco).',
  'how.snapshot.title': 'Fecha del conjunto de datos',
  'how.back': 'Volver',

  // ── MI EDIFICIO (G3-A) — dirección exacta tras el resultado ───────────
  'address.invite': '¿Quieres bajar hasta tu calle?',
  // G11.3: la afirmación anterior («nada sale de esta página») era falsa —
  // la búsqueda envía el texto de la calle y el municipio a NORA. La
  // promesa honesta es sobre el enlace compartido, no sobre la consulta.
  'address.invite_note':
    'Busca una dirección en {municipality}. Para localizarla consultamos NORA, el servicio del Gobierno Vasco; el texto de la dirección no se incluye en el enlace compartido.',
  'address.start': 'Buscar una dirección',
  'address.label.street': 'Calle en {municipality}',
  'address.placeholder.street': 'Gran Vía Don Diego López de Haro',
  'address.label.number': 'Número',
  'address.label.bis': 'Bis',
  'address.placeholder.number': '1',
  'address.street.searching': 'Buscando la calle…',
  'address.street.none':
    'No encontramos esa calle en {municipality}. Prueba con el nombre oficial, en castellano o en euskera.',
  'address.street.outside': 'NORA reconoce calles con ese nombre, pero fuera de {municipality}.',
  'address.street.pick': 'Hay {n} calles con ese nombre en {municipality}. Elige una:',
  // G13: casi-matches del callejero oficial — se ofrecen, nunca se eligen.
  'address.street.near': 'Sin coincidencia exacta en el callejero. ¿Querías decir…?',
  'address.street.near_pick':
    'Sin coincidencia exacta: {n} calles próximas en el callejero oficial de {municipality}.',
  'address.number.ask': '{street}: escribe el número del portal.',
  'address.number.ask_n':
    '{street}: {n} portales numerados en el callejero oficial. Escribe el número.',
  'address.street.network_error': 'No hay conexión con el geocodificador oficial (NORA).',
  'address.portal.searching': 'Buscando el portal…',
  'address.portal.none': 'No consta el número {number} en esa calle.',
  'address.portal.pick': 'Hay varios portales con ese número. Elige el tuyo:',
  'address.portal.acepcion': ' ({acepcion})',
  'address.portal.cp': 'CP {cp}',
  'address.building.searching': 'Comprobando el edificio…',
  'address.building.not_found':
    'No hemos podido vincular esta dirección a un edificio catastral concreto.',
  'address.building.multiple':
    'El portal corresponde a {n} edificios catastrales. Elige cuál es el tuyo:',
  'address.result.title': 'Tu edificio',
  'address.result.linked': 'Identificado en Catastro a partir del portal {portal_desc}.',
  'address.result.nora_only':
    'NORA identifica edificio en este portal, pero ningún polígono catastral contiene el punto del portal. Mostramos el dato NORA sin vincularlo al Catastro.',
  'address.year.both_equal': 'Catastro y NORA registran el mismo año: {year}.',
  'address.year.both_differ':
    'Catastro registra {catastro_year}. NORA registra {nora_year}. Son dos fuentes oficiales distintas; mostramos ambas sin corregir una con la otra.',
  'address.year.catastro_only':
    'Catastro registra {catastro_year}. NORA no registra año para este edificio.',
  'address.year.nora_only':
    'NORA registra {nora_year}. El Catastro no indica un año de construcción para este edificio.',
  'address.year.both_unknown':
    'Ni Catastro ni NORA registran un año de construcción para este edificio.',
  'address.provenance':
    'Dirección: NORA (geoEuskadi, Gobierno Vasco) · Edificio: Catastro de Bizkaia (Open Data Bizkaia). La vinculación es por el punto oficial del portal.',
  'address.reset': 'Buscar otra dirección',
  'address.close': 'Cerrar la búsqueda de dirección',

  // ── DOS AÑOS (G3-A) — segundo ancla temporal ───────────────────────────
  'compare.invite': 'Añade otro año',
  'compare.invite_note': 'Por ejemplo el de otra persona. Misma vista, dos años.',
  'compare.label': 'Otro año',
  'compare.apply': 'Comparar',
  'compare.remove': 'Quitar el segundo año',
  'compare.invalid': 'Introduce un año entre 1900 y {snapshot_year}.',
  'compare.marker': 'OTRO AÑO · {compare_year}',
  'compare.partition.title': 'El parque actual repartido entre dos años',
  'compare.partition.before': 'Hasta {earlier}: {n} edificios ({pct} %)',
  'compare.partition.between': 'Entre {earlier} y {later}: {n} edificios ({pct} %)',
  'compare.partition.after': 'Después de {later}: {n} edificios ({pct} %)',
  'compare.partition.unknown': 'Sin año utilizable: {n}',
  'compare.partition.denominator':
    'De los edificios actuales con año conocido en {municipality} ({known}).',
  'map.legend.compare.before': 'Terminado hasta {earlier}',
  'map.legend.compare.between': 'Entre {earlier} y {later}',
  'map.legend.compare.after': 'Después de {later}',

  // ── PLANEAMIENTO + CONTEXTO AE (G3-B) ─────────────────────────────────
  'planning.title': '¿Y qué está previsto?',
  'planning.intro': 'Los datos de planeamiento de {municipality}, con fecha {ref_date}, recogen:',
  'planning.not_prediction':
    'Son posibilidades recogidas en los planes, no obras confirmadas ni una previsión de cuándo se construirán.',
  'planning.item.viv': '{n} viviendas pendientes de ejecución',
  'planning.item.res_v': '{n} ha de suelo residencial vacante',
  'planning.item.ae_v': '{n} ha de suelo para actividades económicas vacante',
  'planning.meaning.summary': 'Qué significa',
  'planning.meaning':
    'El planeamiento vigente registra capacidad, no construcción anunciada. Suelo vacante no implica desarrollo, y la clasificación describe el estado jurídico del suelo hoy — puede cambiar. Estos datos describen planeamiento, no predicción.',
  'planning.source':
    'Datos globales de planeamiento · Open Data Bizkaia (Diputación Foral de Bizkaia, CC BY 4.0). Ejercicio {ej}.',
  'planning.unavailable':
    'No se ha podido cargar el contexto de planeamiento. El resto de la ficha sigue disponible.',
  'planning.local.clasif': 'El suelo que ocupa este edificio está clasificado como {clasif}.',
  'planning.local.clasif_partial':
    'El suelo que ocupa este edificio está clasificado mayoritariamente ({pct} %) como {clasif}.',
  'planning.local.uso': 'Uso global registrado para este suelo: {usos}.',
  'planning.local.ambito':
    'Cae dentro del ámbito que la fuente oficial identifica como «{name}» ({tipo}).',
  'planning.local.ambito_multi':
    'Cae dentro de {n} ámbitos oficiales que se solapan en este punto — los listamos todos:',
  'planning.local.ae': 'Se solapa con el espacio que el inventario oficial denomina «{name}».',
  'planning.local.map_show': 'Ver los ámbitos en el mapa',
  'planning.local.map_hide': 'Ocultar los ámbitos del mapa',
  'planning.local.outside':
    'El suelo de este edificio no consta en las áreas de clasificación consultadas del planeamiento vigente.',
  'planning.local.unavailable':
    'El contexto local de planeamiento no está disponible para este municipio.',
  'planning.clasif.urbano': 'suelo urbano',
  'planning.clasif.urbanizable': 'suelo urbanizable',
  'planning.clasif.no_urbanizable': 'suelo no urbanizable',
  'planning.clasif.suspendidos': 'suelo con aprobación en suspenso',
  'planning.uso.residencial': 'residencial',
  'planning.uso.act_economicas': 'actividades económicas',
  'planning.uso.sistemas_generales': 'sistemas generales',
  'planning.uso.no_urbanizable': 'categorías de suelo no urbanizable',
  'planning.uso.suspendidos': 'suspendido',
  'planning.ambito.resid_urbano': 'ámbito residencial en suelo urbano',
  'planning.ambito.ae_urbano': 'ámbito de actividad económica en suelo urbano',
  'planning.ambito.pe_resid': 'plan especial residencial',
  'planning.ambito.pe_ae': 'plan especial de actividad económica',
  'planning.ambito.resid_urbanizable': 'ámbito residencial en suelo urbanizable',
  'planning.ambito.ae_urbanizable': 'ámbito de actividad económica en suelo urbanizable',

  // ── CONTEXTO ACTUAL CONDICIONAL (G3-D) ────────────────────────────────
  'context.title': 'Tu entorno, según los datos oficiales',

  'context.noise.q': '¿Qué banda de ruido cartografía oficialmente este punto?',
  'context.noise.mapped':
    'El mapa estratégico de ruido sitúa este punto en la banda oficial {range} dB para el periodo {period}.',
  'context.noise.mapped_multi':
    'El mapa estratégico de ruido registra en este punto varias bandas solapadas para el periodo {period}: {ranges} dB.',
  'context.noise.not_mapped':
    'Este punto queda fuera de la cobertura del mapa estratégico de ruido de carreteras forales. No significa ausencia de ruido: la fuente no lo cartografía.',
  'context.noise.day': 'día',
  'context.noise.evening': 'tarde',
  'context.noise.night': 'noche',
  'context.noise.map_show': 'Ver las bandas de ruido en el mapa',
  'context.noise.map_hide': 'Ocultar las bandas de ruido',
  'context.noise.period_shown': 'Periodo mostrado:',
  'context.noise.source':
    'Mapa estratégico de ruido de las carreteras forales · Open Data Bizkaia (CC BY 4.0). Mapa oficial; no es una medición del punto exacto.',

  'context.mobility.q': '¿Qué transporte público conecta este entorno?',
  'context.mobility.available_one': 'A menos de 400 m hay 1 parada oficial de Bizkaibus:',
  'context.mobility.available': 'A menos de 400 m hay {n} paradas oficiales de Bizkaibus:',
  'context.mobility.stop': '{name} · {dist} m · líneas {routes}',
  'context.mobility.stop_noroutes': '{name} · {dist} m',
  'context.mobility.none':
    'La fuente oficial no registra ninguna parada de Bizkaibus a menos de 400 m de este punto.',
  'context.mobility.map_show': 'Ver las paradas en el mapa',
  'context.mobility.map_hide': 'Ocultar las paradas',
  'context.mobility.source':
    'Información geográfica de rutas y paradas de Bizkaibus · Open Data Bizkaia (CC BY 4.0). Distancia en línea recta; sin horarios ni frecuencias.',

  'context.monte.q': '¿Está este punto dentro de un monte público?',
  'context.monte.inside':
    'Este punto se encuentra dentro del monte público que la fuente oficial denomina «{name}».',
  'context.monte.inside_multi':
    'Este punto cae dentro de {n} montes públicos que se solapan — los listamos todos:',
  'context.monte.item': '«{name}»',
  'context.monte.owner': 'Titular declarado en la fuente: {owner}.',
  'context.monte.date_deslinde': 'fecha de deslinde: {date}',
  'context.monte.date_amojonamiento': 'fecha de amojonamiento: {date}',
  'context.monte.date_catalogacion': 'fecha de catalogación: {date}',
  'context.monte.outside': 'Este punto no consta dentro de ningún monte público de Bizkaia.',
  'context.monte.map_show': 'Ver el monte en el mapa',
  'context.monte.map_hide': 'Ocultar el monte',
  'context.monte.source':
    'Montes públicos de Bizkaia · Open Data Bizkaia (CC BY 4.0). Monte público no equivale a espacio natural protegido.',

  // ── Secciones G5 — secuencia editorial ────────────────────────────────
  'section.reading': '¿De qué épocas son los edificios actuales?',
  'section.place': 'Baja hasta tu calle',
  'section.more': 'Para seguir leyendo',
  'section.context': 'Qué más sabemos del lugar',

  // ── Contexto del lugar (G5-G): líneas editoriales, fuente+fecha ────────
  'place.population': 'El padrón del {ref_date} registró {pop} habitantes en {municipality}.',
  'place.family.censo': 'censo',
  'place.family.padron': 'padrón municipal',
  // Nombre editorial de la observación (EDITORIAL_STYLE §2): censo por
  // año; padrón por año o por «mes de año» si el literal no es 0101.
  'place.obs.censo': 'el censo de {year}',
  'place.obs.padron': 'el padrón de {year}',
  'place.obs.padron_month': 'el padrón de {month_year}',
  'place.pop.then.exact':
    'En {year}, el año en que naciste, {municipality} registraba {pop} habitantes en el {family}.',
  'place.pop.then.near':
    'El dato más cercano a tu nacimiento es {obs} ({relative}): {pop} habitantes en {municipality}.',
  'place.housing.then': 'En el censo de {then_year} había {then} viviendas familiares.',
  'place.housing.then_now':
    'También podemos comparar las viviendas: el censo de {then_year} contó {then} viviendas familiares y el de {now_year}, {now}. Son las fechas de esos censos, no necesariamente las de tu nacimiento y el presente.',
  // Provenance una sola vez por bloque, con menor jerarquía — nunca
  // entre paréntesis dentro de cada frase (EDITORIAL_STYLE §6).
  'place.context.src': 'Eustat · padrón municipal y censos de población y vivienda',
  'hotspots.ask': '¿Dónde se concentran los edificios posteriores a {year}?',
  'hotspots.loading': 'Buscando las zonas con más construcción posterior…',
  'hotspots.title':
    'Zonas de 500 × 500 m con más edificios actuales construidos después de {year}:',
  'hotspots.item': '{count} edificios actuales construidos después de {year} — ver en el mapa',
  // G16: las celdas no tienen nombre oficial — la referencia es neutral y
  // verificable (número de zona + distancia/cardinal desde el centro).
  'hotspots.zone': 'Zona {n}',
  'hotspots.center': 'en el centro del municipio',
  'hotspots.ref': 'a {km} km al {dir} del centro',
  'hotspots.photo': 'ver en fotos',
  'dir.n': 'norte',
  'dir.ne': 'noreste',
  'dir.e': 'este',
  'dir.se': 'sureste',
  'dir.s': 'sur',
  'dir.sw': 'suroeste',
  'dir.w': 'oeste',
  'dir.nw': 'noroeste',
  'hotspots.note':
    'Solo cuenta el parque que existe hoy: lo demolido antes no está en el catastro actual. Toca una zona para verla en el mapa o abre sus fotografías.',
  'hotspots.empty':
    'No hemos encontrado zonas que alcancen el umbral de concentración de edificios posteriores a {year} en este municipio.',
  'hotspots.error':
    'Ahora no podemos cargar los datos de estas zonas. Inténtalo de nuevo más tarde.',
  'place.context.loading': 'Cargando el contexto del lugar…',
  'place.context.unavailable':
    'El contexto del lugar no está disponible ahora mismo. El resto de la pieza sigue funcionando.',

  // ── Historias G4 — capítulos editoriales (evidence/g2/story-briefs) ────
  'story.section.title': 'Cinco lugares de Bizkaia',
  'story.section.intro':
    'Cinco conjuntos de edificios donde el mismo dato cuenta historias distintas. Cada capítulo configura el mapa para verlo; tu año y tu lugar se conservan aparte.',
  'story.discover': 'Descúbreme un cambio',
  'story.explore': 'Explorar este lugar →',
  'story.next': 'Otro',
  'story.back': 'Volver a mi Bizkaia',
  'story.k.see': 'Qué vemos',
  'story.k.data': 'El dato',
  'story.k.know': 'Qué sabemos y qué no sabemos',
  'story.move.time': 'Ver en el tiempo',
  'story.move.map': 'Ver en el mapa',
  'story.air': 'Míralo desde el aire',
  'story.chapter': 'Capítulo {n} de 5',

  'story.c2803.label': 'En torno a la ría · seis municipios · 1960–1969',
  'story.c2803.title': 'Un patrón de los sesenta cruza seis municipios',
  'story.c2803.see':
    'Este recorrido conecta 21 zonas de Getxo, Leioa, Portugalete, Santurtzi, Sestao y Trapagaran. Entre los edificios actuales con año conocido de estas zonas, los años sesenta son la década más frecuente.',
  'story.c2803.data':
    'En este conjunto continuo hay 4.520 edificios actuales con año conocido (cobertura 99,9 %). Entre 1960 y 1969 se terminaron 863 — más que en cualquier otro periodo registrado aquí.',
  'story.c2803.know':
    'Sabemos cuántos edificios actuales constan por periodo. No sabemos por este dato qué produjo el impulso ni qué había antes en cada parcela: el Catastro describe solo los edificios que existen hoy.',

  'story.f4036.label': 'Mungia · un conjunto de 70 edificios · 1970–1979',
  'story.f4036.title': 'Muchos edificios posteriores, muy poca huella',
  'story.f4036.see':
    'En este conjunto, la mayoría de los edificios actuales son posteriores a 1979, pero juntos representan una fracción mínima de la huella en planta total.',
  // G9: en capítulos con contraste, EL DATO son las dos cifras grandes —
  // sin párrafo previo que las repita (dato → lectura, no dato dos veces).
  'story.f4036.know':
    'La diferencia nos dice que recuento y huella cuentan cosas muy distintas. No nos dice qué había antes, si hubo derribos ni cómo evolucionó históricamente el casco.',

  'story.f4233.label': 'Muskiz · un conjunto de 51 edificios · 1970–1979',
  'story.f4233.title': '51 edificios actuales, una misma década',
  'story.f4233.see':
    'Fíjate en esta zona de Muskiz. Al avanzar por los años setenta, el mapa muestra sus edificios actuales según el año de construcción registrado. Puedes comparar esas fechas con tu propia vida.',
  'story.f4233.data':
    'El Catastro registra un año de construcción entre 1970 y 1979 para los 51 edificios actuales de este conjunto. Todos tienen año conocido: cobertura del 100 %.',
  'story.f4233.know':
    'El dato se refiere solo a este conjunto de edificios, no a todo Muskiz. No permite saber qué ocupaba el lugar antes ni qué edificios desaparecieron. Las fotografías históricas ayudan a explorar ese antes y después.',

  'story.f4738.label': 'Santurtzi · un conjunto de 54 edificios · 1990–1999',
  'story.f4738.title': 'Pocos edificios concentran casi toda la huella',
  'story.f4738.see':
    'Mira el espacio que ocupan estos edificios sobre el terreno. Un edificio grande puede ocupar más que muchos pequeños juntos: contar edificios y medir su huella responde a preguntas distintas.',
  'story.f4738.know':
    'Sabemos que unas pocas huellas muy grandes dominan esta medida. No sabemos por este dato cuál es su uso ni qué existía antes.',

  'story.f149.label': 'Abanto Zierbena · un conjunto de 69 edificios · 2000–2009',
  'story.f149.title': 'El caso más reciente de los cinco',
  'story.f149.see':
    'Los 69 edificios actuales de Abanto Zierbena incluidos en este caso tienen año registrado en la década de 2000.',
  'story.f149.data':
    'Los 69 edificios con año conocido de este conjunto se terminaron en la década de 2000. Cobertura: 100 %.',
  'story.f149.know':
    'Sabemos que todo el conjunto es posterior a 2000. No sabemos si queda suelo pendiente de desarrollo: el dato cubre solo los edificios que existen hoy.',

  // ── Restauración de deep links (G4 GU2) ────────────────────────────────
  'building.restore_failed':
    'No hemos podido localizar el edificio del enlace en este lugar. El mapa y las cifras siguen disponibles.',
  'compare.same_year':
    'El segundo año debe ser distinto de {selected_year}: la partición sería vacía.',

  // ── Accesibilidad ──────────────────────────────────────────────────────
  'a11y.skip': 'Saltar al contenido',
  'a11y.map.canvas.main': 'Mapa principal: edificios actuales por estado temporal',
  'a11y.map.canvas.compare':
    'Mapa de comparación: segunda campaña de ortofoto, sincronizado con el mapa principal',

  // ── G11 · dirección de arte ────────────────────────────────────────────
  // Home: recorte real de un lugar concreto — la curva de la ría de Bilbao
  // (Abandoibarra), mismo bbox en dos campañas (data/hero/, manifest).
  'hero.visual.alt':
    'La curva de la ría de Bilbao en dos ortofotos oficiales: a la izquierda, la campaña de 1956 en blanco y negro, con los astilleros de Abandoibarra; a la derecha, la campaña de 2025 en color, con el nuevo frente de la ría.',
  'hero.visual.caption':
    'Bilbao · la curva de la ría y Abandoibarra. Ortofoto oficial de la campaña 1956 (Open Data Bizkaia) y de la campaña 2025 (geoEuskadi) · CC BY 4.0.',
  'hero.visual.now': '2025',
  'hero.contest': 'Una pieza construida solo con datos públicos oficiales',

  // Resultado: fila de hechos
  'facts.title': 'Tus cifras de un vistazo',
  'facts.after': 'edificios actuales posteriores a {year}',
  'facts.pop': 'habitantes empadronados',
  'facts.photo': 'la imagen aérea oficial más cercana a tu año',
  'facts.decade': 'la década con más edificios actuales de {municipality}',
  'facts.decade_pre1900': 'antes de 1900',

  // Cierre: sobre el proyecto, fuentes, concurso, pie
  'about.title': 'Sobre este proyecto',
  'about.body':
    'Más joven que tú responde a una pregunta sencilla: ¿cuánto ha cambiado la Bizkaia que ves desde que naciste? Para responderla usa solo datos públicos oficiales — el catastro de edificios, las ortofotos históricas, la cartografía de 1923–25 y las series de población y vivienda — sin inventar ni interpolar fechas. Cuando un dato no existe, lo dice.',
  'about.contest':
    'Pieza presentada a los Premios al Reto de Periodismo de Datos 2026 de la Diputación Foral de Bizkaia, categoría de visualización de datos.',
  'sources.title': 'Datos utilizados',
  'sources.intro':
    'Todo lo que ves sale de fuentes públicas oficiales. Open Data Bizkaia es la fuente principal; el resto la complementan.',
  'sources.catastro.org': 'Open Data Bizkaia — Diputación Foral de Bizkaia',
  'sources.catastro.what':
    'Parcelario catastral: edificios actuales y su año de construcción registrado.',
  'sources.catastro.cov': '112 municipios · conjunto de datos {snapshot_year}',
  'sources.orto.org': 'Ortofotos históricas — Open Data Bizkaia',
  'sources.orto.what': 'Serie de fotos aéreas oficiales para viajar en el tiempo.',
  'sources.orto.cov': '9 campañas · 1956–2002',
  'sources.geoeuskadi.org': 'geoEuskadi — Gobierno Vasco',
  'sources.geoeuskadi.what':
    'Ortofotos que completan la serie (1945–46 y 2004–2025) y el geocodificador NORA. Fuente complementaria.',
  'sources.geoeuskadi.cov': 'Serie anual reciente + épocas históricas',
  'sources.eustat.org': 'Eustat — Instituto Vasco de Estadística',
  'sources.eustat.what': 'Población municipal (censo y padrón) y viviendas censales.',
  'sources.eustat.cov': '1900–2025 · 112 municipios',
  'sources.hist.org': 'Cartografía histórica 1923–1925 — Open Data Bizkaia',
  'sources.hist.what': 'Hojas topográficas y toponímicas georreferenciadas de hace un siglo.',
  'sources.hist.cov': 'Territorio histórico completo',
  'sources.planning.org': 'Planeamiento urbanístico — Open Data Bizkaia',
  'sources.planning.what':
    'Planeamiento vigente por municipio: el «¿y mañana?» con carácter informativo.',
  'sources.planning.cov': 'Por municipio · fecha de referencia visible',
  'sources.link': 'Portal oficial',

  'foot.nav.a11y': 'Navegación del proyecto',
  'foot.nav.project': 'Sobre el proyecto',
  'foot.nav.how': 'Cómo lo calculamos',
  'foot.nav.sources': 'Datos utilizados',
  'foot.legal':
    'Las imágenes y los datos conservan la licencia de su fuente (CC BY 4.0 salvo indicación).',
  'foot.made': 'Hecho con datos abiertos de Bizkaia.',

  // Metodología ampliada
  'how.limits.title': 'Limitaciones',
  'how.limits.stock':
    'El catastro describe los edificios que existen hoy: no reconstruye el pasado ni contiene los edificios demolidos.',
  'how.limits.heaping':
    'Una parte de los años registrados se concentra en años acabados en 0 o 5: es un rasgo del dato, no un pico de construcción seguro.',
  'how.limits.ortho':
    'La foto aérea disponible más cercana puede no coincidir con tu año exacto; siempre se muestra el año real de la campaña.',
  'how.limits.families':
    'Población de censo, de padrón y viviendas son series oficiales separadas: nunca se mezclan en una misma comparación.',
  'how.steps.title': 'Cómo lo calculamos',
  'how.steps.1': 'Eliges un año de nacimiento y un lugar de Bizkaia.',
  'how.steps.2':
    'Tomamos los edificios que existen hoy en ese lugar y cuyo año de construcción está registrado.',
  'how.steps.3': 'Comparamos esos años con el tuyo: cuántos son anteriores y cuántos posteriores.',
  'how.steps.4':
    'Las ortofotos son evidencia independiente: se ven, pero nunca se usan para inventar fechas.',
  'how.steps.5':
    'Población y vivienda vienen de series oficiales de Eustat, cada una con su metodología.'
};

export type CopyKey = keyof typeof es;
