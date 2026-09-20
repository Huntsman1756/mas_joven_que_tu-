// G5 — capturas de iteración visual (no es evidencia de gate).
// Uso: node scripts/g5_shots.mjs  (requiere build/ previo)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const OUT = join(ROOT, 'evidence/g5/shots');
const PORT = 4193;
const BASE = `http://localhost:${PORT}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=14';

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

const W = [
  [1440, 900, 'd'],
  [390, 844, 'm']
];

for (const [w, h, p] of W) {
  await shot(w, h, `${p}-home`, '');
  await shot(w, h, `${p}-result`, `?${Q}`);
  await shot(w, h, `${p}-full`, `?${Q}`, {
    full: true,
    wait: 2500,
    extra: async (page) => {
      // recorrido de scroll para disparar la carga perezosa below-fold
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
    }
  });
  await shot(w, h, `${p}-photo`, `?${Q}&view=photo&ortho=1970`, { wait: 4000 });
  await shot(w, h, `${p}-hist`, `?${Q}&view=hist`, { wait: 4000 });
  await shot(w, h, `${p}-time`, `?${Q}&view=time`, { wait: 3000 });
}

await browser.close();
server.close();
console.log('done →', OUT);
