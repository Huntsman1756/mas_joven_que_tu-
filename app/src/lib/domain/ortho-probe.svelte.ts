import { app } from '$lib/state/app.svelte';
import { probeCampaign, type Campaign } from './ortho';

/**
 * Orquestación única de la sonda de ortofoto (AVAILABLE / NOT_COVERED /
 * SERVICE_ERROR). Vive a nivel de módulo para que todas las superficies que
 * activan una campaña — marcas del Timeline, PhotoPanel, historias — compartan la
 * regla «última sonda gana»: una respuesta tardía de otra campaña o lugar
 * nunca sobrescribe el estado.
 */
let probeSeq = 0;
let probeAbort: AbortController | null = null;

/** true mientras hay una sonda en vuelo (estado «cargando» en UI). */
export const probeStatus = $state({ probing: false });

export async function probeOrtho(c: Campaign): Promise<void> {
  const place = app.place;
  if (!place) return;
  const seq = ++probeSeq;
  probeAbort?.abort();
  probeAbort = new AbortController();
  probeStatus.probing = true;
  try {
    const st = await probeCampaign(c, place.lon, place.lat, { signal: probeAbort.signal });
    if (seq !== probeSeq || app.place !== place) return;
    app.orthoState = st;
    if (st === 'NOT_COVERED') {
      // alternativas: campañas más cercanas que sí cubran el punto
      const alts: Campaign[] = [];
      const others = app.allCampaigns
        .filter((x) => x.year !== c.year)
        .sort((a, b) => Math.abs(a.year - (app.year ?? 0)) - Math.abs(b.year - (app.year ?? 0)));
      for (const alt of others.slice(0, 4)) {
        const r = await probeCampaign(alt, place.lon, place.lat, { signal: probeAbort.signal });
        if (seq !== probeSeq || app.place !== place) return;
        if (r === 'AVAILABLE') alts.push(alt);
        if (alts.length >= 2) break;
      }
      app.orthoAlternatives = alts;
    }
  } catch {
    // AbortError de una sonda reemplazada: la nueva manda
  } finally {
    if (seq === probeSeq) probeStatus.probing = false;
  }
}

/**
 * Activación explícita de una campaña (clic de marca, prev/next, alternativa):
 * fija la campaña pedida — nunca sustituye otra en silencio — y la sondea.
 */
export function activateOrtho(c: Campaign): void {
  app.orthoCampaign = c;
  app.orthoState = 'UNKNOWN';
  app.orthoAlternatives = [];
  app.orthoCompare = null;
  app.orthoVisible = true;
  // Contrato de escena unificada (G4): activar una ortofoto ES entrar en
  // FOTO — un solo camino a la evidencia. La capa histórica, excluyente,
  // se retira al entrar en este modo.
  app.mode = 'photo';
  app.histMapVisible = false;
  void probeOrtho(c);
}
