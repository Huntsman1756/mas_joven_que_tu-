// Reproducción de los 4 problemas UX — viewport móvil 393×722 con stubs
// deterministas. Capturas a evidence/g17/.
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures, installExternalStubs } from './fixtures.mjs';
import { chromium } from 'playwright';

const EV = 'F:/_CONCURSOS/mas_joven_que_tu/evidence/g17/';
const server = await createStaticServer('build', 4298);
const browser = await chromium.launch();

async function shot(p, name) {
  await p.screenshot({ path: `${EV}${name}.png` });
  console.log('SHOT', name);
}

// ── P1: aspecto de error en campos válidos (móvil) ──────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
  const p = await ctx.newPage();
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4298/');
  // foco en el input de año — ¿borde/anillo rojo?
  await p.locator('#year-input').click();
  const focus = await p.evaluate(() => {
    const el = document.getElementById('year-input');
    const cs = getComputedStyle(el);
    return { outline: cs.outlineColor, outlineW: cs.outlineWidth, border: cs.borderColor };
  });
  console.log('P1 year focus:', JSON.stringify(focus));
  await shot(p, 'p1-01-year-focus');
  // municipio válido seleccionado
  await p.locator('#place-input').fill('Getxo');
  await p.waitForSelector('#place-listbox [role="option"]', { timeout: 15000 });
  await p.locator('#place-listbox [role="option"] button').first().click();
  const sel = await p.evaluate(() => {
    const el = document.querySelector('.sel');
    const cs = el ? getComputedStyle(el) : null;
    return { text: el?.textContent, color: cs?.color };
  });
  console.log('P1 sel:', JSON.stringify(sel));
  await shot(p, 'p1-02-place-selected');
  await ctx.close();
}

// ── P4: entrar en Evolución (móvil) ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
  const p = await ctx.newPage();
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4298/?year=1952&place=getxo');
  await p.waitForSelector('.vsel', { timeout: 30000 });
  await p.waitForTimeout(2000);
  await shot(p, 'p4-01-map-mode');
  const m0 = await p.evaluate(() => window.__mjtApp?.mode);
  await p.locator('.vsel').click();
  await p.waitForSelector('.vmenu');
  await p.locator('.vmenu [data-mode="time"]').click();
  await p.waitForTimeout(1500);
  const m1 = await p.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    playYear: window.__mjtApp?.playYear,
    playing: window.__mjtApp?.playing,
    timeband: !!document.querySelector('.timeband'),
    intro: document.querySelector('.mapintro')?.textContent?.trim() ?? null
  }));
  console.log('P4 map->time:', m0, '->', JSON.stringify(m1));
  await shot(p, 'p4-02-time-mode');
  // desde foto
  await p.locator('.vsel').click();
  await p.locator('.vmenu [data-mode="photo"]').click();
  await p.waitForSelector('.photo', { timeout: 30000 });
  await p.waitForTimeout(1200);
  await shot(p, 'p4-03-photo');
  await p.locator('.vsel').click();
  await p.locator('.vmenu [data-mode="time"]').click();
  await p.waitForTimeout(1200);
  const m2 = await p.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    playYear: window.__mjtApp?.playYear,
    timeband: !!document.querySelector('.timeband'),
    intro: document.querySelector('.mapintro')?.textContent?.trim() ?? null
  }));
  console.log('P4 photo->time:', JSON.stringify(m2));
  await shot(p, 'p4-04-time-from-photo');
  await ctx.close();
}

// ── P3: «Ver datos de esta zona» — posición a nivel CELDA ───────────
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
  const p = await ctx.newPage();
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4298/?year=1952&place=getxo&z=14');
  await p.waitForSelector('.maplibregl-canvas', { timeout: 30000 });
  await p.waitForTimeout(2500);
  const b = await p.evaluate(() => {
    const el = document.querySelector('.cell-inspect');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const mw = document.querySelector('.mapwrap').getBoundingClientRect();
    const cover = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      btn: [r.x, r.y, r.width, r.height],
      mapwrap: [mw.x, mw.y, mw.width, mw.height],
      centerX: mw.x + mw.width / 2,
      coveredBy: cover ? cover.className?.toString?.().slice(0, 60) : null
    };
  });
  console.log('P3 cell-inspect:', JSON.stringify(b));
  await shot(p, 'p3-01-cell-level');
  await ctx.close();
}

// ── P2: panel de fotos — controles actuales ─────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 722 } });
  const p = await ctx.newPage();
  await installLocalFixtures(p);
  await installExternalStubs(p);
  await p.goto('http://localhost:4298/?year=1952&place=getxo&view=photo');
  await p.waitForSelector('.photo', { timeout: 30000 });
  await p.waitForTimeout(1500);
  const ctl = await p.evaluate(() =>
    [...document.querySelectorAll('.photo [data-action]')].map((b) => ({
      a: b.dataset.action,
      txt: b.textContent?.trim().slice(0, 30)
    }))
  );
  console.log('P2 controls:', JSON.stringify(ctl));
  await shot(p, 'p2-01-photo-panel');
  // play y observar avance
  const play = p.locator('.photo [data-action="play"]');
  if (await play.count()) {
    await play.click();
    await p.waitForTimeout(500);
    await shot(p, 'p2-02-playing');
    const st = await p.evaluate(() => ({
      y: window.__mjtApp?.orthoCampaign?.year,
      state: window.__mjtApp?.orthoState
    }));
    console.log('P2 after play:', JSON.stringify(st));
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log('DONE');
