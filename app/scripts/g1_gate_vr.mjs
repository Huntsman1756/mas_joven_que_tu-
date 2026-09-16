/**
 * G1 — VR1/VR2: regresión visual del shell. Dos capturas de los 6 estados
 * canónicos, máscara = canvas del mapa (tiles remotas excluidas), diff de
 * píxeles en el propio navegador (canvas ImageData). Umbral ≤0,1 %.
 * Uso: node scripts/g1_gate_vr.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const OUT = join(ROOT, 'evidence/g1/08-adjudication/vr');
const PORT = 4181;
const BASE = `http://localhost:${PORT}`;
const server = await createStaticServer(resolve('build'), PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-gpu'] }).catch(() => chromium.launch({ args: ['--disable-gpu'] }));

const STATES = [
  { id: 'intro-desktop', vp: { width: 1440, height: 900 }, url: '/', mobile: false },
  { id: 'result-desktop', vp: { width: 1440, height: 900 }, url: '/?year=1987&place=leioa', mobile: false, wait: 'map' },
  { id: 'detail-desktop', vp: { width: 1440, height: 900 }, url: '/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6&building=x', mobile: false, wait: 'map' },
  { id: 'intro-mobile', vp: { width: 390, height: 844 }, url: '/', mobile: true },
  { id: 'result-mobile', vp: { width: 390, height: 844 }, url: '/?year=1987&place=leioa', mobile: true, wait: 'map' },
  { id: 'detail-mobile', vp: { width: 390, height: 844 }, url: '/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6', mobile: true, wait: 'map' },
];

async function shoot(state) {
  const ctx = await browser.newContext({
    viewport: state.vp,
    deviceScaleFactor: state.mobile ? 3 : 1,
    isMobile: state.mobile,
    hasTouch: state.mobile,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await installLocalFixtures(page); // NORA → fixture local (VR4)
  await page.goto(BASE + state.url, { waitUntil: 'load' });
  if (state.wait === 'map') {
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
    await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
  }
  await page.waitForTimeout(600);
  const shot = await page.screenshot();
  const mask = await page.evaluate(() => {
    const c = document.querySelector('.mapband canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await ctx.close();
  return { shot, mask };
}

function diffPng(a, b, mask) {
  return browser.newContext().then(async (ctx) => {
    const page = await ctx.newPage();
    const res = await page.evaluate(async ([b64a, b64b, m]) => {
      const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
      const [ia, ib] = await Promise.all([load(b64a), load(b64b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: true };
      const cv = document.createElement('canvas'); cv.width = ia.width; cv.height = ia.height;
      const g = cv.getContext('2d');
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, cv.width, cv.height).data;
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, cv.width, cv.height).data;
      const dsf = ia.width / (m ? m.w / (m.w || 1) : 1); // mask coords are CSS px; image px = css*dsf of viewport
      let diff = 0, total = 0;
      const mx = m ? Math.round(m.x * (ia.width / innerWidth)) : 0;
      const my = m ? Math.round(m.y * (ia.height / innerHeight)) : 0;
      const mw = m ? Math.round(m.w * (ia.width / innerWidth)) : 0;
      const mh = m ? Math.round(m.h * (ia.height / innerHeight)) : 0;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        if (m && x >= mx && x < mx + mw && y >= my && y < my + mh) continue;
        total++;
        const i = (y * cv.width + x) * 4;
        if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8) diff++;
      }
      return { diff, total, diffPct: (100 * diff) / total };
    }, [a.toString('base64'), b.toString('base64'), mask]);
    await ctx.close();
    return res;
  });
}

const results = {};
for (const s of STATES) {
  const A = await shoot(s);
  const B = await shoot(s);
  const d = await diffPng(A.shot, B.shot, A.mask);
  results[s.id] = { ...d, mask: A.mask };
  await writeFile(join(OUT, `${s.id}-A.png`), A.shot);
  await writeFile(join(OUT, `${s.id}-B.png`), B.shot);
  console.log(s.id, JSON.stringify(d));
}
await browser.close(); server.close();
await writeFile(join(OUT, 'vr-diff.json'), JSON.stringify({ thresholdPct: 0.1, results }, null, 1));
