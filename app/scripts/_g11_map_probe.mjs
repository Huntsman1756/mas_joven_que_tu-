// Sonda G11: ¿las cuotas de celda están cargadas y aplicadas?
import { chromium } from 'playwright';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const PORT = 4231;
const BASE = `http://localhost:${PORT}`;
const server = await createStaticServer(resolve('build'), PORT);
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await installLocalFixtures(page);

await page.goto(`${BASE}/?year=1988&place=getxo`, { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 30000 });
await page.waitForTimeout(12000);

const info = await page.evaluate(() => {
  const m = window.__mjtMap;
  const app = window.__mjtApp;
  if (!m) return { err: 'no map' };
  const feats = m.queryRenderedFeatures(undefined, { layers: ['cells-fill'] });
  const sample = [];
  const seen = new Set();
  let withState = 0;
  for (const f of feats) {
    const fid = f.properties.fid ?? f.id;
    if (seen.has(fid)) continue;
    seen.add(fid);
    const st = m.getFeatureState({ source: 'cells', sourceLayer: 'cells', id: fid });
    if (st.share !== null && st.share !== undefined) withState++;
    if (sample.length < 4) {
      const mun = Number(f.properties.mun ?? f.properties.cod);
      const entry = app.cellSeries.get(mun)?.get(Number(fid));
      sample.push({
        fid,
        id: f.id,
        mun_prop: f.properties.mun,
        mun_num: mun,
        state: st,
        seriesHit: entry ? entry.ys?.slice(0, 40) : 'MISSING',
        hasMun: app.cellSeries.has(mun)
      });
    }
  }
  return {
    rendered: feats.length,
    unique: seen.size,
    withState,
    seriesMunis: [...app.cellSeries.keys()],
    sample,
    zoom: m.getZoom()
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: join(resolve('..'), 'evidence/g11/shots/map-probe.png') });
await browser.close();
server.close();
