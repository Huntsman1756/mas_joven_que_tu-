/**
 * G3-A — ejecución del corpus de direcciones congelado
 * (evidence/g3/g3a/address-corpus.json, gate §10/§15).
 *
 * Para cada caso corre la cadena REAL del producto:
 *   searchStreets → selección local → listPortals → matchPortalExact
 *   → portalBuildings → NORA fechaConstr
 *   → identidad Catastro: PIP sobre el MISMO .pmtiles municipal que sirve
 *     la app (build/data/buildings/NNN.pmtiles), mismo ray-cast y misma
 *     regla fail-closed que MapView.resolveIdentityPoint:
 *     0 → NORA_ONLY · 1 → EXACT · >1 → MULTIPLE.
 *
 * El dominio se compila desde src/lib/domain/address.ts (código real, no
 * una réplica) con esbuild a un ESM temporal.
 *
 * Salida: evidence/g3/g3a/corpus-results.json (por caso + matrices).
 * Uso: node scripts/g3a_corpus.mjs
 */
import { buildSync } from 'esbuild';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(APP, '..');
const CORPUS = join(ROOT, 'evidence/g3/g3a/address-corpus.json');
const OUT = join(ROOT, 'evidence/g3/g3a/corpus-results.json');

// dominio real compilado a ESM (misma fuente que la app)
const TMP = join(APP, 'scripts/.tmp-address.mjs');
buildSync({
  entryPoints: [join(APP, 'src/lib/domain/address.ts')],
  bundle: true,
  format: 'esm',
  outfile: TMP,
  logLevel: 'silent'
});
const D = await import(pathToFileURL(TMP).href);
const { searchStreets, listPortals, matchPortalExact, portalBuildings, noraYear, yearAgreement } = D;

// ── Source PMTiles sobre fs (FileSource espera un File de navegador) ──
class FsSource {
  constructor(path) {
    this.path = path;
  }
  getKey() {
    return this.path;
  }
  async getBytes(offset, length) {
    const fd = await open(this.path);
    try {
      const buf = Buffer.alloc(length);
      const { bytesRead } = await fd.read(buf, 0, length, offset);
      return {
        data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead)
      };
    } finally {
      await fd.close();
    }
  }
}

// ── PIP idéntico a MapView.geomContains (ray-cast, Polygon+MultiPolygon) ──
function ringContains(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function geomContains(pt, g) {
  if (g.type === 'Polygon')
    return ringContains(pt, g.coordinates[0]) && !g.coordinates.slice(1).some((r) => ringContains(pt, r));
  if (g.type === 'MultiPolygon')
    return g.coordinates.some(
      (poly) => ringContains(pt, poly[0]) && !poly.slice(1).some((r) => ringContains(pt, r))
    );
  return false;
}

const pmtCache = new Map();
async function catastroIdentity(cod, lon, lat) {
  const file = join(APP, 'build/data/buildings', `${String(cod).padStart(3, '0')}.pmtiles`);
  let p = pmtCache.get(file);
  if (!p) {
    p = new PMTiles(new FsSource(file));
    pmtCache.set(file, p);
  }
  const h = await p.getHeader();
  const z = h.maxZoom;
  const n = 2 ** z;
  const xt = ((lon + 180) / 360) * n;
  const latR = (lat * Math.PI) / 180;
  const yt = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  const tile = await p.getZxy(z, Math.floor(xt), Math.floor(yt));
  if (!tile) return { identity: 'NORA_ONLY', candidates: [] };
  const vt = new VectorTile(new PbfReader(tile.data));
  const layer = vt.layers.buildings;
  if (!layer) return { identity: 'NORA_ONLY', candidates: [] };
  const seen = new Set();
  const cands = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    const props = f.properties;
    if (!props?.id || seen.has(props.id)) continue;
    const gj = f.toGeoJSON(Math.floor(xt), Math.floor(yt), z);
    if (gj?.geometry && geomContains([lon, lat], gj.geometry)) {
      seen.add(props.id);
      cands.push(props);
    }
  }
  return {
    identity: cands.length === 1 ? 'EXACT' : cands.length > 1 ? 'MULTIPLE' : 'NORA_ONLY',
    candidates: cands
  };
}

// ── normalización para elegir la calle que el usuario elegiría ──
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function pickStreet(mine, query) {
  const q = norm(query);
  const exact = mine.filter(
    (c) => norm(c.descripcionCastellano).includes(q) || norm(c.descripcionBilingue).includes(q)
  );
  return { pick: exact[0] ?? null, matches: exact.length };
}

// El corpus está congelado y NO se corrige: su columna `mun_cod` tiene
// erratas manuales. La app resuelve el municipio por su catálogo canónico;
// el runner hace lo mismo (nombre → cod de municipalities.json) y registra
// `corpus_mun_cod` vs `resolved_cod` para trazabilidad.
const munis = JSON.parse(await readFile(join(APP, 'build/data/municipalities.json'), 'utf8'));
const muniList = Array.isArray(munis) ? munis : (munis.municipalities ?? Object.values(munis));
function resolveCod(name) {
  const n = norm(name);
  const hits = muniList.filter(
    (m) => norm(m.name).includes(n) || n.includes(norm(m.name))
  );
  if (hits.length === 1) return { cod: hits[0].cod, canon: hits[0].name };
  // segunda pasada: todas las palabras del nombre contenidas
  const words = n.split(/[\s/-]+/).filter((w) => w.length > 3);
  const hits2 = muniList.filter((m) => words.every((w) => norm(m.name).includes(w)));
  if (hits2.length === 1) return { cod: hits2[0].cod, canon: hits2[0].name };
  return { cod: null, canon: null };
}

