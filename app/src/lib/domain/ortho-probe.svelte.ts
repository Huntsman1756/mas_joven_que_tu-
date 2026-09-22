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
  // G16b — contrato único del punto de comprobación: `orthoPoint` es el
  // punto donde rige la afirmación de cobertura. Lo fija una acción
  // («Ver esta zona en fotos»), la URL restaurada (la cámara es el lugar
  // mostrado) o el centro de la cámara al activar. Tras cada sonda se
  // reescribe con el punto comprobado, de modo que cualquier superficie
  // (foto, cortina «antes») pueda re-sondear en el mismo sitio.
  const pt: [number, number] = app.orthoPoint ?? [app.view.lon, app.view.lat];
  app.orthoPoint = pt;
  const [lon, lat] = pt;
  const seq = ++probeSeq;
  probeAbort?.abort();
  probeAbort = new AbortController();
  // G16c: al re-sondear otro punto, la cobertura del NUEVO punto es
  // desconocida hasta que responde — no se arrastra el veredicto ni las
  // alternativas del punto anterior (los avisos antiguos no valen aquí).
  app.orthoState = 'UNKNOWN';
  app.orthoAlternatives = [];
  probeStatus.probing = true;
  try {
    const st = await probeCampaign(c, lon, lat, { signal: probeAbort.signal });
    if (seq !== probeSeq || app.place !== place) return;
    // G16c: el resultado nuevo invalida las alternativas del punto
    // anterior — se limpian al escribir el estado, no al final del
    // barrido, para que la UI nunca ofrezca campañas verificadas en OTRO
    // lugar mientras se calculan las de este.
    app.orthoState = st;
    app.orthoAlternatives = [];
    if (st === 'NOT_COVERED') {
      // alternativas: campañas más cercanas que sí cubran el punto
      const alts: Campaign[] = [];
      const others = app.allCampaigns
        .filter((x) => x.year !== c.year)
        .sort((a, b) => Math.abs(a.year - (app.year ?? 0)) - Math.abs(b.year - (app.year ?? 0)));
      for (const alt of others.slice(0, 4)) {
        const r = await probeCampaign(alt, lon, lat, { signal: probeAbort.signal });
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

/**
 * «Ver esta zona en fotos»: activa una campaña y la sondea EN el punto
 * dado (centro de la celda), no en el centroide municipal — la respuesta
 * de cobertura responde a la zona que mira la persona. Reutiliza el
 * camino único de `activateOrtho`.
 */
export function activateOrthoAt(c: Campaign, point: [number, number]): void {
  app.orthoPoint = point;
  activateOrtho(c);
}

/** Cambia la imagen «después» del swipe (lienzo principal) y la sondea. */
export function setSwipeAfter(c: Campaign): void {
  app.orthoCampaign = c;
  app.orthoState = 'UNKNOWN';
  app.orthoAlternatives = [];
  app.orthoVisible = true;
  void probeOrtho(c);
}
