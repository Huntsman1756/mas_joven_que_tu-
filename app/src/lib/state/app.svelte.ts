import type { BuildingProps, CatalogFile, MetricsFile, OrthoState, Place } from '$lib/domain/types';
import type { AddressResult, CatastroIdentity } from '$lib/domain/address';
import type { Campaign } from '$lib/domain/ortho';
import { campaigns, nearestCampaign } from '$lib/domain/ortho';
import { headlineForYear, type Headline } from '$lib/domain/metrics';
import {
  loadMetrics,
  clearMetricsCache,
  loadPlanningMuni,
  loadPlanning,
  type CellSeriesEntry
} from '$lib/domain/catalog';
import { resolveFacets, type MuniPlanning, type PlanningLocal } from '$lib/domain/planning';
import { preloadMapEngine } from '$lib/map/engine';

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
    footprint: number | null;
  } | null>(null);
  /** true cuando la sonda «Ver datos de esta zona» no encontró celda en el centro */
  cellInspectNone = $state(false);
  hoveredDecade = $state<string | null>(null); // bucket id: 'pre1900'|'1900'..'2020'|'none'
  pmtilesError = $state(false);
  /** true cuando la URL traía lat/lon/z explícitos: el mapa no debe re-encuadrar */
  viewFromUrl = $state(false);
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
  /** Contador de eventos discretos del Play (inicio, pausa, scrub, reset, fin).
   *  La URL se sincroniza solo en estos eventos — nunca por frame (G2 §8). */
  playUrlSeq = $state(0);
  /** MAPA·TIEMPO·FOTO (G2-B, ADR-013): la misma escena con tres acentos.
   *  Regla determinista: `playYear` persiste al cambiar de vista; entrar en
   *  'time' sin cabezal lo ancla a `year` pausado (en ViewSwitch). */
  mode = $state<'map' | 'time' | 'photo'>('map');

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

  // ORTHO (opt-in)
  orthoVisible = $state(false);
  orthoCampaign = $state<Campaign | null>(null);
  orthoState = $state<OrthoState>('UNKNOWN');
  orthoCompare = $state<Campaign | null>(null);
  orthoAlternatives = $state<Campaign[]>([]);

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
    this.metrics = null;
    this.metricsError = false;
    // La sonda de ortofoto es por (lugar, campaña): no arrastrar la de otro lugar
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.orthoAlternatives = [];
    this.viewFromUrl = false;
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
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.orthoAlternatives = [];
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
    loadPlanning(mun)
      .then((f) => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.planningLocal = resolveFacets(f, b.id);
        this.planningLocalBid = b.id;
      })
      .catch(() => {
        if (this.selectedBuilding?.id !== b.id) return;
        this.planningLocal = { kind: 'unavailable' };
        this.planningLocalBid = b.id;
      });
  }
}

export const app = new AppState();
