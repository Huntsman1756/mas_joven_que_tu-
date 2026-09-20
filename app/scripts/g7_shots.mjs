// G7 — capturas before/after del redesign. No es evidencia de gate.
// Uso: node scripts/g7_shots.mjs [before|after]  (requiere build/ previo)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const PHASE = process.argv[2] ?? 'before';
const ROOT = resolve(process.cwd(), '..');
const OUT = join(ROOT, `evidence/g7/${PHASE}`);
const PORT = 4197;
const BASE = `http://localhost:${PORT}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=14';
const QL = 'year=2009&place=abanto-y-ciervana-abanto-zierbena&lat=43.328&lon=-3.065&z=15.5';

const server = await createStaticServer(resolve(process.cwd(), 'build'), PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(w, h, name, url, { wait = 2500, full = false, extra } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log(`[${name}] PAGEERROR: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${name}] CONSOLE: ${m.text()}`);
  });
  await page.goto(`${BASE}/${url}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  if (extra) await extra(page);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
  await page.close();
  console.log(`✓ ${name}`);
}

const scroll = async (page) => {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
};

for (const w of [360, 768, 1440]) {
  await shot(w, 844, `w${w}-home`, '');
  await shot(w, 844, `w${w}-result`, `?${Q}`);
  await shot(w, 844, `w${w}-full`, `?${Q}`, { full: true, extra: scroll });
  await shot(w, 844, `w${w}-photo`, `?${Q}&view=photo&ortho=1983`, { wait: 4000 });
  await shot(w, 844, `w${w}-time`, `?${Q}&view=time`, { wait: 3000 });
  await shot(w, 844, `w${w}-swipe`, `?${Q}&view=swipe`, { wait: 4500 });
}
// municipio de nombre largo (caso real de rotura de titular)
await shot(1440, 844, 'd-result-long', `?${QL}`);
await shot(1440, 900, 'd-how', 'como-lo-sabemos');
await shot(1920, 1000, 'w1920-home', '');
await shot(1920, 1000, 'w1920-result', `?${Q}`);

await browser.close();
server.close();
console.log('done →', OUT);
