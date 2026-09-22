import type { BuildingProps, CatalogFile, MetricsFile, OrthoState, Place } from '$lib/domain/types';
import type { AddressResult, CatastroIdentity } from '$lib/domain/address';
import type { Campaign } from '$lib/domain/ortho';
import { campaigns, nearestCampaign } from '$lib/domain/ortho';
import type { HistMapState } from '$lib/domain/histmap';
import type { StoryDef, StoryId } from '$lib/domain/stories';
import { headlineForYear, type Headline } from '$lib/domain/metrics';
import {
  loadMetrics,
  clearMetricsCache,
  loadPlanningMuni,
  loadPlanning,
  loadContext,
  type CellSeriesEntry
} from '$lib/domain/catalog';
import type { MuniPlanning, PlanningLocal } from '$lib/domain/planning';
import type { ContextLocal } from '$lib/domain/context';
import { preloadMapEngine } from '$lib/map/engine';

/**
 * G4 §16 — estado personal congelado mientras una historia está activa.
 * «Volver a mi Bizkaia» restaura exactamente esto. Nunca se serializa:
 * la URL lleva `story=` + la escena serializada del capítulo.
 */
interface PersonalSnapshot {
  year: number | null;
  place: Place | null;
  metrics: MetricsFile | null;
  metricsError: boolean;
  view: { lat: number; lon: number; zoom: number };
  viewFromUrl: boolean;
  mode: 'map' | 'time' | 'photo' | 'hist' | 'swipe';
  playYear: number | null;
  compareYear: number | null;
  selectedBuilding: BuildingProps | null;
  selectedCell: AppState['selectedCell'];
  cellInspectNone: boolean;
  addressResult: AddressResult | null;
  identityPoint: AppState['identityPoint'];
  identityResult: AppState['identityResult'];
  pendingBuildingId: string | null;
  orthoVisible: boolean;
  orthoCampaign: Campaign | null;
  orthoState: OrthoState;
  orthoCompare: Campaign | null;
  orthoAlternatives: Campaign[];
  histMapVisible: boolean;
  histMapState: HistMapState;
  planningLocal: AppState['planningLocal'];
  planningLocalBid: string | null;
  planningHighlight: GeoJSON.FeatureCollection | null;
  contextLocal: ContextLocal | null;
  contextLocalBid: string | null;
  contextOverlay: AppState['contextOverlay'];
}

/**
 * Estado global G1 (ARCHITECTURE §7–8). Tres subestados:
 *   PERSONAL (año, lugar, unidad estadística) · MAP (vista, escala, edificio) · ORTHO.
 * El universo estadístico es siempre el municipio seleccionado.
 */
class AppState {
  // PERSONAL
  year = $state<number | null>(null);
  place = $state<Place | null>(null);
  metrics = $state<MetricsFile | null>(null);
  metricsError = $state(false);

  // MAP
  view = $state<{ lat: number; lon: number; zoom: number }>({
    lat: 43.25,
    lon: -2.93,
    zoom: 9.6
  });
  selectedBuilding = $state<BuildingProps | null>(null);
  /** Celda seleccionada por clic/tap o por la sonda de teclado (detalle persistente).
   *  share/footprint son una foto calculada para `year`; MapView la recalcula
   *  al cambiar de año o al llegar la serie del municipio. */
  selectedCell = $state<{
    mun: number;
    fid: number;
    known: number;
    share: number | null;
    /** numerador exacto (posteriores a `year`) sobre la misma serie que share */
    after: number | null;
    /** numerador acumulado hasta `playYear` (solo si el cabezal está activo) */
    until: number | null;
    dataState?: import('$lib/domain/cells').CellDataState;
    footprint: number | null;
    /** punto de clic/sonda para la acción «acercar a edificios» */
    center: [number, number] | null;
  } | null>(null);
  /** Nivel de escala actual del lienzo (MapView lo sincroniza): lo leen
   *  la intro del mapa y los textos de escala fuera del canvas. */
  mapLevel = $state<'BIZKAIA' | 'CELDA' | 'EDIFICIO'>('BIZKAIA');
  /** Registrado por MapView: acerca el lienzo al punto dado (ficha de zona). */
  mapFlyTo: ((center: [number, number]) => void) | null = null;
  /** true cuando la sonda «Ver datos de esta zona» no encontró celda en el centro */
  cellInspectNone = $state(false);
  hoveredDecade = $state<string | null>(null); // bucket id: 'pre1900'|'1900'..'2020'|'none'
  pmtilesError = $state(false);
  /** true cuando la URL traía lat/lon/z explícitos: el mapa no debe re-encuadrar */
  viewFromUrl = $state(false);
  /** G11.3: aviso de enlace — 'camera' = lat/lon/z inválidos o incompletos
   *  (se conserva municipio/año y se encuadra el municipio). */
  urlNotice = $state<'camera' | null>(null);
  /** códigos de municipio cuyos pmtiles de edificios están cargados */
  loadedBuildingSources = $state<Set<number>>(new Set());
  /** Series por año de celda (fid → ys/ya), indexadas por municipio.
   *  No reactivo: se consulta imperativamente desde MapView; `ensureCellSeries`
   *  deduplica y MapView repinta al resolverse. */
  cellSeries = new Map<number, Map<number, CellSeriesEntry>>();

