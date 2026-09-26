/**
 * COPY-AUDIT — sonda de layout a 390 px (y 1440 como control).
 * No es prueba visual: mide overflow horizontal, saltos de línea y anchos
 * de los elementos de copy afectados por la revisión editorial.
 *
 * Uso: $env:CI_STUBS='1'; node scripts/copy_audit_layout.mjs
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const PORT = 4222;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();

const waitResult = (page) =>
  page.waitForFunction(() => window.__mjtApp?.headline != null, null, { timeout: 30000 });

const measure = async (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const st = getComputedStyle(el);
    const lh = parseFloat(st.lineHeight) || 0;
    const pad = parseFloat(st.paddingTop) + parseFloat(st.paddingBottom);
    const lines = lh > 0 ? Math.round((el.clientHeight - pad) / lh) : null;
    return {
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflowX: el.scrollWidth > el.clientWidth + 1,
      lines
    };
  }, sel);

const overflow = (page) =>
  page.evaluate(() => ({
    docScrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1
  }));

async function probe(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  if (process.env.CI_STUBS === '1') await installCiFixtures(page);

  const r = { viewport: `${viewport.width}x${viewport.height}` };

  // Resultado
  await page.goto(U(Q));
  await waitResult(page);
  await page.waitForTimeout(900);
  r.result_overflow = await overflow(page);
  r.photo_rel = await measure(page, '.photo-rel');

  // Leyenda (expandida si está colapsada)
  await page.goto(U(`${Q}&view=map`));
  await waitResult(page);
  await page.evaluate(() => document.getElementById('scene')?.scrollIntoView());
  await page.locator('[data-action="legend-expand"]').click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(1200);
  r.legend_overflow = await overflow(page);
  r.legend_title = await measure(page, '.legend-title');
  r.legend_universe = await measure(page, '.legend-sub');
  r.legend_inspect = await measure(page, '.cell-inspect');

  // Planeamiento (below-fold, IntersectionObserver): scroll progresivo
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += Math.max(300, Math.round(h / 8))) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
  });
  await page.waitForTimeout(2500);
  r.planning = await page.evaluate(() => {
    const plan = document.querySelector('.ctx.plan');
    if (!plan) return { mounted: false };
    const fact = [...plan.querySelectorAll('p.fact')].find((e) =>
      /planeamiento vigente/i.test(e.textContent ?? '')
    );
    const info = (el) => {
      if (!el) return null;
      const st = getComputedStyle(el);
      const lh = parseFloat(st.lineHeight) || 0;
      return {
        text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 170),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflowX: el.scrollWidth > el.clientWidth + 1,
        lines: lh ? Math.round(el.clientHeight / lh) : null
      };
    };
    return {
      mounted: true,
      text: (plan.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 260),
      intro: info(fact)
    };
  });
  r.page_overflow = await overflow(page);
  r.errors = errors;
  await ctx.close();
  return r;
}

const out = [await probe({ width: 390, height: 844 }), await probe({ width: 1440, height: 900 })];
console.log(JSON.stringify(out, null, 2));

await browser.close();
server.close();
process.exit(0);
