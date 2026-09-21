import { chromium } from 'playwright';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';
import { resolve } from 'node:path';
const server = await createStaticServer(resolve('build'), 4537);
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 160)));
p.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(0, 110), r.failure()?.errorText));
await installLocalFixtures(p);
await p.goto('http://localhost:4537/?year=1952&place=getxo', { waitUntil: 'load' });
await p.waitForTimeout(15000);
console.log('BODY len:', await p.evaluate(() => document.body.innerText.length));
console.log('HEAD:', await p.evaluate(() => document.body.innerText.slice(0, 300)));
await p.waitForSelector('.headline-block h1', { timeout: 60000 });
await p.waitForSelector('.langs button', { timeout: 60000 });
await p.click('.langs button:has-text("EU")');
await p.waitForFunction(() => document.documentElement.lang === 'eu');
await p.waitForTimeout(800);
const hits = await p.evaluate(() => {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent;
    for (const pat of ['Más joven', 'medida del territorio', 'Gobierno Vasco', 'Diputación Foral'])
      if (t.includes(pat))
        out.push({
          pat,
          tag: n.parentElement?.tagName,
          cls: String(n.parentElement?.className).slice(0, 40),
          html: String(n.parentElement?.outerHTML).slice(0, 220),
          hidden: n.parentElement?.offsetParent === null,
          txt: t.trim().slice(0, 100)
        });
  }
  return out;
});
console.log(JSON.stringify(hits, null, 1));
await b.close();
server.close();