  // TIME (G2): cabezal de reproducción, separado de `year` (año personal).
  // playYear === null → modo temporal inactivo (vista del stock completo).
  // Invariante T1: nada en la reproducción escribe `year`; el titular, las
  // métricas personalizadas y el denominador quedan anclados a `year`.
  playYear = $state<number | null>(null);
  playing = $state(false);
  playbackPauseSeq = $state(0);

  pausePlayback() {
    this.playing = false;
    this.playbackPauseSeq++;
  }
  /** Contador de eventos discretos del Play (inicio, pausa, scrub, reset, fin).
   *  La URL se sincroniza solo en estos eventos — nunca por frame (G2 §8). */
  playUrlSeq = $state(0);
  /** MAPA·TIEMPO·FOTO·1923-25 (G2-B/G4, ADR-013/015): la misma escena con
   *  cuatro acentos. Regla determinista: `playYear` persiste al cambiar de
   *  vista; entrar en 'time' sin cabezal lo ancla a `year` pausado (en
   *  ViewSwitch); entrar en 'hist' es el opt-in de la capa histórica. */
  mode = $state<'map' | 'time' | 'photo' | 'hist' | 'swipe'>('map');
  /** Contador de cambios de modo explícitos del usuario (selector del
   *  visor, menú móvil, CTA «ver cómo era»). La URL hace pushState solo en
   *  estos eventos discretos (G8) — nunca en restores de URL/popstate. */
  modeNavSeq = $state(0);
  /** Contador de búsquedas confirmadas (año + lugar) ya en RESULT — la
   *  URL hace pushState una vez por commit (Back/Forward recorre
   *  búsquedas completas). Los borradores del editor y los restores de
   *  URL nunca lo tocan. */
  searchNavSeq = $state(0);

  // G4 — historias editoriales (lazy, §13–16). `story` identifica el
  // capítulo activo; `storySnapshot` guarda el estado personal para
  // «Volver a mi Bizkaia». Ninguno carga nada por sí solo.
  story = $state<StoryId | null>(null);
  storySnapshot = $state<PersonalSnapshot | null>(null);
  /** cámara imperativa (historias/restores): MapView la consume por seq */
  cameraTarget = $state<{ lat: number; lon: number; zoom: number } | null>(null);
  cameraSeq = $state(0);
  /** id del deep link `building=` que no pudo localizarse (aviso explícito, GU2) */
  buildingRestoreFailed = $state<string | null>(null);

  // G3-A: segundo ancla temporal (DOS AÑOS). `year` sigue siendo el año
  // personal invariante (T1); `compareYear` solo particiona, nunca sustituye.
  compareYear = $state<number | null>(null);

  // G3-A: resultado del flujo de dirección (MI EDIFICIO). El texto de la
  // dirección vive solo en AddressSearch (sesión); aquí queda el resultado
  // resuelto — nunca se serializa a la URL (privacidad, gate §4).
  addressResult = $state<AddressResult | null>(null);
  /** punto del portal pendiente de identidad Catastro (MapView lo consume) */
  identityPoint = $state<{ lon: number; lat: number; mun: number } | null>(null);
  /** resultado geométrico de identityPoint, publicado por MapView (fail-closed) */
  identityResult = $state<{ identity: CatastroIdentity; candidates: BuildingProps[] } | null>(null);
  /** id catastral pendiente de restauración desde deep link `building=` */
  pendingBuildingId = $state<string | null>(null);

