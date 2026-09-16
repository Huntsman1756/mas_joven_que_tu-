import type {
  BuildingProps,
  CatalogFile,
  MetricsFile,
  OrthoState,
  Place,
} from '$lib/domain/types';
import type { Campaign } from '$lib/domain/ortho';
import { campaigns, nearestCampaign } from '$lib/domain/ortho';
import { headlineForYear, type Headline } from '$lib/domain/metrics';

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
    zoom: 9.6,
  });
  selectedBuilding = $state<BuildingProps | null>(null);
  hoveredDecade = $state<string | null>(null); // bucket id: 'pre1900'|'1900'..'2020'|'none'
  pmtilesError = $state(false);
  /** true cuando la URL traía lat/lon/z explícitos: el mapa no debe re-encuadrar */
  viewFromUrl = $state(false);
  /** códigos de municipio cuyos pmtiles de edificios están cargados */
  loadedBuildingSources = $state<Set<number>>(new Set());

  // ORTHO (opt-in)
  orthoVisible = $state(false);
  orthoCampaign = $state<Campaign | null>(null);
  orthoState = $state<OrthoState>('UNKNOWN');
  orthoCompare = $state<Campaign | null>(null);
  orthoAlternatives = $state<Campaign[]>([]);

  // catálogos
  catalog = $state<CatalogFile | null>(null);
  municipalityCatalog = $state<Place[]>([]);

  phase = $derived<'intro' | 'result'>(
    this.year !== null && this.place !== null && this.metrics !== null ? 'result' : 'intro'
  );

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

  selectPlace(p: Place) {
    this.place = p;
    this.selectedBuilding = null;
    this.metrics = null;
    this.metricsError = false;
    this.viewFromUrl = false;
    this.view = { lat: p.lat, lon: p.lon, zoom: 11 };
  }

  reset() {
    this.year = null;
    this.place = null;
    this.metrics = null;
    this.metricsError = false;
    this.selectedBuilding = null;
    this.orthoVisible = false;
    this.orthoCampaign = null;
    this.orthoState = 'UNKNOWN';
    this.orthoCompare = null;
    this.viewFromUrl = false;
    this.view = { lat: 43.25, lon: -2.93, zoom: 9.6 };
  }
}

export const app = new AppState();
