/**
 * Verificación de la etapa editorial sobre app/build servido con el
 * prefijo real de Pages (mismo patrón que rt_pages_prefix.mjs).
 * Comprueba: «Ver un ejemplo» → capítulo f4036 → «Volver» (dos ciclos
 * consecutivos — regresión observada: el ancla del ejemplo no debe quedar
 * como selección personal), restauración del estado personal con selección
 * válida, contrato del deep link ?story=, bloque «En síntesis», sección
 * «Comprueba un resultado» + CSV, EU.
 * Uso: node scripts/editorial_verify.mjs  (desde app/, tras npm run build)
 */
import { createServer, request as httpRequest } from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';
import { chromium } from 'playwright';

const BUILD = fileURLToPath(new URL('../build', import.meta.url));
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const PREFIX = '/mas_joven_que_tu-';

// Identidad esperada del candidato evaluado: el SHA de HEAD de ESTE repo
// (o 'unknown' en un tarball sin .git — el sello honesto del build). Un
// build de otro candidato (otro SHA) debe fallar esta comprobación.
let expectedSha = 'unknown';
try {
  expectedSha = execSync('git rev-parse HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
} catch {
  /* sin .git: el sello esperado es 'unknown' */
}

const origin = await createStaticServer(BUILD, 0);
const OPORT = origin.address().port;
const proxy = createServer((req, res) => {
  const p = httpRequest(
    {
      host: '127.0.0.1',
      port: OPORT,
      path: req.url.startsWith(PREFIX) ? req.url.slice(PREFIX.length) || '/' : req.url,
      headers: { ...req.headers, host: `127.0.0.1:${OPORT}` }
    },
    (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    }
  );
  p.on('error', () => res.writeHead(502).end());
  req.pipe(p);
});
await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${proxy.address().port}${PREFIX}`;

const checks = [];
const ok = (name, cond, info = '') => {
  checks.push([name, !!cond]);
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};

// HTML de portada: subtítulo nuevo + entrada de ejemplo
const home = await (await fetch(`${BASE}/`)).text();
ok('home_tagline', home.includes('La edad de los edificios de Bizkaia'));
const stamp = home.match(/name="mjt:build" content="([^"]+)"/)?.[1] ?? null;
ok(
  'home_build_stamp',
  stamp === expectedSha ||
    (expectedSha !== 'unknown' && stamp?.startsWith(`${expectedSha}+dirty(`)),
  `sello=${stamp} esperado=${expectedSha}(+dirty)`
);

// CSV + diccionario servidos bajo el prefijo
const csv = await fetch(`${BASE}/data/editorial-cases.csv`);
ok('csv_200', csv.status === 200);
const csvBody = await csv.text();
ok(
  'csv_rows',
  csvBody.includes('f4036') && csvBody.includes('85.7'),
  `${csvBody.split('\n').length - 1} filas`
);
const dict = await fetch(`${BASE}/data/editorial-cases.md`);
ok('dict_200', dict.status === 200 && (await dict.text()).includes('diccionario'));

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));

const state = () =>
  page.evaluate(() => {
    const a = window.__mjtApp;
    return {
      phase: a.phase,
      place: a.place?.slug ?? null,
      year: a.year,
      story: a.story
    };
  });
const volver = () => page.locator('button', { hasText: 'Volver a mi Bizkaia' }).click();

// 1) portada → «Ver un ejemplo» → capítulo f4036 → Volver — DOS ciclos
//    consecutivos desde portada sin selección (regresión: el ancla del
//    ejemplo no debe quedar como selección personal)
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('.example-link', { timeout: 15000 });
ok('example_btn_visible', true, await page.locator('.example-link').innerText());
for (let ciclo = 1; ciclo <= 2; ciclo++) {
  await page.click('.example-link');
  await page.waitForSelector('.chapter[data-story="f4036"]', { timeout: 20000 });
  ok(`ciclo${ciclo}_abre_f4036`, true, page.url());
  const buildingsReady = await page
    .waitForFunction(
      () => {
        const map = window.__mjtMap;
        const cod = window.__mjtApp?.place?.cod;
        return (
          map?.getLayer(`b-${cod}-fill`) &&
          map.queryRenderedFeatures({ layers: [`b-${cod}-fill`] }).length > 0
        );
      },
      null,
      { timeout: 15000 }
    )
    .then(
      () => true,
      () => false
    );
  ok(`ciclo${ciclo}_edificios_renderizados`, buildingsReady);
  if (ciclo === 2) {
    for (const mode of ['Fotos aéreas', 'Mapa 1923–25', 'Por antigüedad', 'Evolución']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
    }
    const startYear = await page.evaluate(() => window.__mjtApp.playYear);
    await page.getByRole('button', { name: 'Reproducir evolución', exact: true }).click();
    const advanced = await page
      .waitForFunction((year) => window.__mjtApp.playYear > year, startYear, { timeout: 5000 })
      .then(
        () => true,
        () => false
      );
    ok('evolucion_avanza_tras_tabs', advanced);
    await page.getByRole('button', { name: 'Por antigüedad', exact: true }).click();
    const restored = await page
      .waitForFunction(
        () => {
          const map = window.__mjtMap;
          const app = window.__mjtApp;
          const layer = `b-${app.place.cod}-fill`;
          return (
            !app.playing &&
            !app.playActive &&
            map.getLayer(layer) &&
            map.getLayoutProperty(layer, 'visibility') !== 'none' &&
            map.queryRenderedFeatures({ layers: [layer] }).length > 0
          );
        },
        null,
        { timeout: 10000 }
      )
      .then(
        () => true,
        () => false
      );
    ok('antiguedad_recupera_edificios_tras_tabs', restored);
  }
  if (ciclo === 1) {
    const summary = page.locator('.chapter .conclusion summary');
    ok(
      'concl_block',
      (await summary.innerText()).toLowerCase().includes('síntesis')
    );
    await summary.press('Enter');
    ok('concl_expands_keyboard', await page.locator('.chapter .conclusion p').isVisible());
    await summary.press('Enter');
    ok('example_url_story', page.url().includes('story=f4036'), page.url());
  }
  await volver();
  await page.waitForSelector('.hero .example-link', { timeout: 10000 });
  const s = await state();
  ok(
    `ciclo${ciclo}_volver_portada_limpia`,
    s.phase === 'intro' && s.place === null && s.story === null,
    JSON.stringify(s)
  );
}

// 2) selección personal válida → capítulo → Volver: restaura año y lugar
await page.goto(`${BASE}/?year=1952&place=getxo`, { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 25000 });
ok('personal_sin_hallazgo_ajeno', (await page.locator('.finding').count()) === 0);
for (let i = 0; i < 25 && (await page.locator('.stories .item').count()) === 0; i++) {
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(150);
}
await page.locator('.stories .item').first().click();
await page.waitForSelector('.chapter[data-story="f4036"]', { timeout: 20000 });
ok('personal_entra_f4036', (await state()).story === 'f4036');
await volver();
await page.waitForSelector('.headline-block h1', { timeout: 15000 });
ok('personal_vuelve_sin_hallazgo_ajeno', (await page.locator('.finding').count()) === 0);
{
  const s = await state();
  ok(
    'personal_restaurada',
    s.phase === 'result' && s.place === 'getxo' && s.year === 1952 && s.story === null,
    JSON.stringify(s)
  );
}

// 3) deep link ?story=f4036 → Volver: contrato documentado — la escena de
//    la historia se convierte en el estado personal (result, no intro)
await page.goto(`${BASE}/?story=f4036`, { waitUntil: 'load' });
await page.waitForSelector('.chapter[data-story="f4036"]', { timeout: 20000 });
ok('deeplink_f4036', true);
await volver();
await page.waitForSelector('.f-cta', { timeout: 15000 });
{
  const s = await state();
  ok(
    'deeplink_contrato_resultado',
    s.phase === 'result' && s.place === 'mungia' && s.year === 1979 && s.story === null,
    JSON.stringify(s)
  );
}

// 4) como-lo-sabemos: sección + enlaces resueltos bajo el prefijo
await page.goto(`${BASE}/como-lo-sabemos`, { waitUntil: 'load' });
await page.waitForSelector('h1', { timeout: 10000 });
const checkSection = await page.locator('section', { hasText: 'Comprueba un resultado' });
ok('check_section', await checkSection.count());
const csvHref = await checkSection.locator('a').first().getAttribute('href');
ok('csv_href_prefix', csvHref?.startsWith(`${PREFIX}/data/`), csvHref);
ok(
  'check_cta_href',
  (await checkSection.locator('.try').getAttribute('href'))?.includes('story=f4036')
);

// 5) EU: subtítulo traducido + sección presente
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('.example-link', { timeout: 15000 });
await page.evaluate(() => {
  document.querySelectorAll('button, a').forEach((b) => {
    if (b.textContent.trim() === 'EU') b.click();
  });
});
await page.waitForFunction(() => document.body.innerText.includes('alderatuta'), {
  timeout: 10000
});
ok('eu_tagline', true);
ok(
  'eu_example',
  await page.locator('.example-link').isVisible(),
  await page.locator('.example-link').innerText()
);

await browser.close();
proxy.close();
origin.close();

const bad = checks.filter(([, c]) => !c).map(([n]) => n);
console.log(
  bad.length ? `EDITORIAL FAIL: ${bad.join(', ')}` : `EDITORIAL PASS — ${checks.length} checks`
);
process.exit(bad.length ? 1 : 0);