const corpus = JSON.parse(await readFile(CORPUS, 'utf8'));
const results = [];
for (const c of corpus.cases) {
  const t0 = performance.now();
  const res = resolveCod(c.municipality);
  const r = {
    id: c.id,
    stratum: c.stratum,
    expect: c.expect,
    corpus_mun_cod: c.mun_cod,
    resolved_cod: res.cod,
    canon_name: res.canon,
    outcome: null,
    street_candidates: null,
    portal_exact: null,
    portal_variants: null,
    nora_buildings: null,
    nora_year: null,
    identity: null,
    catastro_year: null,
    catastro_state: null,
    agreement: null,
    ms: null
  };
  try {
    if (c.mun_cod < 0) {
      // fuera de Bizkaia: la jerarquía NORA no puede probar municipio → OUT_OF_SCOPE
      r.outcome = 'OUT_OF_SCOPE';
    } else if (res.cod === null) {
      r.outcome = 'MUNICIPALITY_NOT_IN_CATALOG';
    } else {
      const place = { cod: res.cod, slug: 'corpus', name: res.canon };
      const s = await searchStreets(c.street, place, AbortSignal.timeout(15000));
      r.street_candidates = s.mine.length;
      const { pick } = s.mine.length === 1 ? { pick: s.mine[0] } : pickStreet(s.mine, c.street);
      if (!pick) {
        r.outcome = s.mine.length === 0 ? 'NO_STREETS' : 'AMBIGUOUS_STREET';
      } else {
        const all = await listPortals(pick.id, AbortSignal.timeout(15000));
        const { exact } = matchPortalExact(all, c.portal, c.bis ?? null);
        r.portal_exact = exact.length;
        r.portal_variants = all.filter(
          (p) => String(p.numero ?? '').startsWith(c.portal) && !exact.includes(p)
        ).length;
        const portal = exact[0] ?? null;
        if (!portal) {
          r.outcome = exact.length === 0 && r.portal_variants > 0 ? 'AMBIGUOUS_PORTAL' : 'NO_PORTALS';
        } else {
          if (exact.length > 1) r.outcome = 'AMBIGUOUS_PORTAL';
          const eds = await portalBuildings(portal.id, AbortSignal.timeout(15000));
          r.nora_buildings = eds.length;
          r.nora_year = noraYear(eds[0]?.fechaConstr);
          if (eds.length === 0) {
            r.outcome = 'NOT_FOUND';
          } else {
            const lon = Number(portal.lonETRS89);
            const lat = Number(portal.latETRS89);
            if (Number.isFinite(lon) && Number.isFinite(lat)) {
              const cat = await catastroIdentity(res.cod, lon, lat);
              r.identity = cat.identity;
              const b = cat.identity === 'EXACT' ? cat.candidates[0] : null;
              r.catastro_year = b?.year ?? null;
              r.catastro_state = b?.state ?? null;
              r.agreement = yearAgreement(b?.year ?? null, b?.state ?? null, r.nora_year);
              r.outcome = 'RESOLVED';
            } else {
              r.identity = 'NORA_ONLY';
              r.outcome = 'RESOLVED_NO_POINT';
            }
          }
        }
      }
    }
  } catch (e) {
    r.outcome = `ERROR:${String(e?.message ?? e).slice(0, 80)}`;
  }
  r.ms = Math.round(performance.now() - t0);
  results.push(r);
  console.log(
    `${c.id} ${c.municipality}/${c.street} ${c.portal}${c.bis ?? ''} → ${r.outcome}` +
      ` | id=${r.identity ?? '-'} nora=${r.nora_year ?? '—'} cat=${r.catastro_year ?? '—'}(${r.catastro_state ?? '-'})` +
      ` ${r.agreement ?? ''} ${r.ms}ms`
  );
}

// matrices de síntesis (gate §15: exact/multiple/NORA-only/no-result + discrepancia)
const ident = { EXACT: 0, MULTIPLE: 0, NORA_ONLY: 0 };
const agree = {};
let resolved = 0;
for (const r of results) {
  if (r.identity) ident[r.identity] = (ident[r.identity] ?? 0) + 1;
  if (r.agreement) agree[r.agreement] = (agree[r.agreement] ?? 0) + 1;
  if (r.outcome === 'RESOLVED' || r.outcome === 'RESOLVED_NO_POINT') resolved++;
}
const lat = results.map((r) => r.ms).sort((a, b) => a - b);
const summary = {
  total: results.length,
  resolved,
  identity_matrix: ident,
  agreement_matrix: agree,
  latency_ms: { p50: lat[Math.floor(lat.length / 2)], p95: lat[Math.floor(lat.length * 0.95)], max: lat.at(-1) },
  utc: new Date().toISOString()
};
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ summary, results }, null, 2));
console.log('\n' + JSON.stringify(summary, null, 2));
console.log(`→ ${OUT}`);
