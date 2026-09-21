import { createStaticServer } from './static-server.mjs';
import { installExternalStubs, installLocalFixtures } from './fixtures.mjs';
import { chromium } from 'playwright';

const server = await createStaticServer('build', 4296);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await installLocalFixtures(p);
await installExternalStubs(p);
await p.goto('http://localhost:4296/?year=1952&place=getxo');
await p.waitForSelector('.headline-block h1', { timeout: 30000 });

const r = {};
r.langs_visible = (await p.locator('.langs').count()) === 1;
r.langs_buttons = await p.locator('.langs button').allTextContents();
await p.locator('.langs button', { hasText: 'EU' }).click();
await p.waitForTimeout(400);
r.html_lang = await p.evaluate(() => document.documentElement.lang);
r.lead_eu = await p.locator('.headline-block h1').innerText();
r.kicker_eu = await p.locator('.headline-block .kicker').innerText();
r.cta_eu = (await p.locator('.cta-era').innerText()).trim();
r.photo_rel = (await p.locator('.photo-rel').innerText()).trim();
r.pct = (await p.locator('.support strong').innerText()).trim();
await p.screenshot({ path: '../evidence/g13/eu-result.png' });
// español residual: ¿hay literales ES en nodos visibles clave?
const es_leak = await p.evaluate(() => {
  const spans = [...document.querySelectorAll('.headline-block *')]
    .map((e) => e.innerText?.trim())
    .filter(Boolean);
  return spans.filter((s) => /edificios actuales|después de que nacieras|cifra exacta/i.test(s));
});
r.es_leak = es_leak;
await p.locator('.langs button', { hasText: 'ES' }).click();
await p.waitForTimeout(300);
r.lead_es = await p.locator('.headline-block h1').innerText();
console.log(JSON.stringify(r, null, 2));
await browser.close();
server.close();
