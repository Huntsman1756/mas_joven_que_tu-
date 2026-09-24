/**
 * Diccionario de copy (eu) — borrador asistido con verificación estructural
 * (`npm run verify:eu`): mismas claves que `es`, mismos `{placeholders}`,
 * sin vacíos ni caracteres corruptos.
 *
 * Estado lingüístico: NO VERIFICADO. Borrador asistido contrastado
 * término a término con fuentes oficiales (Euskalterm vía fichas
 * indexadas, Eustat, datasets EU de Open Data Bizkaia/geoEuskadi):
 * eraikuntza-urtea, estaldura, lurzoru, oinplano-azalera, baso publikoa,
 * errolda/zentsoa, ataria, ortoargazki, kale-izendegia. Registro del
 * contraste: evidence/eu/terminology.md. No ha pasado revisión humana;
 * el gate verifica estructura, nunca corrección idiomática.
 *
 * Reglas aplicadas:
 * - Ningún placeholder lleva sufijo declinado: los nombres propios no
 *   flexionan por concatenación («{municipality} udalerrian», no
 *   «{municipality}n»). Los sufijos van sobre nombres comunes o se evitan.
 * - Nombres de calles, organismos y datasets sin traducir (NORA, Catastro,
 *   Open Data Bizkaia, geoEuskadi, Eustat, Bizkaibus, PMTiles, CC BY 4.0).
 * - « %» tras la cifra en ES → «% » delante en EU (convención vasca).
 * - Frases completas reordenadas al euskera, no traducción palabra a palabra.
 */

