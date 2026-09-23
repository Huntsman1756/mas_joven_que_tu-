/**
 * G1-R — evidencia ortofoto (U2 / I-6 timeout, I-7 deep-link, I-8 imagen blanca,
 * I-13 race guard).
 * Escenarios:
 *   1. deep-link ?ortho=2002 en vivo → orthoState abandona UNKNOWN (acotado)
 *   2. tesela colgada → SERVICE_ERROR ≈8 s (timeout)
 *   3. tesela 200 blanca → SERVICE_ERROR (contenido, no tamaño)
 *   4. tesela 200 con contenido → AVAILABLE
 *   5. tesela 404 → NOT_COVERED (+ alternativas solo verificadas)
 * Uso: node scripts/g1r_ortho.mjs   (requiere `npm run build` previo)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import zlib from 'node:zlib';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/ortho');
const PORT = 4182;
const BASE = `http://localhost:${PORT}`;

/* ── PNG mínimo (RGB 8-bit, filtro 0) para teselas sintéticas ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** PNG de `size`×`size`; pixelFn(x,y) → [r,g,b]. */
function png(size, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // bitdepth 8, RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y);
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
const WHITE_PNG = png(32, () => [255, 255, 255]);
const PHOTO_PNG = png(32, (x, y) => [(x * 7) % 256, (y * 11) % 256, ((x + y) * 5) % 256]);

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
    break;
  } catch {
    /* next */
  }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const TILE_RE = /ORTO_BFA_|WMS_ORTOARGAZKIAK/;
const results = {};

async function orthoUiState(page) {
  return page.evaluate(() => {
    const sec = document.querySelector('.photo .state');
    if (!sec) return { visible: false, text: null, alert: null };
    return {
      visible: true,
      text: sec.textContent?.trim().slice(0, 220) ?? null,
      alert: !!sec.querySelector('[role="alert"]'),
      status: !!sec.querySelector('[role="status"]'),
      buttons: [...sec.querySelectorAll('button')].map((b) => b.textContent?.trim())
    };
  });
}

async function run(name, { tileRoute, url, waitMs = 30000 }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  if (tileRoute) {
    await page.route(TILE_RE, tileRoute);
  }
  const t0 = Date.now();
  await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
  // G19: en modo visor no hay .headline-block — la señal de panel montado
  // es el año del chrome temporal (o el estado de carga/error).
  await page.waitForSelector('.photo .tc-year, .photo .state', { timeout: 30000 });
  // espera a que el estado de la ortofoto sea terminal (o agota waitMs)
  let final = null;
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const s = await orthoUiState(page);
    if (s.visible && !(s.status && !s.alert && !s.text?.includes('no cubre'))) {
      // terminal si hay alert, o status con not_covered, o src disponible
      final = s;
      if (s.alert || s.text?.includes('no cubre') || s.text?.includes('Campaña')) break;
    }
    await page.waitForTimeout(400);
  }
  final ??= await orthoUiState(page);
  const elapsed = Date.now() - t0;
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  results[name] = { elapsed_ms: elapsed, ui: final, pageErrors: errs };
  console.log(`[${name}] ${elapsed}ms →`, JSON.stringify(final).slice(0, 300));
  await ctx.close();
}

// 1. deep-link en vivo: la sonda debe dispararse sola desde URL
await run('deeplink-live', { url: '/?year=1987&place=leioa&ortho=2002', waitMs: 30000 });

// 2. tesela colgada → timeout 8 s → SERVICE_ERROR
await run('timeout', {
  url: '/?year=1987&place=leioa&ortho=2002',
  waitMs: 25000,
  tileRoute: () => {
    /* nunca responde: AbortSignal.timeout debe cerrarlo */
  }
});

// 3. 200 con imagen blanca → SERVICE_ERROR
await run('white-image', {
  url: '/?year=1987&place=leioa&ortho=2002',
  waitMs: 25000,
  tileRoute: (route) => route.fulfill({ status: 200, contentType: 'image/png', body: WHITE_PNG })
});

// 4. 200 con imagen real (multicolor) → AVAILABLE
await run('available-image', {
  url: '/?year=1987&place=leioa&ortho=2002',
  waitMs: 25000,
  tileRoute: (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PHOTO_PNG })
});

// 5. 404 → NOT_COVERED, alternativas solo tras verificar cobertura
await run('not-covered', {
  url: '/?year=1987&place=leioa&ortho=2002',
  waitMs: 40000,
  tileRoute: (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'nf' })
});

await writeFile(join(OUT, 'ortho-evidence.json'), JSON.stringify(results, null, 2));
console.log(
  '\nresumen:',
  JSON.stringify(
    Object.fromEntries(
      Object.entries(results).map(([k, v]) => [
        k,
        { ms: v.elapsed_ms, text: v.ui?.text?.slice(0, 80), alert: v.ui?.alert, errs: v.pageErrors }
      ])
    ),
    null,
    2
  )
);
await browser.close();
server.close();
