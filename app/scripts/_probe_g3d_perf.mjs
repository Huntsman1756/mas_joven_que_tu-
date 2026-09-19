import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createStaticServer } from './static-server.mjs';

const CTX = resolve(process.cwd(), 'static/data/context');
const GEOM = resolve(process.cwd(), 'static/data/context-geom');
const size = (f) => {
  const buf = readFileSync(f);
  return {
    raw: buf.byteLength,
    gzip: gzipSync(buf).byteLength,
    br: brotliCompressSync(buf).byteLength
  };
};
const biggest = (dir) =>
  readdirSync(dir)
    .map((f) => ({ f, s: statSync(`${dir}/${f}`).size }))
    .sort((a, b) => b.s - a.s)[0];

const out = { files: {} };
const bigCtx = biggest(CTX);
const bigGeom = biggest(GEOM);
out.files.facet_020 = size(`${CTX}/020.json`);
out.files.facet_biggest = { name: bigCtx.f, ...size(`${CTX}/${bigCtx.f}`) };
out.files.geom_020_ruido = size(`${GEOM}/020-ruido.json`);
out.files.geom_020_paradas = size(`${GEOM}/020-paradas.json`);
out.files.geom_biggest = { name: bigGeom.f, ...size(`${GEOM}/${bigGeom.f}`) };

const server = await createStaticServer(resolve(process.cwd(), 'build'), 4187);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:4187/?year=1987&place=bilbao', { waitUntil: 'load' });
await p.waitForSelector('.headline-block h1', { timeout: 30000 });
const r = await p.evaluate(async () => {
  const heap0 = performance.memory?.usedJSHeapSize ?? null;
  const time = async (u) => {
    const t0 = performance.now();
    const res = await fetch(u);
    const buf = await res.arrayBuffer();
    return { ms: Math.round(performance.now() - t0), bytes: buf.byteLength };
  };
  const o = {};
  o.facet_first = await time('data/context/020.json');
  o.facet_repeat = await time('data/context/020.json');
  o.geom_ruido_first = await time('data/context-geom/020-ruido.json');
  o.geom_ruido_repeat = await time('data/context-geom/020-ruido.json');
  o.geom_paradas_first = await time('data/context-geom/020-paradas.json');
  const heap1 = performance.memory?.usedJSHeapSize ?? null;
  o.heap_delta_mb = heap0 && heap1 ? Math.round(((heap1 - heap0) / 1048576) * 10) / 10 : null;
  return o;
});
out.browser = r;
console.log(JSON.stringify(out, null, 1));
await b.close();
server.close();
