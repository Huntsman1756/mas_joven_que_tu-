/* G9 — capturas de la pasada editorial (evidence, no contrato). */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const OUT = join(ROOT, 'evidence/g9');
const BASE = process.env.MJT_BASE ?? 'http://localhost:4173/';
const U = (q) => `${BASE}?${q}`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Resultado Bilbao 1952 — facts row + popline con fecha+fuente
await page.goto(U('year=1952&place=bilbao'), { waitUntil: 'networkidle' });
await page.waitForSelector('.facts', { timeout: 30000 });
await page.screenshot({ path: join(OUT, 'bilbao-result.png') });

// 2. Contexto del lugar (Eustat + planeamiento) — BelowFold es lazy:
// hay que bajar para que monte.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForSelector('.ctx.plan', { timeout: 30000 });
await page.locator('.ctx.plan').scrollIntoViewIfNeeded();
await page.locator('.ctx.plan').screenshot({ path: join(OUT, 'bilbao-context.png') });

// 3. Mungia 1979 — contexto (obs más cercana: censo)
await page.goto(U('year=1979&place=mungia'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForSelector('.ctx.plan', { timeout: 30000 });
await page.locator('.ctx.plan').scrollIntoViewIfNeeded();
await page.locator('.ctx.plan').screenshot({ path: join(OUT, 'mungia-context.png') });
await page.screenshot({ path: join(OUT, 'mungia-result.png') });

// 4. Historia con contraste — EL DATO = cifras + lectura (sin párrafo previo)
await page.goto(U('story=f4036'), { waitUntil: 'networkidle' });
await page.waitForSelector('.chapter .scontrast', { timeout: 30000 });
await page.locator('.chapter').screenshot({ path: join(OUT, 'story-f4036.png') });

// 5. Distribución — lazy dentro de BelowFold
await page.goto(U('year=1979&place=mungia'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForSelector('.dist', { timeout: 30000 });
await page.locator('.dist').scrollIntoViewIfNeeded();
await page.locator('.dist').screenshot({ path: join(OUT, 'mungia-dist.png') });

await browser.close();
console.log('shots →', OUT);