export const eu: Record<string, string> = {
  'search.choose_from_list': 'Hautatu udalerri bat zerrendan aurrera egin aurretik.',
  'planning.not_prediction':
    'Planetan jasotako aukerak dira, ez baieztatutako obrak, ezta noiz eraikiko diren adierazten duen aurreikuspena ere.',
  // ── Hero (INTRO) ──────────────────────────────────────────────────────
  'hero.title': 'Zure baino gazteagoa',
  'hero.tagline': 'Zure bizitza lurraldearen neurritzat',
  'hero.question': 'Zure udalerriak ere adina du.',
  'hero.intro':
    'Ezagutu zein egungo eraikin eraiki ziren zu jaio ondoren, eta alderatu leku bera beste garaietako argazkiekin.',
  'hero.label.year': 'Jaiotze-urtea',
  'hero.label.place': 'Udalerria',
  'hero.placeholder.year': '1988',
  'hero.placeholder.place': 'Getxo',
  'hero.cta': 'Ezagutu nire Bizkaia',
  'hero.privacy':
    'Urtea bakarrik erabiltzen dugu. Ez dugu zure jaiotze-data, izena edo helbide elektronikoa gordetzen.',
  'hero.sources':
    'Datu ofizialak: Bizkaiko Katastroa, ortoargazkiak eta kartografia historikoa · Open Data Bizkaia · geoEuskadi · Eustat.',
  'hero.year.invalid': 'Idatzi 1900 eta {snapshot_year} arteko urtea.',

  // ── Titular y cobertura (RESULT) ───────────────────────────────────────
  'result.kicker': '{municipality}, {selected_year} urtetik',
  'result.lead.some':
    'Urte ezaguna duten egungo eraikinetatik, {approx} eraiki ziren zu jaio ondoren.',
  'result.lead.none': 'Urte ezaguna duen egungo eraikin bat ere ez zen eraiki zu jaio ondoren.',
  'result.support': 'Zenbateko zehatza:',
  'result.pct_value': '% {pct}',
  'result.invite': 'Alderatu argazkiak eta ezagutu non pilatzen diren.',
  'result.about_data': 'Datu honi buruz',
  'result.lead': 'Eraikuntza-urte ezaguna duten {known} eraikinetatik {after}.',
  'result.population':
    '{ref_date}: {municipality} udalerriak {population} erroldatutako biztanle zituen.',
  'result.population.src': 'Eustat · Udalerriko errolda',
  'result.coverage': 'Erregistratutako urtearen estaldura: % {coverage_pct}.',
  'result.coverage.detail.body':
    'Eraikuntza-urtea erregistratuta dago egungo {total} eraikinetik {known} eraikinek; ehunekoa urte ezaguna dutenen gainean soilik kalkulatzen da.',
  'result.coverage.unknown_note':
    'Beste {unknown} eraikinek ez dute urte baliagarririk, eta {suspicious} eraikinek urte anomaloa erregistratzen dute.',
  'result.coverage.unknown_only': 'Beste {unknown} eraikinek ez dute urte baliagarririk.',
  'result.coverage.suspicious_only':
    'Beste {suspicious} eraikinek urte anomaloa erregistratzen dute.',
  'result.caveat':
    'Katastroak gaur egun dauden eraikinak deskribatzen ditu. Datu honen bidez ez dakigu zenbat eraikin desagertu ziren ezta noiz.',
  'result.calc':
    'Kontua: {selected_year} urtearen ondorengo {after} eraikin ÷ urtea erregistratuta duten {known} eraikin = 100etik {post_share}. Urte baliagarririk gabeko eraikinak ez dira sartzen ez zenbakitan ez zatitzailean.',
  'result.calc.technical':
    'Definizio zehatza, datu-kontratuak eta jatorria «Nola dakigu» atalean daude.',
  'result.calc.summary': 'Nola kalkulatzen dugun',
  'result.low_coverage':
    'Udalerri honetan eraikuntza-urtea falta zaio egungo parkearen zati nabari bati. Ikusi nola eragiten dion kalkuluari.',
  'result.area':
    'Eraikin horiek oinplanoan {area} ha hartzen dute: haien geometriak estaltzen duen lurzorua da, ez eraikitako azalera osoa.',
  'result.change': 'Aldatu urtea edo lekua',
  'result.change.short': 'Aldatu',
  'result.change.apply': 'Aplikatu',
  'result.change.cancel': 'Utzi',
  'result.map_label': 'Egungo eraikinen mapa, zure urtearekiko denbora-egoeraren arabera.',
  'result.text_summary':
    '{municipality} udalerrian {total} egungo eraikin daude; {known} eraikinek urte ezaguna dute eta {after} {selected_year} ondoren amaitu ziren.',

  // ── Distribución temporal ──────────────────────────────────────────────
  'dist.title': '{municipality} udalerriko egungo eraikinak, eraikuntza-garaiaren arabera',
  'dist.axis.x': 'Eraikuntza-garaia',
  'dist.axis.y': 'Egungo eraikin-kopurua',
  'dist.bucket.pre1900': '1900 baino lehen',
  'dist.bucket.none': 'urterik gabe',
  'dist.marker': 'ZURE URTEA · {selected_year}',
  'dist.denominator': 'urte ezaguna duten {known} eraikinen gainean',
  'dist.noyear_band': 'Urte baliagarririk gabe: {no_year} · % {no_year_pct}',
  'dist.heaping':
    'Banaketa garaietara multzokatzen da, ez urte bakotxera. Katastroko data batzuk biribilduta daude eta 0 edo 5 digituaz amaitutako urtetan pilatzen dira ({municipality} udalerrian, % {heaping_pct}). Horregatik ez ditugu urteko gailurrak eraikuntza-une gisa irakurtzen.',
  'dist.bucket.pre1900.tooltip':
    '1900 baino lehenagoko eraikinak · {n} · urte ezaguneko parkearen % {share}',
  'dist.tooltip.decade': '{decade} hamarkada · {n} eraikin · urte ezaguneko parkearen % {share}',
  'dist.marker.note':
    'Lerroak zure urte zehatza markatzen du. Barrak garaiak dira: lerroa barra baten barne erori daiteke.',
  'dist.summary':
    'Egungo eraikin gehien dituen garaia: {decade} ({n}). Erregistratutako urtearen estaldura: % {coverage_pct}.',

  // ── Mapa y leyenda ─────────────────────────────────────────────────────
  'map.legend.title': 'Legenda',
  'map.legend.details': 'Zer esan nahi duen koloreak',
  'map.legend.after': '{selected_year} ondoren amaitua',
  'map.legend.before': '{selected_year} urtean lehendik zegoen',
  'map.legend.noyear': 'Urte ez-baliagarria (daturik gabe edo anomaloa)',
  'map.legend.cells': '{selected_year} ondoren eraikitako eraikinak',
  'map.legend.cells.more': '% 100 · denak',
  'map.legend.cells.less': '% 0 · bat ere ez',
  'map.legend.cells.nodata': 'marratxoz: urte ezaguneko eraikinik gabeko gunea',
  'map.legend.cells.pending':
    'Marratxorik gabeko tonu neutroak datuak zain edo eskuragarri ez daudela ere adieraz dezake.',
  'map.cell.loading': 'Gune honetako datuak kargatzen…',
  'map.cell.missing': 'Ezin izan dira gune honetako datuak lortu.',
  'map.cell.load_error':
    'Zenbait guneren datuak ezin izan dira kargatu. Ez du esan nahi urte ezaguneko eraikinik ez dutenik.',
  'map.cell.retry': 'Berriz saiatu guneak kargatzen',
  'map.cell.footprint_detail': 'Ikusi oinplano-azalera',
  'map.legend.cells.universe': 'gune bakoitzeko urte ezagunekoen gainean',
  'map.legend.cells.small_n':
    'Gune honetan urte balioduna duten eraikin gutxi daude (n={n}); eraikin gutxi batzuek ehunekoa asko alda dezakete.',
  'map.tooltip.cell.share':
    'Gune honetako 100 eraikinetatik {share} amaitu ziren {selected_year} ondoren',
  'map.tooltip.cell.denominator': 'urte ezaguna duten {known} eraikinen gainean',
  'map.tooltip.cell.footprint':
    'Oinplano-azaleran: urte ezaguneko azaleraren % {share} da {selected_year} ondorengoa',
  'map.tooltip.cell.no_known': 'Gune honetan ez dago eraikuntza-urte ezaguna duen eraikinik',
  'map.cell.inspect': 'Ikusi gune honen datuak',
  'map.cell.inspect.title': 'Mapa erdiko gunearen datuak',
  'map.cell.detail': 'Gune honetan',
  'map.cell.close': 'Itxi gunearen xehetasuna',
  'map.cell.none': 'Ez dago gunerik maparen egungo zentroan',
  'map.cell.sentence':
    'urte ezaguna duten egungo {known} eraikinetatik {after} eraiki ziren zu jaio ondoren',
  'map.cell.sentence.play':
    'urte ezaguna duten egungo {known} eraikinetatik {until} daude {play_year} urtera arte eraikitzat',
  'map.cell.zoom': 'Hurbildu eraikinak banaka ikusteko',
  'map.cell.photos': 'Ikusi gune hau argazkitan',
  'map.legend.munis':
    'Udalerri bakoitzaren koloreak bere egungo eraikinen %a adierazten du, {selected_year} ondoren eraikitakoena',
  'map.legend.munis.play':
    'Udalerri bakoitzaren koloreak urte ezaguna duten bere egungo eraikinen %a adierazten du, {play_year} urtera arte eraikitzat daudena',
  'map.intro.title': 'Zein oraingo eraikin da zuri baino gazteago?',
  'map.intro.munis':
    'Gaur egungo eraikin guztiak ikusgai diraute. Koloreak udalerriko eraikinen zein zati eraiki zen adierazten du {selected_year} ondoren, urte ezaguna dutenen artean.',
  'map.intro.cells':
    'Laukizuzen bakoitzak 500 m-ko albo duen gune bateko egungo eraikinak biltzen ditu; guztiak ikusgai diraute eta koloreak zein zati eraiki zen adierazten du {selected_year} ondoren, urte ezaguna dutenen artean.',
  'map.intro.buildings':
    'Forma bakoitza gaur egungo eraikin bat da. Bermelloa {selected_year} ondoren amaitu bada; urdina lehendik bazegoen; marratxoz urtea baliagarria ez bada.',
  'map.visible_universe':
    '{municipality} udalerriaren estatistika. Maparen enkoadreak ez du aldatzen.',
  'map.scale.region': 'Bizkaiko ikuspegia. Hurbildu zure udalerria ikusteko.',
  'map.scale.zones': 'Gunez-guneko ikuspegia. Hurbildu eraikinak ikusteko.',
  // ── Edificio ───────────────────────────────────────────────────────────
  'building.year': 'Eraikin hau {year} urtean amaitutzat ageri da.',
  'building.rel.after': 'Zure jaiotza baino {n} gero.',
  'building.rel.before': 'Zure jaiotza baino {n} lehen.',
  'building.rel.exact': 'Zu jaio zinen urte berean amaitua.',
  'building.unknown': 'Katastroak ez du eraikuntza-urterik zehazten eraikin honentzat.',
  'building.suspicious':
    'Katastroak {raw_value} erregistratzen du, urte anomaloa: ez da zenbakietan erabiltzen.',
  'building.invalid': 'Eraikin honen urtea ezin da interpretatu: ez da zenbakietan erabiltzen.',
  'building.repaired': 'Geometria konponduta eta erregistratuta (jatorrizkoa gordetzen da).',
  'building.fields': 'Erabilera: {uso} · Solairuak: {alturas} · Oinplanoa: {area} m²',
  'building.fields.note': 'Oinplano-azalera. Ez da eraikitako azalera.',
  'building.calc': 'Nola kalkulatzen da?',
  'building.title': 'Hautatutako eraikina',
  'building.close': 'Itxi eraikinaren fitxa',

  // ── Ortofoto (opt-in) ──────────────────────────────────────────────────

  'ortho.loading': '{year} urteko argazkia kargatzen…',
  'ortho.available': 'Iturria: {publisher} · {year} kanpaina{flight_range} · CC BY 4.0.',
  'ortho.not_covered':
    '{year} kanpainak ez du leku hau estaltzen. {alternatives} proba ditzakezu: puntu hau estaltzen duten kanpaina hurbilenak dira.',
  'ortho.service_error':
    'Ortoargazki ofiziala ez dago eskuragarri aldi baterako. Gainerako bistaratzeak funtzionatzen jarraitzen du.',
  'ortho.retry': 'Berriz saiatu',
  'ortho.publisher.bizkaia': 'Open Data Bizkaia — Bizkaiko Foru Aldundia',
  'ortho.publisher.geoeuskadi': 'geoEuskadi — Eusko Jaurlaritza',
  'ortho.flight.range': ' ({range} hegaldia)',
  'ortho.flight.unknown_exact': ' ({from}–{to} hegaldia, data zehatza ezezagun)',
  'ortho.flight.american': ' ({range} · hegaldi amerikarra)',
  'ortho.section_label': 'Ortoargazkia',
  'ortho.fallback_alt': 'beste kanpaina bat',

  // ── Mapa histórico 1923–25 ─────────────────────────────────────────────
  'histmap.view': 'Ikusi 1923–25eko mapa historikoa',
  'histmap.loading': 'Mapa historikoa kargatzen…',
  'histmap.available':
    'Iturria: Open Data Bizkaia — Bizkaiko Foru Aldundia · Kartografia historikoa 1:25.000 (1923–1925) · CC BY 4.0.',
  'histmap.unavailable':
    'Mapa historiko ofiziala ez dago eskuragarri aldi baterako. Gainerako bistaratzeak funtzionatzen jarraitzen du.',
  'histmap.retry': 'Berriz saiatu',
  'histmap.hide': 'Ezkutatu mapa historikoa',
  'histmap.exit': 'Itzuli egungo mapara',
  'histmap.section_label': '1923–1925eko mapa historikoa',

  // ── Búsqueda de lugar ──────────────────────────────────────────────────
  'search.too_short': 'Kontsulta laburregia: idatzi gutxienez 3 karaktere.',
  'search.searching': 'Bilatzen…',
  'search.searching_more': 'Emaitza gehiago bilatzen…',
  'search.results': '{m} udalerri aurkitu dira (NORA erregistroan {n} bat-etortze)',
  'search.results_one': '{m} udalerri aurkitu dira (NORA erregistroan bat-etortze 1)',
  'search.no_results': 'Ez dugu «{query}» aurkitu Bizkaian. Saiatu udalerri batekin.',
  'search.out_of_scope': 'NORAk {n} leku aitortzen ditu, baina Bizkaitik kanpo daude.',
  'nav.lang': 'Hizkuntza / Idioma',
  'search.network_error': 'Ez dago konexiorik kale-izendegi ofizialarekin (NORA).',
  'search.selected': '{municipality} hautatuta. Estatistika udalerrikoa da.',
  'search.listbox': 'Bizkaiko lekuak',
  'ui.loading': 'Kargatzen…',
  'ui.load_error':
    'Ezin izan da orriaren zati hau kargatu. Birkargatzean zure urtea eta lekua mantenduko dira.',
  'ui.retry': 'Birkargatu orria',
  'ui.dismiss': 'Baztertu oharra',
  'url.camera_reset': 'Estekak mapa-posizio baliogabea zekarren; udalerria enkoadratu da.',

  // ── Compartir y estados vacíos ─────────────────────────────────────────
  'share.label': 'Kopiatu esteka',
  'share.done': 'Esteka kopiatuta. Zure urtea eta lekua dauzka; ez du datu pertsonalik.',
  'share.error': 'Ezin izan da esteka kopiatu. Helbide-barratik kopia dezakezu.',
  'empty.catalog': 'Une honetan ez dago daturik eskuragarri leku honentzat.',
  'error.pmtiles':
    'Ezin izan dira eraikinak kargatu. Estatistika eta banaketa eskuragarri daude oraindik.',
  'error.metrics': 'Ezin izan dira udalerriko agregatu kanonikoak kargatu.',
  'error.generic':
    'Zerbait huts egin du. Dagoeneko kargatuta zegoen datu-zatia eskuragarri dago oraindik.',

  // ── Control temporal ───────────────────────────────────────────────────
  'year.slider.label': 'Zure urtea',
  'year.slider.help': 'Erabili teklatuaren geziak urtea aldatzeko.',
  'year.valuetext': '{year} urtea',

  // ── Reproductor temporal (G18) ─────────────────────────────────────────
  'time.axis_label': 'Denbora-ardatza: egungo parkearen sartzea erregistratutako urtearen arabera',
  'time.play_aria': 'Eboluzioa erreproduzitu',
  'time.pause_aria': 'Eboluzioa pausatu',
  'time.step_back': 'Urte bat atzera',
  'time.step_fwd': 'Urte bat aurrera',
  'time.scrub_label': 'Erreproduzitzen ari den urtea',
  'time.explain': 'Zer erakusten du ikuspuntu honek',
  'time.reduced_note':
    'Erreprodukzio automatikoa desgaituta dago mugimendu murriztua nahiago duzulako.',
  'time.status':
    'Erreproduzitzen ari den urtea {play_year}: egungo parkea erakusten da, {play_year} urtera arteko urte erregistratuta dutenekin.',
  'time.caption':
    'Ikuspuntu honek gaur egun dauden eraikinak ordenatzen ditu Katastroan erregistratutako eraikuntza-urtearen arabera. Ez du data horietan zeuden eraikin guztiak berreraikitzen: multzo hori ezezaguna da. Froga fotografiko independentea «Aireko argazkiak» atalean dago.',
  'map.legend.cells.play': '{play_year} urtean jada eraikitako egungo eraikinak',
  'map.legend.cells.play.less': '% 0 · bat ere ez',
  'map.legend.cells.play.more': '% 100 · denak',
  'map.legend.buildings.play': '{play_year} urtera arte erregistratutako eraikinak erakusten dira',

  // ── Modos del visor ────────────────────────────────────────────────────
  'view.label': 'Maparen ikuspegia',
  'view.explore': 'Arakatu {municipality}',
  'view.vista': 'Ikuspegia',
  'view.map': 'Zahartasunaren arabera',
  'view.time': 'Eboluzioa',
  'view.photo': 'Aireko argazkiak',
  'view.hist': '1923–25eko mapa',
  'view.swipe': 'Lehen / orain',
  'view.cta_era': 'Ikusi argazki historikoak',
  'view.cta_era.note': 'Zure jaiotzatik hurbileneko kanpaina: {campaign_year}',
  // G19-R2/R3: pila-pantailan ikustailea oihal osora doa — emaitza
  // narratiborako ateak (map modua)
  'view.back_result': 'Emaitza',
  'view.intro.time.title': 'Oraingo eraikin-parkea nola osatu zen.',
  'view.intro.time.body':
    'Mugitu urtea gaur egun dauden eraikinetatik zein zegoen jada eraikita orduan ikusteko.',
  'view.intro.photo.title': 'Zona honetako aireko argazki eskuragarriak.',
  'view.intro.photo.body': 'Aukeratu kanpaina bat dagokion irudi ofiziala ikusteko.',
  'view.intro.hist.title': 'Bizkaia 1923–25eko kartografian.',
  'view.intro.hist.body':
    'Kartografoek marraztutako mapa da, ez argazkia: orri bakoitzak bere altxatze-urtea du.',
  'view.intro.swipe.title': 'Konparatu irudi historikoa egungoarekin.',
  'view.intro.swipe.body': 'Irristatu oihala zona bera bi garaipetan ikusteko.',
  'layers.label': 'Mapa-geruzak',
  'layers.ortho': 'Aireko ortoargazkia',
  'layers.buildings': 'Egungo eraikinen konturrua',
  'photo.label': 'Mapa-ikuspegi beraren gainean dagoen aireko argazki ofiziala',
  'photo.prev': 'Aurreko kanpaina: {year}',
  'photo.next': 'Hurrengo kanpaina: {year}',
  'photo.prev_none': 'Ez dago aurreko kanpainarik',
  'photo.next_none': 'Ez dago hurrengo kanpainarik',

  'photo.nodata':
    'Kanpainak estaltzen ez dituen guneak atzeko plano neutroarekin erakusten dira, ez irudi gisa.',
  'photo.panel_a': '{year} kanpaina',
  'photo.details': 'Iturria eta xehetasunak',
  'photo.play': 'Erreproduzitu argazkiak',
  'photo.pause': 'Pausatu',
  'photo.scrub_label': 'Aukeratu argazki-kanpaina urteen ardatzean',
  'photo.scrub_valuetext': '{year} kanpaina',
  'photo.rail_note':
    'Markak benetako kanpainak dira, ez urteko seriea: kontrolak hurbileneko kanpainara jotzen du. Kanpaina bakoitzaren urtea nominala da: benetako hegaldia beste data batekoa izan zitekeen (iturriak argitaratzen badu, adierazten da).',
  'photo.ended': 'Kanpainen seriea amaitu da: «Erreproduzitu» lehenengora itzultzen da.',
  'photo.toggle.a11y': 'Aukeratu zein kanpaina ikusten den mapan',
  'photo.rel_before': 'zure jaiotza baino {n} lehen',
  'photo.rel_after': 'zure jaiotza baino {n} gero',
  'photo.rel_exact': 'zure jaiotze-urtea',
  'rel.short.before': 'jaiotza baino {n} lehen',
  'rel.short.after': 'jaiotza baino {n} gero',
  'rel.short.exact': 'zure urtea',

  // ── SWIPE ──────────────────────────────────────────────────────────────
  'swipe.today': 'Gaur egun · {year}',
  'swipe.hint': 'Irristatu konparatzeko',
  'swipe.presets': 'Ezpanelaren posizioak',
  'swipe.only_before': '{year} bakarrik',
  'swipe.only_after': '{year} bakarrik',
  'swipe.slider': 'Konparazio-ezpanela: {before_year} ezkerrean, {after_year} eskuinean',
  'swipe.pick.a11y': 'Aukeratu konparatzen diren bi aire-irudiak',
  'swipe.pick.first': 'Lehen irudia',
  'swipe.pick.second': 'Bigarren irudia',
  'swipe.pick.note':
    'Katalogo ofizialeko bi kanpaina. Bata ez badu irudirik gune honetan, adierazi egiten da; ez da beste data batekin ordezkatzen.',
  'swipe.loading': '{year} ortoargazkia egiaztatzen…',
  'swipe.tiles': '{year} ortoargazkia kargatzen…',
  'swipe.error': 'Ezin izan da egiaztatu {year} ortoargazkia gune honetan.',
  'swipe.gaps': 'Kanpaina honek irudirik gabeko guneak ditu.',
  'swipe.after_error':
    'Ezin izan da egiaztatu {year} kanpaina gune honetan; eskuinean eraikinen mapa erakusten da, ez ortoargazki hori.',
  'swipe.after_missing': 'Mapa · {year} irudirik ez',
  'swipe.only_map': 'Mapa bakarrik',
  'swipe.slider_map': 'Konparazio-ezpanela: {before_year} ezkerrean, eraikinen mapa eskuinean',
  'swipe.src_map':
    'Ezkerrean: {before_pub} · {before_year} kanpaina{before_flight} · Eskuinean: eraikinen mapa ({after_year} kanpaina ezin izan da egiaztatu) · CC BY 4.0',
  'swipe.retry': 'Berriz saiatu',
  'swipe.src':
    'Ezkerrean: {before_pub} · {before_year} kanpaina{before_flight} · Eskuinean: {after_pub} · {after_year} kanpaina{after_flight} · CC BY 4.0',

  // ── Contraste edificios / huella ───────────────────────────────────────
  'contrast.title': 'Eraikinak eta oinplano-azalera',
  'contrast.buildings':
    'urte ezaguna duten egungo 100 eraikinetatik {selected_year} ondoren amaitu zirenak',
  'contrast.footprint':
    'urte ezaguna eta geometria balioduna duten eraikinen oinplano-azalera 100etik {selected_year} ondorengoa da',
  'contrast.note':
    'Eraikin-kopuruak eta hartzen duten lurrak istorio desberdinak kontatzen dituzte.',

  // ── Pie / créditos ─────────────────────────────────────────────────────
  'footer.sources':
    'Iturburu nagusia: Open Data Bizkaia — Bizkaiko Foru Aldundia (Katastroa eta 1956–2002ko ortoargazkiak, CC BY 4.0). Osagarria: geoEuskadi / Eusko Jaurlaritza (2004–2025eko ortoargazkiak eta NORA kale-izendegia, CC BY 4.0).',
  'footer.code': 'Kodea: MIT.',
  'footer.snapshot': 'Datu-sortaren data: {snapshot_date}.',
  'footer.how': 'Nola dakigu',

  // ── Cómo lo sabemos ────────────────────────────────────────────────────
  'how.title': 'Nola dakigu',
  'how.catastro':
    'Katastroa ondasun higiezinen erregistro administratiboa da. Bizkaiko eraikin bakoitzarentzat, beste datu batzuen artean, bere geometria eta, egon ezkero, eraikuntza-urtea dauka.',
  'how.catastro.title': 'Zer da Katastroa',
  'how.measure.title': 'Zer neurtzen du «eraikuntza-urteak»',
  'how.measure':
    'Katastroak eraikinari Ano_Constr eremuan esleitutako urtea da. Ez da proiektuaren edo lizentziaren data. Beranduagoko errehabilitazio batek ez du aldatzen.',
  'how.current.title': 'Zer da «egungo eraikin» bat',
  'how.current':
    'Erabiltzen dugun katastro-geruzan dagoen eraikina da. Datu honen bidez ez dakigu zenbat eraikin desagertu ziren ezta noiz.',
  'how.unknown.title': 'Zergatik falta daiteke urtea',
  'how.unknown':
    'Katastroak ez badauka, 0 edo hutsik agertzen da. Gu ezezagun gisa tratatzen dugu, inoiz ez 1900 ezta «zahar» gisa ere.',
  'how.ortho.title': 'Zer da ortoargazki bat',
  'how.ortho':
    'Gainean neurriak hartzeko zuzendutako aireko argazkia da. Ebidentzia bisual gisa erabiltzen dugu, ez zenbakiak kalkulatzeko.',
  'how.campaign.title': 'Zergatik ez daiteke kanpaina baten urtea hegaldiaren data zehatza izan',
  'how.campaign':
    'Kanpaina urte nominal batez identifikatzen da, eta ez du beti bat egiten hegaldiaren data zehatzarekin. Iturburuak data edo tartea argitaratzen duenean, kanpainaren ondoan erakusten dugu.',
  'how.calc.title': 'Zer kalkulatzen dugu',
  'how.calc':
    'Urte ezaguna duten egungo eraikin-kopurua, zure urtearen ondoren amaitutakoen ehunekoa, datuaren estaldura eta oinplano-azalera.',
  'how.nocalc.title': 'Zer EZ dugu kalkulatzen',
  'how.nocalc':
    'Ez dugu parke historikoa berreraikitzen, ez eraikitako azalera neurtzen eta ez zenbakirik argazkietatik ateratzen.',
  'how.sources.title': 'Iturriak',
  'how.sources':
    'Bizkaiko Katastroa eta ortoargazkiak (Open Data Bizkaia / Bizkaiko Foru Aldundia; geoEuskadi / Eusko Jaurlaritza).',
  'how.snapshot.title': 'Datu-sortaren data',
  'how.back': 'Itzuli',

  // ── MI EDIFICIO (dirección) ────────────────────────────────────────────
  'address.invite': 'Zure kalera arte jaitsi nahi duzu?',
  'address.invite_note':
    'Bilatu helbide bat {municipality} udalerrian. Aurkitzeko NORA kontsultatzen dugu, Eusko Jaurlaritzaren zerbitzua; helbidearen testua ez da partekatutako estekan sartzen.',
  'address.start': 'Bilatu helbide bat',
  'address.label.street': '{municipality} udalerriko kalea',
  'address.placeholder.street': 'Gran Vía Don Diego López de Haro',
  'address.label.number': 'Zenbakia',
  'address.label.bis': 'Bis',
  'address.placeholder.number': '1',
  'address.street.searching': 'Kalea bilatzen…',
  'address.street.none':
    'Ez dugu kale hori aurkitu {municipality} udalerrian. Saiatu izen ofizialarekin, gaztelaniaz edo euskaraz.',
  'address.street.outside':
    'NORAk izen hori duten kaleak aitortzen ditu, baina {municipality} udalerritik kanpo.',
  'address.street.pick': '{n} kale daude izen horrekin {municipality} udalerrian. Hautatu bat:',
  'address.street.near': 'Bat-etortze zehatzik ez kale-izendegian. Hau esan nahi zenuen…?',
  'address.street.near_pick':
    'Bat-etortze zehatzik ez: {municipality} udalerriko kale-izendegi ofizialeko {n} kale hurbil.',
  'address.number.ask': '{street}: idatzi atariaren zenbakia.',
  'address.number.ask_n':
    '{street}: {n} atari zenbakidun kale-izendegi ofizialean. Idatzi zenbakia.',
  'address.street.network_error': 'Ez dago konexiorik kale-izendegi ofizialarekin (NORA).',
  'address.portal.searching': 'Ataria bilatzen…',
  'address.portal.none': '{number} zenbakia ez dago erregistratuta kale horretan.',
  'address.portal.pick': 'Zenbaki hori duten hainbat atari daude. Hautatu zeurea:',
  'address.portal.acepcion': ' ({acepcion})',
  'address.portal.cp': 'PK {cp}',
  'address.building.searching': 'Eraikina egiaztatzen…',
  'address.building.not_found': 'Ezin izan dugu helbide hau katastro-eraikin zehatz bati lotu.',
  'address.building.multiple': 'Atariak {n} katastro-eraikini dagokie. Hautatu zeurea zein den:',
  'address.result.title': 'Zure eraikina',
  'address.result.linked': 'Katastroan identifikatuta {portal_desc} ataritik abiatuta.',
  'address.result.nora_only':
    'NORAk eraikina identifikatzen du atari honetan, baina katastro-poligono bat ere ez du atariaren puntua barne. NORA datua erakusten dugu Katastroari lotu gabe.',
  'address.year.both_equal': 'Katastroak eta NORAk urte bera erregistratzen dute: {year}.',
  'address.year.both_differ':
    'Katastroak {catastro_year} erregistratzen du. NORAk {nora_year} erregistratzen du. Bi iturri ofizial desberdin dira; biak erakusten ditugu bata bestearekin zuzendu gabe.',
  'address.year.catastro_only':
    'Katastroak {catastro_year} erregistratzen du. NORAk ez du urterik erregistratzen eraikin honentzat.',
  'address.year.nora_only':
    'NORAk {nora_year} erregistratzen du. Katastroak ez du eraikuntza-urterik zehazten eraikin honentzat.',
  'address.year.both_unknown':
    'Ez Katastroak ez NORAk ez dute eraikuntza-urterik erregistratzen eraikin honentzat.',
  'address.provenance':
    'Helbidea: NORA (geoEuskadi, Eusko Jaurlaritza) · Eraikina: Bizkaiko Katastroa (Open Data Bizkaia). Lotura atariaren puntu ofizialaren bidez egiten da.',
  'address.reset': 'Bilatu beste helbide bat',
  'address.close': 'Itxi helbide-bilaketa',

  // ── DOS AÑOS (segundo ancla temporal) ──────────────────────────────────
  'compare.invite': 'Gehitu beste urte bat',
  'compare.invite_note': 'Adibidez beste pertsona batekina. Ikuspegi bera, bi urte.',
  'compare.label': 'Beste urtea',
  'compare.apply': 'Alderatu',
  'compare.remove': 'Kendu bigarren urtea',
  'compare.invalid': 'Idatzi 1900 eta {snapshot_year} arteko urtea.',
  'compare.marker': 'BESTE URTEA · {compare_year}',
  'compare.partition.title': 'Egungo parkea bi urteen artean banatuta',
  'compare.partition.before': '{earlier} arte: {n} eraikin (% {pct})',
  'compare.partition.between': '{earlier} eta {later} artean: {n} eraikin (% {pct})',
  'compare.partition.after': '{later} ondoren: {n} eraikin (% {pct})',
  'compare.partition.unknown': 'Urte baliagarririk gabe: {n}',
  'compare.partition.denominator':
    '{municipality} udalerriko urte ezaguna duten egungo eraikinetatik ({known}).',
  'map.legend.compare.before': '{earlier} arte amaitua',
  'map.legend.compare.between': '{earlier} eta {later} artean',
  'map.legend.compare.after': '{later} ondoren',

  // ── PLANEAMIENTO + CONTEXTO AE ─────────────────────────────────────────
  'planning.title': 'Eta zer dago aurreikusita?',
  'planning.intro':
    '{municipality} udalerriko {ref_date} datako hirigintza-antolamenduaren datuek hau jasotzen dute:',
  'planning.item.viv': '{n} etxebizitza gauzatu gabe',
  'planning.item.res_v': '{n} ha lurzoru erresidentzial libre',
  'planning.item.ae_v': '{n} ha jarduera ekonomikoetarako lurzoru libre',
  'planning.meaning.summary': 'Zer esan nahi du',
  'planning.meaning':
    'Indarreko hirigintza-antolamenduak gaitasuna erregistratzen du, ez iragarritako eraikuntza. Lurzoru libreak ez du garapenik esan nahi, eta izendapenak lurzoruaren egungo egoera juridikoa deskribatzen du — alda daiteke. Datu hauek antolamendua deskribatzen dute, ez aurresana.',
  'planning.source':
    'Hirigintza-antolamenduaren datu globalak · Open Data Bizkaia (Bizkaiko Foru Aldundia, CC BY 4.0). {ej} ekitaldia.',
  'planning.unavailable':
    'Ezin izan da hirigintza-antolamenduaren testuingurua kargatu. Fitxaren gainerakoa eskuragarri dago oraindik.',
  'planning.local.clasif': 'Eraikin honek hartzen duen lurzorua {clasif} gisa sailkatuta dago.',
  'planning.local.clasif_partial':
    'Eraikin honek hartzen duen lurzorua gehiengoz (% {pct}) {clasif} gisa sailkatuta dago.',
  'planning.local.uso': 'Lurzoru honentzat erregistratutako erabilera orokorra: {usos}.',
  'planning.local.ambito':
    'Iturburu ofizialak «{name}» ({tipo}) gisa identifikatzen duen eremuaren barne dago.',
  'planning.local.ambito_multi':
    'Puntu honetan gainjartzen diren {n} eremu ofizialen barne dago — denak zerrendatzen ditugu:',
  'planning.local.ae': 'Inbentario ofizialak «{name}» deitzen duen espazioarekin gainjartzen da.',
  'planning.local.map_show': 'Ikusi eremuak mapan',
  'planning.local.map_hide': 'Ezkutatu mapako eremuak',
  'planning.local.outside':
    'Eraikin honen lurzorua ez dago kontsultatutako indarreko hirigintza-antolamenduaren sailkapen-areetan.',
  'planning.local.unavailable':
    'Hirigintza-antolamenduaren tokiko testuingurua ez dago eskuragarri udalerri honentzat.',
  'planning.clasif.urbano': 'lurzoru urbanoa',
  'planning.clasif.urbanizable': 'lurzoru urbanizagarria',
  'planning.clasif.no_urbanizable': 'lurzoru ez-urbanizagarria',
  'planning.clasif.suspendidos': 'onespena etenda duen lurzorua',
  'planning.uso.residencial': 'residenciala',
  'planning.uso.act_economicas': 'jarduera ekonomikoetakoa',
  'planning.uso.sistemas_generales': 'sistema orokorretakoa',
  'planning.uso.no_urbanizable': 'lurzoru ez-urbanizagarriko kategoriak',
  'planning.uso.suspendidos': 'etenda',
  'planning.ambito.resid_urbano': 'lurzoru urbanoko eremu residenciala',
  'planning.ambito.ae_urbano': 'lurzoru urbanoko jarduera ekonomikoko eremua',
  'planning.ambito.pe_resid': 'plan berezi residenciala',
  'planning.ambito.pe_ae': 'jarduera ekonomikoko plan berezia',
  'planning.ambito.resid_urbanizable': 'lurzoru urbanizagarriko eremu residenciala',
  'planning.ambito.ae_urbanizable': 'lurzoru urbanizagarriko jarduera ekonomikoko eremua',

  // ── CONTEXTO ACTUAL CONDICIONAL ────────────────────────────────────────
  'context.title': 'Zure ingurua, datu ofizialen arabera',

  'context.noise.q': 'Zarataren zein banda kartografiatzen du ofizialki puntu honek?',
  'context.noise.mapped':
    'Zarata-mapa estrategikoak puntu hau {period} aldiko {range} dB banda ofizialean kokatzen du.',
  'context.noise.mapped_multi':
    'Zarata-mapa estrategikoak puntu honetan {period} aldiko hainbat banda gainjartu erregistratzen ditu: {ranges} dB.',
  'context.noise.not_mapped':
    'Puntu hau foru-errepideen zarata-mapa estrategikoaren estalduratik kanpo dago. Ez du zaratarik eza esan nahi: iturburuak ez du kartografiatzen.',
  'context.noise.day': 'eguna',
  'context.noise.evening': 'arratsaldea',
  'context.noise.night': 'gaua',
  'context.noise.map_show': 'Ikusi zarata-bandak mapan',
  'context.noise.map_hide': 'Ezkutatu zarata-bandak',
  'context.noise.period_shown': 'Erakutsitako aldia:',
  'context.noise.source':
    'Foru-errepideen zarata-mapa estrategikoa · Open Data Bizkaia (CC BY 4.0). Mapa ofiziala; ez da puntu zehatzeko neurketa.',

  'context.mobility.q': 'Zein garraio publikok konektatzen du inguru hau?',
  'context.mobility.available_one': '400 m baino gutxiagora Bizkaibusen geltoki ofizial 1 dago:',
  'context.mobility.available': '400 m baino gutxiagora Bizkaibusen {n} geltoki ofizial daude:',
  'context.mobility.stop': '{name} · {dist} m · {routes} lineak',
  'context.mobility.stop_noroutes': '{name} · {dist} m',
  'context.mobility.none':
    'Iturburu ofizialak ez du Bizkaibusen geltokirik erregistratzen puntu honetatik 400 m baino gutxiagora.',
  'context.mobility.map_show': 'Ikusi geltokiak mapan',
  'context.mobility.map_hide': 'Ezkutatu geltokiak',
  'context.mobility.source':
    'Bizkaibusen ibilbideen eta geltokien informazio geografikoa · Open Data Bizkaia (CC BY 4.0). Zuzeneko distantzia; ordutegirik edo maiztasunik gabe.',

  'context.monte.q': 'Puntu hau baso publiko baten barne dago?',
  'context.monte.inside':
    'Puntu hau iturburu ofizialak «{name}» deitzen duen baso publikoaren barne dago.',
  'context.monte.inside_multi':
    'Puntu hau gainjartzen diren {n} baso publikoren barne dago — denak zerrendatzen ditugu:',
  'context.monte.item': '«{name}»',
  'context.monte.owner': 'Iturburuan deklaratutako titularra: {owner}.',
  'context.monte.date_deslinde': 'muga-finkatzearen data: {date}',
  'context.monte.date_amojonamiento': 'mugarriak jartzeko data: {date}',
  'context.monte.date_catalogacion': 'katalogatze-data: {date}',
  'context.monte.outside': 'Puntu hau ez dago Bizkaiko baso publiko baten barne.',
  'context.monte.map_show': 'Ikusi basoa mapan',
  'context.monte.map_hide': 'Ezkutatu basoa',
  'context.monte.source':
    'Bizkaiko baso publikoak · Open Data Bizkaia (CC BY 4.0). Baso publikoak ez du esan nahi babestutako natur-gunea denik.',

  // ── Secciones G5 ───────────────────────────────────────────────────────
  'section.reading': 'Zein garaitakoak dira egungo eraikinak?',
  'section.place': 'Jaitsi zure kalera',
  'section.more': 'Irakurtzen jarraitzeko',
  'section.context': 'Zer gehiago dakigu leku honi buruz',

  // ── Contexto del lugar ─────────────────────────────────────────────────
  'place.population':
    '{ref_date} datako erroldak {pop} biztanle erregistratu zituen {municipality} udalerrian.',
  'place.family.censo': 'zentsoa',
  'place.family.padron': 'udalerriko errolda',
  'place.obs.censo': '{year} urteko zentsoa',
  'place.obs.padron': '{year} urteko errolda',
  'place.obs.padron_month': '{month_year} errolda',
  'place.pop.then.exact':
    '{year} urtean, zu jaio zinen urtean, {municipality} udalerriak {pop} biztanle zituen {family} arabera.',
  'place.pop.then.near':
    'Zure jaiotzatik hurbilen dagoen datua {obs} da ({relative}): {pop} biztanle {municipality} udalerrian.',
  'place.housing.then': '{then_year} urteko zentsoan {then} familietarako etxebizitza zeuden.',
  'place.housing.then_now':
    'Etxebizitzak ere alderatu ditzakegu: {then_year} urteko zentsoak {then} familia-etxebizitza zenbatu zituen, eta {now_year} urtekoak, {now}. Zentsoen datak dira, ez nahitaez zure jaiotza-urtea eta gaurkoa.',
  'place.context.src': 'Eustat · udalerriko errolda eta biztanleriaren eta etxebizitzen zentsoak',
  'hotspots.ask': 'Non pilatzen dira {year} ondorengo eraikinak?',
  'hotspots.loading': 'Ondorengo eraikuntza gehien duten guneak bilatzen…',
  'hotspots.title':
    '{year} ondoren eraikitako egungo eraikin gehien dituzten 500 × 500 m-ko guneak:',
  'hotspots.item': '{year} ondoren eraikitako {count} egungo eraikin — ikusi mapan',
  'hotspots.zone': '{n}. gunea',
  'hotspots.center': 'udalerriaren erdialdean',
  'hotspots.ref': 'erdialdetik {km} km-ra, {dir}',
  'hotspots.photo': 'ikusi argazkitan',
  'dir.n': 'iparraldean',
  'dir.ne': 'ipar-ekialdean',
  'dir.e': 'ekialdean',
  'dir.se': 'hego-ekialdean',
  'dir.s': 'hegoaldean',
  'dir.sw': 'hego-mendebaldean',
  'dir.w': 'mendebaldean',
  'dir.nw': 'ipar-mendebaldean',
  'hotspots.note':
    'Gaur egun dagoen parkea bakarrik zenbatzen du: lehen eraitsitakoa ez dago egungo katastroan. Ukitu gune bat mapan ikusteko edo ireki bere argazkiak.',
  'hotspots.empty':
    'Ez dugu aurkitu {year} ondorengo eraikinen kontzentrazio-atalasera iristen den gunerik udalerri honetan.',
  'hotspots.error': 'Orain ezin ditugu gune hauetako datuak kargatu. Saiatu berriro geroago.',
  'place.context.loading': 'Lekuaren testuingurua kargatzen…',
  'place.context.unavailable':
    'Lekuaren testuingurua ez dago eskuragarri une honetan. Piezaren gainerakoa funtzionatzen jarraitzen du.',

  // ── Historias G4 ───────────────────────────────────────────────────────
  'story.section.title': 'Bizkaiko bost leku',
  'story.section.intro':
    'Eraikin-multzo bost non datu berak istorio desberdinak kontatzen dituen. Kapitulu bakoitzak mapa konfiguratzen du ikusteko; zure urtea eta lekua bereizita mantentzen dira.',
  'story.discover': 'Erakutsi aldaketa bat',
  'story.explore': 'Arakatu leku hau →',
  'story.next': 'Beste bat',
  'story.back': 'Itzuli nire Bizkiara',
  'story.k.see': 'Zer ikusten dugu',
  'story.k.data': 'Datua',
  'story.k.know': 'Zer dakigu eta zer ez',
  'story.move.time': 'Ikusi denboran',
  'story.move.map': 'Ikusi mapan',
  'story.air': 'Ikusi airerik',
  'story.chapter': '{n}/5 kapitulua',

  'story.c2803.label': 'Itsasadarraren inguruan · sei udalerri · 1960–1969',
  'story.c2803.title': 'Hirurogeikoetako eredu batek sei udalerri zeharkatzen ditu',
  'story.c2803.see':
    'Ibilbide honek Getxo, Leioa, Portugalete, Santurtzi, Sestao eta Trapagarango 21 gune lotzen ditu. Gune horietako urte ezaguneko egungo eraikinen artean, hirurogeiko hamarkada da ohikoena.',
  'story.c2803.data':
    'Multzo jarraitu honetan 4.520 egungo eraikin daude urte ezagunarekin (% 99,9ko estaldura). 1960 eta 1969 artean 863 amaitu ziren — hemen erregistratutako beste edozein garaik baino gehiago.',
  'story.c2803.know':
    'Badakigu zenbat egungo eraikin dauden garai bakoitzeko erregistratuta. Ez dakigu datu honen bidez zer egin zuen bultzada edo zer zegoen lehen lursail bakoitzean: Katastroak gaur egun dauden eraikinak bakarrik deskribatzen ditu.',

  'story.f4036.label': 'Mungia · 70 eraikineko multzo bat · 1970–1979',
  'story.f4036.title': 'Ondorengo eraikin asko, oinplano oso txikia',
  'story.f4036.see':
    'Multzo honetan, egungo eraikinen gehiengoa 1979 ondorengoa da, baina elkarrekin oinplano-azalera osoaren zati minimo bat dira.',
  'story.f4036.know':
    'Desberdintasunak esaten digu zenbaketak eta oinplanoak oso gauza desberdinak kontatzen dituztela. Ez digu esaten zer zegoen lehen, eraispenik izan zen edo herrigunea nola eboluzionatu zuen historikoki.',

  'story.f4233.label': 'Muskiz · 51 eraikineko multzo bat · 1970–1979',
  'story.f4233.title': 'Egungo 51 eraikin, hamarkada bera',
  'story.f4233.see':
    'Begiratu Muskizko eremu hau. Hirurogeita hamarreko urteetan aurrera egitean, mapak egungo eraikinak erakusten ditu, erregistratutako eraikuntza-urtearen arabera. Data horiek zure bizitzarekin aldera ditzakezu.',
  'story.f4233.data':
    'Catastrok 1970 eta 1979 arteko eraikuntza-urtea erregistratzen du multzo honetako egungo 51 eraikinentzat. Guztiek dute urte ezaguna: % 100eko estaldura.',
  'story.f4233.know':
    'Datua eraikin multzo honi dagokio, ez Muskiz osoari. Ez du adierazten zer zegoen lehen edo zer eraikin desagertu ziren. Argazki historikoek lehenaren eta orainaren arteko aldea aztertzen laguntzen dute.',

  'story.f4738.label': 'Santurtzi · 54 eraikineko multzo bat · 1990–1999',
  'story.f4738.title': 'Eraikin gutxik oinplanoaren ia osoa pilatzen dute',
  'story.f4738.see':
    'Begiratu eraikin hauek lurrean hartzen duten lekua. Eraikin handi batek txiki askok batera baino gehiago har dezake: eraikinak zenbatzeak eta haien oinplanoa neurtzeak galdera desberdinei erantzuten diete.',
  'story.f4738.know':
    'Badakigu oinplano oso handi gutxi batzuek neurri hau menderatzen dutela. Ez dakigu datu honen bidez zein den haien erabilera edo zer zegoen lehen.',

  'story.f149.label': 'Abanto Zierbena · 69 eraikineko multzo bat · 2000–2009',
  'story.f149.title': 'Bosten artean berriena',
  'story.f149.see':
    'Kasu honetan sartutako Abanto Zierbenako 69 egungo eraikinek 2000eko hamarkadan erregistratutako urtea dute.',
  'story.f149.data':
    'Multzo honetako urte ezaguneko 69 eraikinak 2000eko hamarkadan amaitu ziren. Estaldura: % 100.',
  'story.f149.know':
    'Badakigu multzo osoa 2000 ondorengoa dela. Ez dakigu garatzeko lurzoru geratzen den: datuak gaur egun dauden eraikinak bakarrik estaltzen ditu.',

  // ── Restauración de deep links ─────────────────────────────────────────
  'building.restore_failed':
    'Ezin izan dugu estekako eraikina aurkitu leku honetan. Mapa eta zenbakiak eskuragarri daude oraindik.',
  'compare.same_year':
    'Bigarren urteak {selected_year} urtearen desberdina izan behar du: banaketa hutsa izango litzateke.',

  // ── Accesibilidad ──────────────────────────────────────────────────────
  'a11y.skip': 'Salto egin edukira',
  'a11y.map.canvas.main': 'Mapa nagusia: egungo eraikinak denbora-egoeraren arabera',
  'a11y.map.canvas.compare':
    'Konparaketa-mapa: ortoargazkiaren bigarren kanpaina, mapa nagusiarekin sinkronizatuta',

  // ── Dirección de arte ──────────────────────────────────────────────────
  'hero.visual.alt':
    'Bilboko itsasadarreko kurba bi ortoargazki ofizialetan: ezkerrean, 1956ko kanpaina zuri-beltzez, Abandoibarrako ontziolak dituela; eskuinean, 2025eko kanpaina kolorez, itsasadarreko aurrealde berriarekin.',
  'hero.visual.caption':
    'Bilbo · itsasadarreko kurba eta Abandoibarra. 1956 kanpainako ortoargazki ofiziala (Open Data Bizkaia) eta 2025 kanpainakoa (geoEuskadi) · CC BY 4.0.',
  'hero.visual.now': '2025',
  'hero.contest': 'Datu publiko ofizialekin soilik eraikitako pieza bat',

  // Resultado: fila de hechos
  'facts.title': 'Zure zenbakiak begirada batean',
  'facts.after': '{year} ondorengo egungo eraikinak',
  'facts.pop': 'erroldatutako biztanle',
  'facts.photo': 'zure urteari hurbilen dagoen aireko irudi ofiziala',
  'facts.decade': '{municipality} udalerriko egungo eraikin gehien dituen hamarkada',
  'facts.decade_pre1900': '1900 baino lehen',

  // Cierre
  'about.title': 'Proiektu honi buruz',
  'about.body':
    'Zure baino gazteagoak galdera sinple bati erantzuten dio: zenbat aldatu da ikusten duzun Bizkaia zu jaio zinenetik? Erantzuteko datu publiko ofizialak bakarrik erabiltzen ditu — eraikinen katastroa, ortoargazki historikoak, 1923–25eko kartografia eta biztanleriaren eta etxebizitzen serieak —, datarik asmatu edo interpolatu gabe. Datu bat existitzen ez denean, esaten du.',
  'about.contest':
    'Bizkaiko Foru Aldundiaren Datu Kazaritza Erronkaren 2026ko Sarietara aurkeztutako pieza, datu-bistaratze kategorian.',
  'sources.title': 'Erabilitako datuak',
  'sources.intro':
    'Ikusten duzun guztia iturburu publiko ofizialetatik dator. Open Data Bizkaia da iturburu nagusia; besteek osatzen dute.',
  'sources.catastro.org': 'Open Data Bizkaia — Bizkaiko Foru Aldundia',
  'sources.catastro.what':
    'Katastro-parzelarioa: egungo eraikinak eta haien erregistratutako eraikuntza-urtea.',
  'sources.catastro.cov': '112 udalerri · {snapshot_year} datu-sorta',
  'sources.orto.org': 'Ortoargazki historikoak — Open Data Bizkaia',
  'sources.orto.what': 'Denboran bidaiatzeko aireko argazki ofizialen seriea.',
  'sources.orto.cov': '9 kanpaina · 1956–2002',
  'sources.geoeuskadi.org': 'geoEuskadi — Eusko Jaurlaritza',
  'sources.geoeuskadi.what':
    'Seriea osatzen duten ortoargazkiak (1945–46 eta 2004–2025) eta NORA kale-izendegia. Iturburu osagarria.',
  'sources.geoeuskadi.cov': 'Azken urtetako serie urtekaria + garai historikoak',
  'sources.eustat.org': 'Eustat — Euskal Estatistika Erakundea',
  'sources.eustat.what':
    'Udalerriko biztanleria (zentsoa eta errolda) eta zentsoetako etxebizitzak.',
  'sources.eustat.cov': '1900–2025 · 112 udalerri',
  'sources.hist.org': '1923–1925eko kartografia historikoa — Open Data Bizkaia',
  'sources.hist.what': 'Duela mende bat georeferentziatutako orri topografiko eta toponimikoak.',
  'sources.hist.cov': 'Lurralde historiko osoa',
  'sources.planning.org': 'Hirigintza-antolamendua — Open Data Bizkaia',
  'sources.planning.what':
    'Udalerriko indarreko antolamendua: «eta bihar?» karaktere informatiboarekin.',
  'sources.planning.cov': 'Udalerrika · erreferentzia-data ikusgai',
  'sources.link': 'Atari ofiziala',

  'foot.nav.a11y': 'Proiektuaren nabigazioa',
  'foot.nav.project': 'Proiektuari buruz',
  'foot.nav.how': 'Nola kalkulatzen dugun',
  'foot.nav.sources': 'Erabilitako datuak',
  'foot.legal':
    'Irudiek eta datuek bere iturburuaren lizentzia mantentzen dute (CC BY 4.0, adierazpenik ezean).',
  'foot.made': 'Bizkaiko datu irekiekin egina.',

  // Metodología ampliada
  'how.limits.title': 'Mugak',
  'how.limits.stock':
    'Katastroak gaur egun dauden eraikinak deskribatzen ditu: ez du iragana berreraikitzen ezta eraitsitako eraikinik dauka.',
  'how.limits.heaping':
    'Erregistratutako urteen zati bat 0 edo 5 digituaz amaitutako urtetan pilatzen da: datuaren ezaugarria da, ez eraikuntza-gailur segurua.',
  'how.limits.ortho':
    'Eskuragarri dagoen hurbileneko aireko argazkiak agian ez du zure urte zehatzarekin bat egiten; kanpainaren benetako urtea erakusten da beti.',
  'how.limits.families':
    'Zentsoko biztanleria, erroldakoa eta etxebizitzak bereizitako serie ofizialak dira: inoiz ez dira konparaketa berean nahasten.',
  'how.steps.title': 'Nola kalkulatzen dugun',
  'how.steps.1': 'Jaiotze-urte bat eta Bizkaiko leku bat hautatzen duzu.',
  'how.steps.2':
    'Leku horretan gaur egun dauden eta eraikuntza-urtea erregistratuta duten eraikinak hartzen ditugu.',
  'how.steps.3':
    'Urte horiek zurekin konparatzen ditugu: zenbat dira lehenagokoak eta zenbat ondorengoak.',
  'how.steps.4':
    'Ortoargazkiak ebidentzia independente dira: ikusten dira, baina inoiz ez dira datak asmatzeko erabiltzen.',
  'how.steps.5':
    'Biztanleria eta etxebizitzak Eustaten serie ofizialetatik datoz, bakoitza bere metodologiarekin.'
};
