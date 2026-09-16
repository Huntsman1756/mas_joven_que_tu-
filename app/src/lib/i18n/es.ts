/**
 * Diccionario de copy (es) — única fuente de texto de la interfaz.
 * Criterio G1 C1: 0 literales en componentes. Origen: docs/UX_COPY.md §12–§21.
 * Estructura preparada para `eu` (sin traducción automática como copy final).
 */

export const es: Record<string, string> = {
  // ── Hero (INTRO) — UX_COPY §12 ─────────────────────────────────────────
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
  'hero.sources': 'Datos: Catastro de Bizkaia y ortofotos oficiales · Open Data Bizkaia · geoEuskadi.',
  'hero.year.invalid': 'Introduce un año entre 1900 y {snapshot_year}.',

  // ── Titular y cobertura (RESULT) — UX_COPY §13 ─────────────────────────
  'result.headline': 'Eres mayor que una parte de los edificios que hoy forman {municipality}.',
  'result.lead':
    'Entre los edificios actuales cuyo año de construcción consta en Catastro, {post_share} de cada 100 se terminó después de {selected_year}.',
  'result.coverage':
    'Cobertura del dato: {known} de {total} edificios actuales de {municipality} tienen año conocido ({coverage_pct} %). La cifra anterior se calcula solo sobre esos {known}.',
  'result.coverage.unknown_note': '· {unknown} sin año · {suspicious} con año anómalo.',
  'result.coverage.unknown_only': '· {unknown} sin año.',
  'result.coverage.suspicious_only': '· {suspicious} con año anómalo.',
  'result.caveat':
    'El Catastro describe los edificios que existen hoy. No sabemos por este dato cuántos edificios desaparecieron ni cuándo.',
  'result.calc':
    'Numerador: edificios con año conocido y Ano_Constr > {selected_year} = {after}. Denominador: edificios actuales con año conocido = {known}. % = {after} ÷ {known} × 100 = {post_share}. Los edificios sin año utilizable y las geometrías no válidas quedan fuera de ambos términos. Contrato DATA_SEMANTICS §11 C-04/C-05.',
  'result.calc.summary': '¿Cómo se calcula?',
  'result.low_coverage':
    'En este municipio falta el año de construcción en una parte relevante del parque actual. Consulta cómo afecta al cálculo.',
  'result.area':
    'Esos edificios suman {area} ha de huella en planta (el área que ocupan en el suelo, no la superficie construida).',
  'result.change': 'Cambiar año o lugar',
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
  'dist.bucket.pre1900.tooltip': 'Edificios anteriores a 1900 · {n} · {share} % del parque con año conocido',
  'dist.tooltip.decade': '{decade}s · {n} edificios · {share} % del parque con año conocido',
  'dist.marker.note': 'La línea marca tu año exacto. Las barras son periodos: la línea puede caer dentro de una barra.',
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
  'map.tooltip.cell.no_known':
    'Esta celda no tiene edificios con año de construcción conocido',
  'map.legend.munis': 'Cada municipio colorea la cuota de edificios posteriores a {selected_year}',
  'map.visible_universe':
    'Estadística del municipio de {municipality}. El encuadre del mapa no la cambia.',
  'map.attribution.buildings':
    'Edificios: Catastro de Bizkaia — Open Data Bizkaia (CC BY 4.0). Licencia del código: MIT.',

  // ── Edificio — UX_COPY §16 ─────────────────────────────────────────────
  'building.year': 'Este edificio consta como terminado en {year}.',
  'building.unknown': 'El Catastro no indica un año de construcción para este edificio.',
  'building.suspicious': 'El Catastro registra {raw_value}, un año anómalo: no se usa en las cifras.',
  'building.invalid': 'El año de este edificio no es interpretable: no se usa en las cifras.',
  'building.repaired': 'Geometría reparada y registrada (la original se conserva).',
  'building.fields': 'Uso: {uso} · Alturas: {alturas} · Huella: {area} m²',
  'building.fields.note': 'Huella en planta. No es superficie construida.',
  'building.calc': '¿Cómo se calcula?',
  'building.title': 'Edificio seleccionado',

  // ── Ortofoto (opt-in) — UX_COPY §17 ────────────────────────────────────
  'ortho.proposal': 'La foto aérea oficial más próxima a {selected_year} es de {nearest_year} (a {delta} años).',
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

  // ── Búsqueda de lugar — UX_COPY §18 ────────────────────────────────────
  'search.too_short': 'Consulta demasiado corta: escribe al menos 3 caracteres.',
  'search.searching': 'Buscando…',
  'search.results': '{n} resultado(s) · {m} municipios de Bizkaia',
  'search.no_results': 'No encontramos «{query}» en Bizkaia. Prueba con un municipio.',
  'search.out_of_scope': 'NORA reconoce {n} lugares, pero están fuera de Bizkaia.',
  'search.network_error': 'No hay conexión con el geocodificador oficial (NORA).',
  'search.selected': 'Seleccionado {municipality}. La estadística es la municipal.',
  'search.listbox': 'Lugares de Bizkaia',

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
    'Una campaña se nombra por su año nominal, pero el vuelo puede abarcar un rango. Por eso mostramos la campaña y, cuando consta, el rango real: por ejemplo, «campaña 1956 (vuelo 1956–1957)».',
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

  // ── Accesibilidad ──────────────────────────────────────────────────────
  'a11y.skip': 'Saltar al contenido',
  'a11y.map.canvas.main': 'Mapa principal: edificios actuales por estado temporal',
  'a11y.map.canvas.compare': 'Capa de comparación de ortofotos (swipe)',
};

export type CopyKey = keyof typeof es;