  // G3-B — planeamiento + contexto AE (DATA_SEMANTICS §17, ADR-014).
  /** tabla municipal de planeamiento (P-01..P-06); null = aún no cargada */
  planningMuni = $state<Record<string, MuniPlanning> | null>(null);
  /** error de carga de la tabla municipal — la sección falla cerrada */
  planningMuniError = $state(false);
  /** facets del edificio resuelto; null = sin consulta todavía */
  planningLocal = $state<PlanningLocal | null>(null);
  /** building_id para el que se resolvió planningLocal (invalida al cambiar) */
  planningLocalBid = $state<string | null>(null);
  /** geometría opt-in: solo los ámbitos/AE del edificio resuelto, nunca capa global */
  planningHighlight = $state<GeoJSON.FeatureCollection | null>(null);

  // G3-D — contexto condicional (DATA_SEMANTICS §18): ruido/paradas/montes.
  /** facets del edificio resuelto; null = sin consulta todavía */
  contextLocal = $state<ContextLocal | null>(null);
  /** building_id para el que se resolvió contextLocal (invalida al cambiar) */
  contextLocalBid = $state<string | null>(null);
  /**
   * Overlay contextual opt-in (gate §15: solo UNA activa a la vez, mutuamente
   * excluyente con planningHighlight). mod identifica el módulo para pintarla.
   */
  contextOverlay = $state<{
    mod: 'ruido' | 'paradas' | 'montes';
    fc: GeoJSON.FeatureCollection;
  } | null>(null);

  // ORTHO (opt-in)
  orthoVisible = $state(false);
  orthoCampaign = $state<Campaign | null>(null);
  orthoState = $state<OrthoState>('UNKNOWN');
  orthoCompare = $state<Campaign | null>(null);
  orthoAlternatives = $state<Campaign[]>([]);
  /** con dos campañas en pantalla estrecha: cuál se ve en el lienzo único */
  photoView = $state<'a' | 'b'>('a');
  /** velocidad de la reproducción por campañas — preferencia de usuario;
   *  vive aquí para sobrevivir al remontaje del panel (cruce de
   *  breakpoint, cambio de modo) */
  photoSpeed = $state<'slow' | 'normal' | 'fast'>('normal');

  // contorno de edificios actuales sobre imagen histórica (G5 GV4: opt-in)
  overlayBuildings = $state(false);

  // MAPA HISTÓRICO 1923–25 (opt-in; es un mapa, no una campaña de ortofoto)
  histMapVisible = $state(false);
  histMapState = $state<HistMapState>('UNKNOWN');

  // catálogos
  catalog = $state<CatalogFile | null>(null);
  municipalityCatalog = $state<Place[]>([]);

  // Máquina de fases: estado explícito, no proyección. Si derivara de
  // `metrics !== null`, cualquier recarga (cambio de lugar, reintento)
  // desmontaría RESULT a mitad de la interacción.
  phase = $state<'intro' | 'result'>('intro');

  headline = $derived<Headline | null>(
    this.metrics && this.year !== null ? headlineForYear(this.metrics, this.year) : null
  );

  allCampaigns = $derived<Campaign[]>(this.catalog ? campaigns(this.catalog) : []);

  nearest = $derived<Campaign | null>(
    this.year !== null ? nearestCampaign(this.allCampaigns, this.year) : null
  );

  latest = $derived<Campaign | null>(
    this.allCampaigns.length ? this.allCampaigns[this.allCampaigns.length - 1] : null
  );

  /** secuencia de resolución de lugar: solo la última petición puede escribir `metrics` */
  private placeSeq = 0;
  private metricsInFlight: Promise<void> | null = null;

  selectPlace(p: Place) {
    this.place = p;
    this.selectedBuilding = null;
    this.selectedCell = null;
    this.cellInspectNone = false;
    this.playYear = null;
    this.playing = false;
    this.mode = 'map';
    this.compareYear = null;
    this.addressResult = null;
    this.identityPoint = null;
    this.identityResult = null;
    this.pendingBuildingId = null;
    this.planningLocal = null;
    this.planningLocalBid = null;
    this.planningHighlight = null;
    this.contextLocal = null;
    this.contextLocalBid = null;
    this.contextOverlay = null;
    this.metrics = null;
    this.metricsError = false;
    // La sonda de ortofoto es por (lugar, campaña): no arrastrar la de otro lugar
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.orthoAlternatives = [];
    this.photoView = 'a';
    this.overlayBuildings = false;
    this.histMapVisible = false;
    this.histMapState = 'UNKNOWN';
    // un cambio de lugar explícito sale de la historia: el nuevo lugar se
    // convierte en el estado personal (no hay «volver» al anterior)
    this.story = null;
    this.storySnapshot = null;
    this.buildingRestoreFailed = null;
    this.viewFromUrl = false;
    this.urlNotice = null;
    this.view = { lat: p.lat, lon: p.lon, zoom: 11 };
  }

