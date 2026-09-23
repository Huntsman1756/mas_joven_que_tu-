// Contraste Itzuli: muestra representativa de frases ES → EU a través del
// traductor oficial (euskadi.eus/traductor). Registra entrada, salida y el
// borrador EU propio para comparación. Salida: ../evidence/eu/itzuli.json
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
const loadDict = async (f) => {
  const src = await readFile(new URL(`../src/lib/i18n/${f}.ts`, import.meta.url), 'utf8');
  const start = src.indexOf('= {') + 2;
  const end = src.lastIndexOf('};') + 1;
  const body = src.slice(start, end);
  return new Function(`return ${body}`)();
};
const es = await loadDict('es');
const eu = await loadDict('eu');

const OUT = join(resolve('..'), 'evidence/eu');
await mkdir(OUT, { recursive: true });

// Muestra representativa: titular, cobertura, caveat, ortofoto, leyenda,
// errores, dirección, metodología, acciones. Placeholders sustituidos por
// valores reales para que Itzuli traduzca la frase completa.
const SAMPLE = [
  'result.kicker',
  'result.lead.some',
  'result.lead.none',
  'result.caveat',
  'result.coverage',
  'result.population',
  'result.low_coverage',
  'result.calc',
  'map.legend.cells',
  'map.legend.cells.nodata',
  'map.cell.sentence',
  'map.tooltip.cell.no_known',
  'ortho.not_covered',
  'ortho.service_error',
  'histmap.note',
  'address.street.near_pick',
  'address.number.ask_n',
  'address.street.network_error',
  'search.network_error',
  'dist.heaping',
  'building.unknown',
  'building.suspicious',
  'context.monte.outside',
  'context.monte.source',
  'compare.lead',
  'time.age'
].filter((k) => es[k]);

const PARAMS = {
  municipality: 'Getxo',
  selected_year: '1952',
  year: '1956',
  ref_date: '1 de enero de 1953',
  population: '83.000',
  coverage_pct: '92,1',
  n: '3',
  number: '7',
  street: 'Ogoño',
  known: '12.340',
  after: '9.780',
  until: '8.500',
  play_year: '1960',
  total: '15.000',
  unknown: '2.100',
  suspicious: '60',
  share: '62,4',
  area: '1.240',
  area_ha: '1,2',
  alternatives: '1945 o 1965',
  post_share: '79,3',
  approx: 'casi 8 de cada 10',
  raw_value: '19520',
  pct: '79,3',
  heaping_pct: '31,2',
  decade: 'años 1970',
  name: 'Kortatxueta',
  owner: 'Ayuntamiento de Kortezubi',
  date: '12/03/1957'
};

// Valores generados por código en EU (aprox, décadas, fechas largas):
// rellenar el borrador con el PARAMS castellano contaminaría la
// comparación — estas claves usan su equivalente EU real.
const PARAMS_EU = {
  ...PARAMS,
  ref_date: '1953(e)ko urtarrilaren 1',
  approx: 'ia 10etik 8',
  decade: '1970 hamarkada',
  alternatives: '1945 edo 1965',
  owner: 'Kortezubiko Udala',
  date: '1957/03/12'
};

const fill = (s, p = PARAMS) => s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? `<${k}>`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://www.euskadi.eus/traductor/', {
  waitUntil: 'networkidle',
  timeout: 60000
});
// El modelo debe quedar seleccionado de verdad: un selectOption que falla
// en silencio contrastaría contra el modelo equivocado sin saberlo.
await page.selectOption('#model', 'es2eu');
const model = await page.$eval('#model', (el) => el.value);
if (model !== 'es2eu') throw new Error(`modelo esperado es2eu, activo: ${model}`);

const rows = [];
let lastSrc = null;
let lastOut = null;
for (const key of SAMPLE) {
  const src = fill(es[key]);
  if (src === lastSrc) {
    // entrada idéntica a la anterior → la salida no cambiará: reutilizar
    // la traducción anterior y registrarlo, no fingir un timeout
    rows.push({
      key,
      status: 'reused',
      es: src,
      itzuli: lastOut,
      draft_eu: fill(eu[key] ?? '', PARAMS_EU)
    });
    console.log(`${key.padEnd(32)} [reused]`);
    continue;
  }
  // La traducción se lee del cuerpo del POST a /v2/translate, emparejado
  // con ESTA entrada por postData.text === src — nunca del área de salida
  // (una respuesta en vuelo de la frase anterior la dejaría stale).
  await page.fill('#text_input', src);
  const respP = page.waitForResponse(
    (r) => {
      if (!r.url().includes('/v2/translate')) return false;
      try {
        return JSON.parse(r.request().postData() ?? '{}').text === src;
      } catch {
        return false;
      }
    },
    { timeout: 45000 }
  );
  await page.click('button:has-text("Traducir"), button:has-text("Itzuli")').catch(async () => {
    // el botón puede ser input o estar deshabilitado brevemente
    await page.evaluate(() => {
      [...document.querySelectorAll('button,input')]
        .find((b) => /traducir|itzuli/i.test(b.textContent || b.value || '') && !b.disabled)
        ?.click();
    });
  });
  let out;
  let status;
  try {
    const resp = await respP;
    const body = await resp.json().catch(() => null);
    out = typeof body?.translation === 'string' ? body.translation.trim() : '';
    status = out.length > 0 ? 'translated' : 'failed_empty';
  } catch {
    out = '<TIMEOUT>';
    status = 'timeout';
  }
  lastSrc = src;
  lastOut = out;
  rows.push({ key, status, es: src, itzuli: out, draft_eu: fill(eu[key] ?? '', PARAMS_EU) });
  console.log(`${key.padEnd(32)} [${status}] ${out.slice(0, 70)}`);
}

await writeFile(
  join(OUT, 'itzuli.json'),
  JSON.stringify({ utc: new Date().toISOString(), engine: 'Itzuli web es2eu', rows }, null, 2)
);
await browser.close();
const bad = rows.filter((r) => r.status === 'timeout' || r.status === 'failed_empty');
console.log(
  `\n${rows.length - bad.length}/${rows.length} traducidas/reutilizadas → ${OUT}/itzuli.json`
);
// un timeout o una salida vacía deja el contraste incompleto: falla el run
process.exit(bad.length === 0 ? 0 : 1);
