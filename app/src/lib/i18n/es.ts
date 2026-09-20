/**
 * Diccionario de copy (es) — única fuente de texto de la interfaz.
 * Criterio G1 C1: 0 literales en componentes. Origen: docs/UX_COPY.md §12–§21.
 * Estructura preparada para `eu` (sin traducción automática como copy final).
 */

export const es: Record<string, string> = {
  // ── Hero (INTRO) — UX_COPY §12 · G5: portada editorial ─────────────────
  'hero.title': 'Más joven que tú',
  'hero.tagline': '70 años construyendo Bizkaia',
  'hero.question': '¿Qué parte de la Bizkaia que ves hoy apareció después que tú?',
  'hero.intro':
    'Introduce tu año de nacimiento y busca un lugar de Bizkaia. Verás qué edificios actuales se terminaron después y cómo se distribuye el parque que existe hoy.',
  'hero.label.year': 'Año de nacimiento',
  'hero.label.place': 'Lugar',
  'hero.placeholder.year': '1987',
  'hero.placeholder.place': 'Leioa',
  'hero.cta': 'Ver mi Bizkaia',
  'hero.privacy':
    'Solo usamos el año. No guardamos tu fecha de nacimiento, tu nombre ni tu correo.',
  'hero.sources':
    'Datos oficiales: Catastro de Bizkaia, ortofotos y cartografía histórica · Open Data Bizkaia · geoEuskadi · Eustat.',
  'hero.year.invalid': 'Introduce un año entre 1900 y {snapshot_year}.',

  // ── Titular y cobertura (RESULT) — UX_COPY §13 · G5: respuesta llana ───
  'result.headline.pre': 'Eres mayor que el',
  'result.headline.post': 'de los edificios que hoy forman {municipality}.',
  // G5-R2: frase directa — restating del titular en lenguaje llano,
  // con la aproximación humana y la marca del producto («más joven que tú»).
  'result.plain.some':
    'Es decir: {approx} edificios actuales de {municipality} son más jóvenes que tú.',
  'result.plain.all':
    'Es decir: casi todos los edificios actuales de {municipality} son más jóvenes que tú.',
  'result.plain.none': 'Es decir: ningún edificio actual de {municipality} es más joven que tú.',
  'result.lead':
    'De los {known} edificios actuales con año registrado en Catastro, {after} se terminaron después de {selected_year}.',
  // G5-R2: un único dato humano junto al resultado (Eustat, dentro del
  // metrics JSON — sin petición nueva en el critical path).
  'result.population':
    '{municipality} tiene hoy {population} habitantes empadronados (Eustat, padrón de {period}).',
  'result.coverage':
    'Hay año registrado para {known} de los {total} edificios actuales ({coverage_pct} %); la cifra se calcula solo sobre esos.',
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
  'dist.tooltip.decade': '{decade}s · {n} edificios · {share} % del parque con año conocido',
  'dist.marker.note':
    'La línea marca tu año exacto. Las barras son periodos: la línea puede caer dentro de una barra.',
  'dist.summary':
    'Periodo con más edificios actuales: {decade}s ({n}). Cobertura: {coverage_pct} %.',

  // ── Mapa y leyenda — UX_COPY §15 ───────────────────────────────────────
  'map.legend.title': 'Leyenda',
  'map.legend.after': 'Terminado después de {selected_year}',
  'map.legend.before': 'Ya existía en {selected_year}',
  'map.legend.noyear': 'Año no utilizable (sin dato o anómalo)',
  'map.legend.cells': 'Cada celda colorea la cuota de edificios posteriores a {selected_year}',
  'map.legend.cells.more': 'más posteriores',
  'map.legend.cells.less': 'menos',
  'map.legend.cells.small_n':
    'Pocos edificios con año válido en esta celda (n={n}); unos pocos edificios pueden cambiar mucho el porcentaje.',
  'map.tooltip.cell.share':
    '{share} de cada 100 edificios de esta celda se terminaron después de {selected_year}',
  'map.tooltip.cell.denominator': 'sobre {known} edificios con año conocido',
  'map.tooltip.cell.footprint':
    'En huella en planta: el {share} % de la superficie con año conocido es posterior a {selected_year}',
  'map.tooltip.cell.no_known': 'Esta celda no tiene edificios con año de construcción conocido',
  'map.cell.inspect': 'Ver datos de esta zona',
  'map.cell.detail': 'Celda seleccionada',
  'map.cell.close': 'Cerrar detalle de celda',
  'map.cell.none': 'No hay ninguna celda en el centro actual del mapa',
  'map.legend.munis': 'Cada municipio colorea la cuota de edificios posteriores a {selected_year}',
  'map.visible_universe':
    'Estadística del municipio de {municipality}. El encuadre del mapa no la cambia.',
  'map.attribution.buildings':
    'Edificios: Catastro de Bizkaia — Open Data Bizkaia (CC BY 4.0). Licencia del código: MIT.',

  // ── Edificio — UX_COPY §16 ─────────────────────────────────────────────
  'building.year': 'Este edificio consta como terminado en {year}.',
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
  'ortho.proposal':
    'La foto aérea oficial más próxima a {selected_year} es de {nearest_year} (a {delta} años).',
  'ortho.view': 'Ver la foto de {nearest_year}',
  'ortho.compare': 'Comparar con {latest_year}',
  'ortho.loading': 'Cargando la fotografía de {year}…',
  'ortho.available': 'Fuente: {publisher} · Campaña {year}{flight_range} · CC BY 4.0.',
  'ortho.not_covered':
    'La campaña de {year} no cubre este lugar. Puedes probar {alternatives}: son las campañas más cercanas que sí cubren este punto.',
  'ortho.service_error':
    'La ortofoto oficial no está disponible temporalmente. El resto de la visualización sigue funcionando.',
  'ortho.retry': 'Reintentar',
  'ortho.hide': 'Ocultar la foto',
  'ortho.compare_label': 'Campaña {left_year} ◀ ▶ Campaña {right_year}',
  'ortho.publisher.bizkaia': 'Open Data Bizkaia — Diputación Foral de Bizkaia',
  'ortho.publisher.geoeuskadi': 'geoEuskadi — Gobierno Vasco',
  'ortho.flight_range': ' (vuelo {flight_range})',
  'ortho.section_label': 'Ortofoto',
  'ortho.fallback_alt': 'otra campaña',

  // ── Mapa histórico 1923–25 (standalone; es un mapa, no una foto) ───────
  'histmap.proposal':
    'La cartografía oficial 1:25.000 registró este lugar entre 1923 y 1925, antes de la primera fotografía aérea.',
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
  'search.results': '{n} resultado(s) en NORA · {m} con datos disponibles',
  'search.no_results': 'No encontramos «{query}» en Bizkaia. Prueba con un municipio.',
  'search.out_of_scope': 'NORA reconoce {n} lugares, pero están fuera de Bizkaia.',
  'search.network_error': 'No hay conexión con el geocodificador oficial (NORA).',
  'search.selected': 'Seleccionado {municipality}. La estadística es la municipal.',
  'search.listbox': 'Lugares de Bizkaia',
  'ui.loading': 'Cargando…',

  // ── Compartir y estados vacíos — UX_COPY §19 ───────────────────────────
  'share.label': 'Compartir esta vista',
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

  // ── Eje temporal (G2) — reproducción del stock actual ──────────────────
  'time.axis_label': 'Eje temporal: incorporación del parque actual por año registrado',
  'time.play': 'Reproducir',
  'time.pause': 'Pausar',
  'time.restart': 'Reiniciar desde {selected_year}',
  'time.reset': 'Volver al presente',
  'time.step_back': 'Un año atrás',
  'time.step_fwd': 'Un año adelante',
  'time.scrub_label': 'Año en reproducción',
  'time.you': 'TU AÑO · {selected_year}',
  'time.playhead': 'REPRODUCCIÓN · {play_year}',
  'time.status':
    'Año en reproducción {play_year}: se muestra el parque actual con año registrado hasta {play_year}.',
  'time.caption':
    'Así se incorpora al mapa el parque que existe hoy según el año de construcción registrado en Catastro. Sobre los edificios actuales con año conocido.',
  'map.legend.cells.play':
    'Cada celda colorea la cuota del parque actual constatada hasta {play_year}',
  'map.legend.buildings.play': 'Se muestran los edificios registrados hasta {play_year}',

  // ── Modos de la escena (G5 GT3): LEER EL DATO vs COMPROBAR ─────────────
  'view.label': 'Vista del mapa',
  'view.group.read': 'Leer el dato',
  'view.group.check': 'Comprobar con otras fuentes',
  'view.map': 'Edificios',
  'view.time': 'En el tiempo',
  'view.photo': 'Con fotos aéreas',
  'view.hist': 'Con el mapa de 1923–25',
  'view.swipe': '1956 / hoy',
  'view.bridge':
    'El tiempo de esta pieza es el año de construcción registrado en Catastro. Las fotos aéreas y el mapa de 1923–25 son otras fuentes para comprobarlo con tus ojos: no miden fechas.',
  'photo.label': 'Fotografía aérea oficial sobre la misma vista del mapa',
  'photo.prev': 'Campaña anterior: {year}',
  'photo.next': 'Campaña siguiente: {year}',
  'photo.prev_none': 'No hay campaña anterior',
  'photo.next_none': 'No hay campaña siguiente',
  'photo.nominal': 'campaña {year}',
  'photo.panel_a': 'Campaña {year}',
  'photo.proposal':
    'Sin imagen cargada todavía: activa la campaña para comprobar su cobertura aquí.',
  'photo.activate': 'Comprobar desde el aire',
  'photo.duo_on': 'Comparar con {latest_year}',
  'photo.duo_off': 'Cerrar la comparación',
  'photo.toggle.a11y': 'Elegir qué campaña se ve en el mapa',
  'photo.mobile_hint': 'En pantalla estrecha se ve una campaña cada vez.',

  // ── SWIPE (G6): cortina antes/después sobre la misma vista ───────────
  'swipe.today': 'Hoy · {year}',
  'swipe.hint': 'Desliza para comparar',
  'swipe.slider': 'Cortina de comparación: {before_year} a la izquierda, hoy a la derecha',
  'swipe.loading': 'Comprobando la ortofoto de {year}…',
  'swipe.tiles': 'Cargando la ortofoto de {year}…',
  'swipe.error': 'No se pudo comprobar la ortofoto de {year} en esta zona.',
  'swipe.after_error': 'No se pudo comprobar la ortofoto actual ({year}); la comparación sigue con lo verificado.',
  'swipe.src':
    'Izquierda: ortofoto {before_year} · Derecha: ortofoto {after_year} — Open Data Bizkaia y geoEuskadi, CC BY 4.0',

  // ── Contraste edificios / huella (C-05 vs C-08, denominadores explícitos) ─
  'contrast.title': 'Edificios frente a huella en planta',
  'contrast.buildings':
    'de cada 100 edificios actuales con año conocido se terminaron después de {selected_year}',
  'contrast.footprint':
    'de la huella en planta de los edificios con año conocido y geometría válida es posterior a {selected_year}',
  'contrast.note':
    'El recuento de edificios y el territorio que ocupan cuentan historias distintas.',

  // ── Pie / créditos — UX_COPY §20 ───────────────────────────────────────
  'footer.sources':
    'Fuente principal: Open Data Bizkaia — Diputación Foral de Bizkaia (Catastro y ortofotos 1956–2002, CC BY 4.0). Complemento: geoEuskadi / Gobierno Vasco (ortofotos 2004–2025 y geocodificador NORA, CC BY 4.0).',
  'footer.code': 'Código: MIT.',
  'footer.snapshot': 'Snapshot de datos: {snapshot_date}.',
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
  'how.snapshot.title': 'Snapshot de datos',
  'how.back': 'Volver',

  // ── MI EDIFICIO (G3-A) — dirección exacta tras el resultado ───────────
  'address.invite': '¿Quieres bajar hasta tu calle?',
  'address.invite_note':
    'Busca una dirección en {municipality}. Nada se guarda ni sale de esta página.',
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
  'planning.intro': 'A fecha de {ref_date}, el planeamiento vigente registra en {municipality}:',
  'planning.viv': 'viviendas pendientes de ejecución',
  'planning.res_v': 'ha de suelo residencial vacante',
  'planning.ae_v': 'ha de suelo de actividad económica vacante',
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
  'section.reading': 'La forma del parque',
  'section.place': 'Baja hasta tu calle',
  'section.more': 'Para seguir leyendo',
  'section.context': 'Qué más sabemos del lugar',

  // ── Contexto del lugar (G5-G): líneas editoriales, fuente+fecha ────────
  'place.population':
    '{municipality} tenía {pop} habitantes a 1 de enero de {pop_year} (Eustat, padrón municipal).',
  'place.population.hist':
    'En el censo de {census_year} contaba con {pop} habitantes (Eustat, población de hecho).',
  'place.context.loading': 'Cargando el contexto del lugar…',
  'place.context.unavailable':
    'El contexto del lugar no está disponible ahora mismo. El resto de la pieza sigue funcionando.',

  // ── Historias G4 — capítulos editoriales (evidence/g2/story-briefs) ────
  'story.section.title': 'Cinco lugares de Bizkaia',
  'story.section.intro':
    'Cinco conjuntos de edificios donde el mismo dato cuenta historias distintas. Cada capítulo configura el mapa para verlo; tu año y tu lugar se conservan aparte.',
  'story.discover': 'Descúbreme un cambio',
  'story.next': 'Otro',
  'story.back': 'Volver a mi Bizkaia',
  'story.k.see': 'Qué vemos',
  'story.k.data': 'El dato',
  'story.k.know': 'Qué sabemos y qué no sabemos',
  'story.move.time': 'Ver en el tiempo',
  'story.move.map': 'Ver en el mapa',
  'story.air': 'Míralo desde el aire',
  'story.chapter': 'Capítulo {n} de 5',

  'story.c2803.label': 'Margen izquierda · seis municipios · 1960–1969',
  'story.c2803.title': 'Un patrón de los sesenta cruza seis municipios',
  'story.c2803.see':
    'Un componente de 21 zonas contiguas cuya década dominante son los años 60 cruza Getxo, Leioa, Portugalete, Santurtzi, Sestao y Trapagaran.',
  'story.c2803.data':
    'En este conjunto continuo hay 4.520 edificios actuales con año conocido (cobertura 99,9 %). Entre 1960 y 1969 se terminaron 863 — más que en cualquier otro periodo registrado aquí.',
  'story.c2803.know':
    'Sabemos cuántos edificios actuales constan por periodo. No sabemos por este dato qué produjo el impulso ni qué había antes en cada parcela: el Catastro describe solo los edificios que existen hoy.',

  'story.f4036.label': 'Mungia · un conjunto de 70 edificios · 1970–1979',
  'story.f4036.title': 'Muchos edificios posteriores, muy poca huella',
  'story.f4036.see':
    'En este conjunto, la mayoría de los edificios actuales son posteriores a 1979, pero juntos representan una fracción mínima de la huella en planta total.',
  'story.f4036.data':
    'El 85,7 % de los edificios actuales con año conocido de este conjunto se terminó después de 1979; pero solo el 1,9 % de la huella en planta de los edificios con año conocido y geometría válida es posterior a ese año. Es la mayor divergencia entre recuento y huella del corpus.',
  'story.f4036.know':
    'La diferencia nos dice que recuento y huella cuentan cosas muy distintas. No nos dice qué había antes, si hubo derribos ni cómo evolucionó históricamente el casco.',

  'story.f4233.label': 'Muskiz · un conjunto de 51 edificios · 1970–1979',
  'story.f4233.title': 'Un conjunto entero construido en una década',
  'story.f4233.see':
    'Con el cabezal en marcha, los 51 edificios actuales con año conocido del conjunto se incorporan al mapa entre 1970 y 1979: la lectura más limpia de un pulso temporal.',
  'story.f4233.data':
    'Los 51 edificios con año conocido de este conjunto se terminaron todos en la década de 1970. Cobertura: 100 %.',
  'story.f4233.know':
    'Sabemos que los 51 edificios actuales registrados aquí constan en los años 70. No que Muskiz empezara entonces: el conjunto no es el municipio.',

  'story.f4738.label': 'Santurtzi · un conjunto de 54 edificios · 1990–1999',
  'story.f4738.title': 'Pocos edificios concentran casi toda la huella',
  'story.f4738.see':
    'El patrón inverso al de Mungia: una huella grande salta a la vista frente al tejido menudo que la rodea.',
  'story.f4738.data':
    'Los edificios posteriores a 1999 son el 11,1 % de los edificios actuales con año conocido, pero concentran el 94,7 % de la huella en planta de los edificios con año conocido y geometría válida.',
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
  'overlay.buildings.show': 'Ver el contorno de los edificios actuales sobre la imagen',
  'overlay.buildings.hide': 'Ocultar el contorno de los edificios',

  // ── Accesibilidad ──────────────────────────────────────────────────────
  'a11y.skip': 'Saltar al contenido',
  'a11y.map.canvas.main': 'Mapa principal: edificios actuales por estado temporal',
  'a11y.map.canvas.compare':
    'Mapa de comparación: segunda campaña de ortofoto, sincronizado con el mapa principal'
};

export type CopyKey = keyof typeof es;