  /** LOCATION_RESOLVING → RESULT: fija el lugar y carga sus métricas (last-write-wins). */
  resolvePlace(p: Place): Promise<void> {
    const seq = ++this.placeSeq;
    this.selectPlace(p);
    void preloadMapEngine(); // solapa el chunk del mapa con la carga de métricas
    // Las series de celda (tooltip/share) las precarga MapView en 'idle':
    // aquí competirían con el motor y las teselas en la ventana crítica (PERF4/7).
    return this.loadMetricsFor(p, seq);
  }

  /**
   * Commit atómico de una búsqueda confirmada desde el editor de resultado:
   * año + lugar se escriben en el mismo turno → una sola entrada de
   * history (searchNavSeq). Un lugar distinto hace el reset completo de
   * selectPlace (métricas, cámara, selecciones, ortofoto, identidad) —
   * nunca se mezclan restos del municipio anterior con la búsqueda nueva.
   */
  async commitSearch(p: Place, y: number): Promise<void> {
    this.pausePlayback();
    this.searchNavSeq++;
    this.year = y;
    if (this.place?.slug !== p.slug) {
      await this.resolvePlace(p);
      return;
    }
    // mismo lugar, otro año: reiniciar la escena sin tocar el lugar
    this.playYear = null;
    this.mode = 'map';
    this.orthoVisible = false;
    this.orthoCompare = null;
    this.histMapVisible = false;
    this.selectedBuilding = null;
    this.selectedCell = null;
    this.cellInspectNone = false;
    await this.ensureMetrics();
  }

  /** Espera a las métricas del lugar actual; reintenta si la última carga falló. */
  ensureMetrics(): Promise<void> {
    if (this.metrics || !this.place) return Promise.resolve();
    if (this.metricsInFlight) return this.metricsInFlight;
    return this.loadMetricsFor(this.place, ++this.placeSeq);
  }

  private loadMetricsFor(p: Place, seq: number): Promise<void> {
    const req = loadMetrics(`metrics/${p.slug}.json`)
      .then((m) => {
        if (seq === this.placeSeq) {
          this.metrics = m;
          this.metricsError = false;
        }
      })
      .catch(() => {
        if (seq === this.placeSeq) this.metricsError = true;
      })
      .finally(() => {
        if (seq === this.placeSeq) this.metricsInFlight = null;
      });
    this.metricsInFlight = req;
    return req;
  }

  reset() {
    this.year = null;
    this.placeSeq++;
    clearMetricsCache(); // un reset invalida las cargas cacheadas/en vuelo
    this.phase = 'intro';
    this.place = null;
    this.metrics = null;
    this.metricsError = false;
    this.selectedBuilding = null;
    this.selectedCell = null;
    this.cellInspectNone = false;
    this.playYear = null;
    this.playing = false;
    this.mode = 'map';
    this.compareYear = null;
    this.addressResult = null;
    this.identityPoint = null;
    this.identityResult = null;
    this.pendingBuildingId = null;
    this.planningMuni = null;
    this.planningMuniError = false;
    this.planningLocal = null;
    this.planningLocalBid = null;
    this.planningHighlight = null;
    this.contextLocal = null;
    this.contextLocalBid = null;
    this.contextOverlay = null;
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.orthoAlternatives = [];
    this.photoView = 'a';
    this.overlayBuildings = false;
    this.histMapVisible = false;
    this.histMapState = 'UNKNOWN';
    this.story = null;
    this.storySnapshot = null;
    this.buildingRestoreFailed = null;
    this.viewFromUrl = false;
    this.view = { lat: 43.25, lon: -2.93, zoom: 9.6 };
  }

  // --- G3-B ---------------------------------------------------------------

