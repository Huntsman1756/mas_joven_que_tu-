import type { BuildingProps, CatalogFile, MetricsFile, OrthoState, Place } from '$lib/domain/types';
import type { Campaign } from '$lib/domain/ortho';
import { campaigns, nearestCampaign } from '$lib/domain/ortho';
import { headlineForYear, type Headline } from '$lib/domain/metrics';
import { loadMetrics, clearMetricsCache, type CellSeriesEntry } from '$lib/domain/catalog';
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
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.orthoAlternatives = [];
    this.viewFromUrl = false;
    this.view = { lat: 43.25, lon: -2.93, zoom: 9.6 };
  }
}

export const app = new AppState();
