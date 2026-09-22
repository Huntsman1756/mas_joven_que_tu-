// Auditoría propia A–H — diagnóstico, no commit.
import { chromium } from 'playwright';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installExternalStubs } from './fixtures.mjs';

const server = await createStaticServer('build', 4410);
const base = 'http://localhost:4410';
const browser = await chromium.launch();
const errors = [];
const out = [];

async function open(width, path = '', eu = false) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    hasTouch: width < 700,
    isMobile: width < 700
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await installLocalFixtures(page);
  await installExternalStubs(page);
  await page.goto(`${base}/${path}`);
  if (eu) {
    const btn = page.locator('.langs button', { hasText: 'EU' });
    if (await btn.count()) await btn.first().click();
  }
  return page;
}
const check = (name, ok, extra = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  out.push(line);
  console.log(line);
};

try {
  // ── A: estabilidad del campo Municipio ────────────────────────────────
  for (const [width, eu] of [[1440, false], [390, false], [1440, true]]) {
    const p = await open(width, '', eu);
    await p.waitForSelector('#place-input');
    const y = () => p.locator('#place-input').boundingBox().then((b) => b.y);
    const y0 = await y();
    await p.fill('#place-input', 'Bilbao');           // opciones abiertas
    await p.waitForSelector('[role=option]');
    const y1 = await y();
    await p.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
    const y2 = await y();
    await p.fill('#place-input', '');                  // limpiar
    const y3 = await y();
    await p.fill('#place-input', 'Trapagaran');        // nombre largo
    const y4 = await y();
    const gap = await p.evaluate(() => {
      const inp = document.querySelector('#place-input').getBoundingClientRect();
      const cta = document.querySelector('.cta').getBoundingClientRect();
      return cta.top - inp.bottom;
    });
    check(`A field stable ${width}${eu ? '/EU' : ''}`,
      Math.max(...[y1, y2, y3, y4].map((v) => Math.abs(v - y0))) <= 1,
      `y0=${y0} maxΔ=${Math.max(...[y1, y2, y3, y4].map((v) => Math.abs(v - y0)))} ctaGap=${gap.toFixed(0)}px`);
    await p.close();
  }

  // ── B: municipio escrito vs seleccionado ──────────────────────────────
  {
    const p = await open(1440);
    await p.fill('#year-input', '1980');
    await p.fill('#place-input', 'Bilbao');
    await p.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
    await p.locator('.cta').click();
    await p.waitForSelector('.timeband');
    await p.locator('.change').click();
    await p.fill('#place-input', 'Muskiz');            // escrito, no elegido
    const urlBefore = p.url();
    await p.locator('.cf-submit').click();
    await p.waitForTimeout(600);
    const stillBilbao = await p.evaluate(() => window.__mjtApp.place.slug);
    const msg = await p.locator('#place-input').evaluate((el) => el.validationMessage);
    check('B typed-not-chosen blocks submit', stillBilbao === 'bilbao' && p.url() === urlBefore,
      `place=${stillBilbao} msg="${msg}"`);
    // atrás en el texto: elegir Muskiz y reeditar
    await p.locator('[role=option] button').filter({ hasText: 'Muskiz' }).click();
    await p.fill('#place-input', 'Bilbao');            // reeditar tras elegir
    check('B re-edit re-invalidates',
      !(await p.locator('#place-input').evaluate((el) => el.checkValidity())));
    await p.close();
  }

  // ── B2: elegir en el editor sin confirmar no debe mutar el estado ─────
  {
    const p = await open(1440, '?year=2025&place=bilbao');
    await p.waitForSelector('.timeband');
    await p.locator('.change').click();
    await p.fill('#place-input', 'Muskiz');
    await p.locator('[role=option] button').filter({ hasText: 'Muskiz' }).click();
    const during = await p.evaluate(() => ({
      place: window.__mjtApp.place.slug, url: location.search
    }));
    // cerrar sin confirmar
    await p.locator('.change').click(); // reabrir/cierra — buscar toggle real
    const closed = await p.evaluate(() => ({
      place: window.__mjtApp.place.slug, url: location.search
    }));
    check('B2 pick-without-submit leaks place',
      during.place === 'bilbao' && closed.place === 'bilbao',
      `during=${JSON.stringify(during)} closed=${JSON.stringify(closed)}`);
    await p.close();
  }

  // ── C: controles — posición y duplicados en los tres modos ────────────
  for (const [mode, extra] of [['map', ''], ['time', ''], ['photo', '&ortho=1956']]) {
    for (const width of [1440, 390]) {
      const p = await open(width, `?year=1980&place=getxo&view=${mode}${extra}`);
      await p.waitForSelector('.mapband, .photo', { timeout: 20000 });
      const m = await p.evaluate(() => {
        const tb = document.querySelector('.timeband');
        const ph = document.querySelector('.photo');
        const mp = document.querySelector('.mapband');
        const r = (el) => (el ? el.getBoundingClientRect() : null);
        return {
          nTimeline: document.querySelectorAll('.timeband').length,
          ctl: r(tb ?? ph)?.top ?? null,
          map: r(mp)?.top ?? null,
          mapH: r(mp)?.height ?? null,
          vh: innerHeight
        };
      });
      check(`C controls ${mode} ${width}`,
        m.ctl !== null && m.map !== null && m.ctl < m.map && m.nTimeline <= 1,
        JSON.stringify(m));
      await p.close();
    }
  }

  // ── D: recuento/cobertura visibles sin abrir details ──────────────────
  for (const width of [1440, 390]) {
    const p = await open(width, '?year=1980&place=getxo');
    await p.waitForSelector('.lead2', { state: 'visible' });
    const d = await p.evaluate(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const det = document.querySelector('details.about-data');
      return {
        lead: vis('.lead2'), cov: vis('.coverage'), detOpen: det?.open ?? 'none',
        leadTxt: document.querySelector('.lead2')?.textContent?.slice(0, 90),
        covTxt: document.querySelector('.coverage')?.textContent?.slice(0, 90)
      };
    });
    check(`D coverage visible ${width}`, d.lead && d.cov && d.detOpen === false, JSON.stringify(d));
    await p.close();
  }

  // ── E: dirección — portal válido mueve cámara y muestra selección ─────
  {
    const p = await open(1440, '?year=1980&place=getxo&view=map');
    await p.waitForSelector('.lazyview', { timeout: 20000 });
    await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
    await p.waitForSelector('.invite .start', { timeout: 15000 });
    await p.locator('.invite .start').click();
    await p.fill('#addr-street', 'ogono');
    await p.waitForSelector('#addr-num');
    await p.fill('#addr-num', '1');
    await p.waitForFunction(() => window.__mjtApp.identityResult !== null, null, { timeout: 30000 });
    const st = await p.evaluate(() => ({
      ident: window.__mjtApp.identityResult?.identity,
      addr: window.__mjtApp.addressResult?.portal?.numero,
      sel: !!document.querySelector('.selection-panel')
    }));
    check('E portal resolves + selection visible', st.ident !== null, JSON.stringify(st));
    await p.close();
  }

  // ── F: cambiar tras reproducir + atrás/adelante ───────────────────────
  {
    const p = await open(1440, '?year=2025&place=bilbao');
    await p.locator('.timeband .primary').click();
    await p.waitForFunction(() => window.__mjtApp.playYear === 2026 && !window.__mjtApp.playing);
    await p.locator('.change').click();
    await p.fill('#edit-year', '1980');
    await p.fill('#place-input', 'Muskiz');
    await p.locator('[role=option] button').filter({ hasText: 'Muskiz' }).click();
    await p.locator('.cf-submit').click();
    await p.waitForFunction(() => window.__mjtApp.place.slug === 'muskiz');
    const clean = await p.evaluate(() => ({
      mode: window.__mjtApp.mode, play: window.__mjtApp.playYear,
      cmp: window.__mjtApp.orthoCompare, selB: window.__mjtApp.selectedBuilding,
      ortho: window.__mjtApp.orthoVisible, url: location.search
    }));
    check('F clean state after search change',
      clean.mode === 'map' && clean.play === null && clean.cmp === null && clean.selB === null,
      JSON.stringify(clean));
    await p.goBack();
    try {
      await p.waitForFunction(() => window.__mjtApp?.place?.slug === 'bilbao', null, { timeout: 8000 });
      check('F back restores bilbao', true);
    } catch {
      const dbg = await p.evaluate(() => ({
        url: location.href, app: !!window.__mjtApp,
        place: window.__mjtApp?.place?.slug ?? null,
        phase: window.__mjtApp?.phase ?? null
      })).catch((e) => ({ evalErr: String(e) }));
      check('F back restores bilbao', false, JSON.stringify(dbg));
    }
    await p.goForward();
    try {
      await p.waitForFunction(() => window.__mjtApp?.place?.slug === 'muskiz', null, { timeout: 8000 });
      check('F forward restores muskiz', true);
    } catch {
      check('F forward restores muskiz', false, await p.evaluate(() => location.href).catch(() => '?'));
    }
    await p.close();
  }

  // ── G: ancla «Datos utilizados» ───────────────────────────────────────
  {
    const p = await open(1440, '?year=1980&place=getxo&view=time');
    await p.waitForSelector('.timeband');
    await p.waitForSelector('.lazyview', { timeout: 20000 });
    await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
    await p.waitForSelector('.fnav a[href="#sources-h"]', { timeout: 15000 });
    const st0 = await p.evaluate(() => ({
      y: window.__mjtApp.year, m: window.__mjtApp.mode, pl: window.__mjtApp.place.slug
    }));
    await p.locator('.fnav a[href="#sources-h"]').click();
    await p.waitForTimeout(500);
    const g = await p.evaluate(() => ({
      hash: location.hash,
      srcTop: document.getElementById('sources-h')?.getBoundingClientRect().top ?? null,
      vh: innerHeight,
      y: window.__mjtApp.year, m: window.__mjtApp.mode, pl: window.__mjtApp.place.slug
    }));
    check('G anchor reaches target + state kept',
      g.hash === '#sources-h' && g.srcTop !== null && g.srcTop < g.vh &&
      g.y === st0.y && g.m === st0.m && g.pl === st0.pl, JSON.stringify(g));
    await p.goBack();
    await p.waitForTimeout(400);
    const g2 = await p.evaluate(() => ({
      hash: location.hash, pl: window.__mjtApp.place?.slug, m: window.__mjtApp.mode
    }));
    check('G back after anchor keeps search', g2.pl === 'getxo' && g2.m === 'time', JSON.stringify(g2));
    await p.close();
  }

  // ── H: estabilidad foto con textos largos EU ──────────────────────────
  {
    const p = await open(390, '?year=1950&place=getxo&view=photo&ortho=1945', true);
    await p.waitForSelector('.p-year');
    const hs = [];
    for (const yr of [1945, 1956, 1989, 2025]) {
      await p.locator(`.epoch[data-year="${yr}"]`).press('Enter');
      await p.waitForFunction((y) =>
        document.querySelector('.p-year')?.textContent === String(y), yr);
      const h = await p.locator('.photo').evaluate((el) => ({
        h: el.getBoundingClientRect().height,
        clipped: [...el.querySelectorAll('.src, .rel, .state')].some((c) => c.scrollHeight > c.clientHeight + 2)
      }));
      hs.push(h);
    }
    const hh = hs.map((x) => x.h);
    check('H EU mobile stable + no clipping',
      Math.max(...hh) - Math.min(...hh) <= 1 && hs.every((x) => !x.clipped),
      JSON.stringify(hs));
    await p.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
console.log(out.join('\n'));
console.log(errors.length ? `PAGEERRORS: ${errors.join(' | ')}` : 'no pageerrors');