  /** Tabla municipal de planeamiento: una petición, cacheada por catalog. */
  ensurePlanningMuni(): void {
    if (this.planningMuni || this.planningMuniError) return;
    loadPlanningMuni()
      .then((t) => {
        this.planningMuni = t.muni;
        this.planningMuniError = false;
      })
      .catch(() => {
        this.planningMuniError = true;
      });
  }

  /**
   * Facets de planeamiento/AE del edificio resuelto (PIP precalculado).
   * Sin edificio ⇒ NOT_COVERED; fichero ausente ⇒ UNAVAILABLE (falla cerrada).
   */
  ensurePlanningLocal(): void {
    const b = this.selectedBuilding;
    if (!b) {
      this.planningLocal = null;
      this.planningLocalBid = null;
      this.planningHighlight = null;
      return;
    }
    if (this.planningLocalBid !== b.id) this.planningHighlight = null;
    if (this.planningLocal && this.planningLocalBid === b.id) return;
    const mun = b.mun;
    // PERF4-R: el dominio de planeamiento solo se pide con edificio resuelto
    void Promise.all([import('$lib/domain/planning'), loadPlanning(mun)])
      .then(([m, f]) => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.planningLocal = m.resolveFacets(f, b.id);
        this.planningLocalBid = b.id;
      })
      .catch(() => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.planningLocal = { kind: 'unavailable' };
        this.planningLocalBid = b.id;
      });
  }

  // --- G3-D ---------------------------------------------------------------

  /**
   * Facets de contexto del edificio resuelto (ruido/paradas/montes, PIP+k-NN
   * precalculado). Sin edificio ⇒ null (la sección no existe); fichero
   * ausente/error ⇒ null también: los tres módulos fallan cerrados y MI
   * EDIFICIO sigue intacto (gate §13).
   */
  ensureContextLocal(): void {
    const b = this.selectedBuilding;
    if (!b) {
      this.contextLocal = null;
      this.contextLocalBid = null;
      this.contextOverlay = null;
      return;
    }
    if (this.contextLocalBid !== b.id) this.contextOverlay = null;
    if (this.contextLocal && this.contextLocalBid === b.id) return;
    const mun = b.mun;
    // PERF4-R: el dominio de contexto solo se pide con edificio resuelto
    void Promise.all([import('$lib/domain/context'), loadContext(mun)])
      .then(([m, f]) => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.contextLocal = m.resolveContext(f, b.id);
        this.contextLocalBid = b.id;
      })
      .catch(() => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.contextLocal = null;
        this.contextLocalBid = b.id;
      });
  }

  /**
   * Overlay contextual: una sola a la vez y excluyente con el highlight de
   * planeamiento (gate §15). Pasar null la retira.
   */
  setContextOverlay(
    overlay: { mod: 'ruido' | 'paradas' | 'montes'; fc: GeoJSON.FeatureCollection } | null
  ): void {
    this.contextOverlay = overlay;
    if (overlay) this.planningHighlight = null;
  }

  // --- G4: historias -------------------------------------------------------

  /** Congela el estado personal tal cual está ahora (referencias, no clones:
   *  mientras la historia vive, nada escribe en ellos). */
  private capturePersonal(): PersonalSnapshot {
    return {
      year: this.year,
      place: this.place,
      metrics: this.metrics,
      metricsError: this.metricsError,
      view: { ...this.view },
      viewFromUrl: this.viewFromUrl,
      mode: this.mode,
      playYear: this.playYear,
      compareYear: this.compareYear,
      selectedBuilding: this.selectedBuilding,
      selectedCell: this.selectedCell,
      cellInspectNone: this.cellInspectNone,
      addressResult: this.addressResult,
      identityPoint: this.identityPoint,
      identityResult: this.identityResult,
      pendingBuildingId: this.pendingBuildingId,
      orthoVisible: this.orthoVisible,
      orthoCampaign: this.orthoCampaign,
      orthoState: this.orthoState,
      orthoCompare: this.orthoCompare,
      orthoAlternatives: this.orthoAlternatives,
      histMapVisible: this.histMapVisible,
      histMapState: this.histMapState,
      planningLocal: this.planningLocal,
      planningLocalBid: this.planningLocalBid,
      planningHighlight: this.planningHighlight,
      contextLocal: this.contextLocal,
      contextLocalBid: this.contextLocalBid,
      contextOverlay: this.contextOverlay
    };
  }

  /**
   * Entra en un capítulo (Descúbreme, «Otro», deep link `?story=`).
   * `snapshot` solo es falso cuando la URL compartida ya describe la escena
   * de la historia y no hay estado personal previo que preservar.
   * La historia resuelve su municipio ancla (métricas cacheadas) y aplica
   * su escena: año de referencia, cabezal pausado, modo y cámara. La
   * ortofoto solo se activa en historias cuyo modo la declara.
   */
  async enterStory(def: StoryDef, { snapshot = true } = {}): Promise<void> {
    // selectPlace limpia story/storySnapshot: el snapshot se preserva en
    // local y se reasigna tras resolver el municipio ancla.
    const snap = snapshot && !this.storySnapshot ? this.capturePersonal() : this.storySnapshot;
    const p = this.municipalityCatalog.find((m) => m.slug === def.place);
    // applyUrl ya resuelve el municipio ancla cuando place= coincide con él:
    // no resolver dos veces (selectPlace limpiaría de nuevo y re-pediría
    // métricas). Solo se resuelve aquí cuando el lugar actual es otro —
    // típicamente el estado personal preservable del que se viene.
    if (p && this.place?.slug !== p.slug) await this.resolvePlace(p);
    else if (p && !this.metrics && !this.metricsError) await this.ensureMetrics();
    this.story = def.id as StoryId;
    this.storySnapshot = snap;
    this.year = def.year;
    this.mode = def.mode;
    this.playYear = def.playYear;
    this.playing = false;
    this.playUrlSeq++;
    this.buildingRestoreFailed = null;
    this.view = { ...def.camera };
    this.viewFromUrl = true;
    this.cameraTarget = { ...def.camera };
    this.cameraSeq++;
    if (def.mode === 'photo' && def.air) {
      const c1 = this.allCampaigns.find((c) => c.year === def.air!.c1) ?? null;
      const c2 =
        def.air.c2 !== null
          ? (this.allCampaigns.find((c) => c.year === def.air!.c2) ?? null)
          : null;
      if (c1) {
        this.orthoCampaign = c1;
        this.orthoCompare = c2 && c2.year !== c1.year ? c2 : null;
        this.orthoState = 'UNKNOWN';
        this.orthoAlternatives = [];
        this.orthoVisible = true; // el panel FOTO sondea al montar (opt-in ya hecho)
      }
    }
  }

  /**
   * Sale del capítulo. Con snapshot restaura «mi Bizkaia» exacta; sin él
   * (deep link `?story=` directo) el estado serializado de la historia se
   * convierte en el personal — default documentado (G4 §16/GH3).
   * `restore:false` — applyUrl: la URL ya aplicó su propio estado; el
   * snapshot se descarta para no pisarlo.
   */
  closeStory({ restore = true } = {}): void {
    this.story = null;
    const s = this.storySnapshot;
    this.storySnapshot = null;
    if (!s || !restore) return;
    // bloquea el re-encuadre automático al reasignar `place`
    this.viewFromUrl = true;
    this.placeSeq++;
    this.place = s.place;
    this.metrics = s.metrics;
    this.metricsError = s.metricsError;
    this.year = s.year;
    this.mode = s.mode;
    this.playYear = s.playYear;
    this.playing = false;
    this.compareYear = s.compareYear;
    this.selectedBuilding = s.selectedBuilding;
    this.selectedCell = s.selectedCell;
    this.cellInspectNone = s.cellInspectNone;
    this.addressResult = s.addressResult;
    this.identityPoint = s.identityPoint;
    this.identityResult = s.identityResult;
    this.pendingBuildingId = s.pendingBuildingId;
    this.orthoVisible = s.orthoVisible;
    this.orthoCampaign = s.orthoCampaign;
    this.orthoState = s.orthoState;
    this.orthoCompare = s.orthoCompare;
    this.orthoAlternatives = s.orthoAlternatives;
    this.histMapVisible = s.histMapVisible;
    this.histMapState = s.histMapState;
    this.planningLocal = s.planningLocal;
    this.planningLocalBid = s.planningLocalBid;
    this.planningHighlight = s.planningHighlight;
    this.contextLocal = s.contextLocal;
    this.contextLocalBid = s.contextLocalBid;
    this.contextOverlay = s.contextOverlay;
    this.view = { ...s.view };
    this.cameraTarget = { ...s.view };
    this.cameraSeq++;
    this.viewFromUrl = s.viewFromUrl;
  }
}

export const app = new AppState();
