import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const server = await createStaticServer(resolve(process.cwd(), 'build'), 4186);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:4186/?year=1987&place=bilbao', { waitUntil: 'load' });
await p.waitForSelector('.headline-block h1', { timeout: 30000 });
const r = await p.evaluate(async () => {
  const heap0 = performance.memory?.usedJSHeapSize ?? null;
  const time = async (u) => {
    const t0 = performance.now();
    const res = await fetch(u);
    const buf = await res.arrayBuffer();
    return { ms: Math.round(performance.now() - t0), bytes: buf.byteLength };
  };
  const out = {};
  out.muni_first = await time('data/planning-muni.json');
  out.facets_first = await time('data/planning/020.json');
  out.geom_first = await time('data/planning-geom/020.json');
  out.muni_repeat = await time('data/planning-muni.json');
  out.facets_repeat = await time('data/planning/020.json');
  out.geom_repeat = await time('data/planning-geom/020.json');
  const heap1 = performance.memory?.usedJSHeapSize ?? null;
  out.heap_delta_mb =
    heap0 && heap1 ? Math.round(((heap1 - heap0) / 1048576) * 10) / 10 : null;
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
server.close();
