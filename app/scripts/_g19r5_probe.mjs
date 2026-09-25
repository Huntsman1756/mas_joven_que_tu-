// Re-probe de los checks fallidos de g19r5_android — selectores corregidos.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
const DEV = 'emulator-5554';
const out = [];
const ok = (n, c, x = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${x ? ' — ' + x : ''}`);

const browser = await chromium.connectOverCDP('http://localhost:9222');
let p =
  browser
    .contexts()[0]
    .pages()
    .find((x) => x.url().includes('mas_joven')) ?? browser.contexts()[0].pages()[0];
p.setDefaultTimeout(90000);

// 1. golden path con ids reales
await p.goto(BASE, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#year-input', { timeout: 60000 });
const yearIn = p.locator('#year-input');
const placeIn = p.locator('#place-input');
await yearIn.fill('1922');
await placeIn.fill('bilb');
await p
  .waitForFunction(() => document.querySelector('#place-listbox [role="option"]') != null, null, {
    timeout: 20000
  })
  .catch(() => {});
const opt = p.locator('#place-listbox [role="option"]').first();
if (await opt.count()) await opt.click();
const sub = p.locator('form [type="submit"]').first();
await sub.click().catch(() => {});
const landed = await p
  .waitForFunction(() => !!window.__mjtApp?.headline, null, { timeout: 60000 })
  .then(() => true)
  .catch(() => false);
ok('golden_flow', landed, `headline=${await p.evaluate(() => window.__mjtApp?.place?.slug)}`);

// 2. capas b-*-fill en time
await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.headline-block h1', { timeout: 60000 });
await p.waitForTimeout(3000);
const vsel = p.locator('.vsel');
if (await vsel.isVisible().catch(() => false)) {
  await vsel.click();
  await p.waitForSelector('.vmenu', { timeout: 8000 });
  await p.locator('.vmenu .vopt[data-mode="time"]').click();
}
await p.waitForFunction(() => window.__mjtApp?.mode === 'time', null, { timeout: 15000 });
await p.waitForTimeout(2500);
const layers = await p.evaluate(() =>
  (window.__mjtMap?.getStyle?.()?.layers ?? []).map((l) => l.id)
);
out.push(`LAYERS ${JSON.stringify(layers)}`);
const paint = await p.evaluate(() => {
  const m = window.__mjtMap;
  const l = (m.getStyle()?.layers ?? []).find((x) => /^b-\d+-fill$/.test(x.id));
  return l ? JSON.stringify(m.getPaintProperty(l.id, 'fill-color')) : 'NO-LAYER';
});
ok(
  'time_single_class_fill',
  paint === JSON.stringify(['case', ['!=', ['get', 'state'], 'VALID'], '#d8dde2', '#52768e']),
  paint.slice(0, 160)
);

// 3. photo plano (sin &ortho=): ¿monta campaña automática?
if (await vsel.isVisible().catch(() => false)) {
  await vsel.click().catch(() => {});
  await p.waitForSelector('.vmenu', { timeout: 8000 }).catch(() => {});
  await p
    .locator('.vmenu .vopt[data-mode="photo"]')
    .click()
    .catch(() => {});
}
await p.waitForFunction(() => window.__mjtApp?.mode === 'photo', null, { timeout: 15000 });
const photoState = await p
  .waitForFunction(
    () => ['CONTENT', 'EMPTY', 'ERROR'].includes(window.__mjtApp?.orthoRender),
    null,
    { timeout: 60000 }
  )
  .then(() => 'settled')
  .catch(() => 'timeout');
const pst = await p.evaluate(() => ({
  render: window.__mjtApp?.orthoRender,
  probe: window.__mjtApp?.orthoState,
  campaign: window.__mjtApp?.orthoCampaign?.year,
  nearest: window.__mjtApp?.nearest?.year,
  orthoLayer: !!window.__mjtMap?.getLayer?.('ortho'),
  rstate: !!document.querySelector('.rstate')
}));
ok('photo_auto_render', photoState === 'settled', `${photoState} ${JSON.stringify(pst)}`);

// 4. deeplink photo+ortho=1965
await p.goto(`${BASE}?year=1922&place=bilbao&lat=43.2625&lon=-2.928&z=14.3&view=photo&ortho=1965`, {
  waitUntil: 'domcontentloaded'
});
const dl = await p
  .waitForFunction(() => !!window.__mjtApp?.headline, null, { timeout: 90000 })
  .then(() => true)
  .catch(() => false);
await p
  .waitForFunction(
    () => ['CONTENT', 'EMPTY', 'ERROR'].includes(window.__mjtApp?.orthoRender),
    null,
    { timeout: 60000 }
  )
  .catch(() => {});
const b = await p.evaluate(() => ({
  m: window.__mjtApp?.mode,
  c: window.__mjtApp?.orthoCampaign?.year,
  r: window.__mjtApp?.orthoRender
}));
ok(
  'deeplink_photo',
  dl && b.m === 'photo' && b.c === 1965 && b.r === 'CONTENT',
  `landed=${dl} ${JSON.stringify(b)}`
);

// 5. deeplink time+play=1945
await p.goto(`${BASE}?year=1922&place=bilbao&lat=43.2625&lon=-2.928&z=14.3&view=time&play=1945`, {
  waitUntil: 'domcontentloaded'
});
const dl2 = await p
  .waitForFunction(() => !!window.__mjtApp?.headline, null, { timeout: 90000 })
  .then(() => true)
  .catch(() => false);
const a = await p.evaluate(() => ({ m: window.__mjtApp?.mode, y: window.__mjtApp?.playYear }));
ok('deeplink_time', dl2 && a.m === 'time' && a.y === 1945, `landed=${dl2} ${JSON.stringify(a)}`);

// 6. cell-inspect overlap — ¿qué elemento es y qué lo tapa?
const ovl = await p.evaluate(() => {
  const el = [...document.querySelectorAll('.cell-inspect')].find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 4 && r.bottom > 0 && r.top < innerHeight;
  });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cx = (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2;
  const cy = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
  const top = document.elementFromPoint(cx, cy);
  return {
    rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0],
    coveredBy: top ? `${top.tagName}.${String(top.className).slice(0, 50)}` : null,
    txt: el.textContent?.slice(0, 60)
  };
});
out.push(`INFO cell_inspect_overlap ${JSON.stringify(ovl)}`);

// 7. clipboard write real
await p.evaluate(() => scrollTo(0, 0));
const copyBtn = p.locator('.copylink, button:has-text("Copiar enlace")').first();
if (await copyBtn.isVisible().catch(() => false)) {
  await copyBtn.click().catch(() => {});
  await p.waitForTimeout(1500);
  const clip = await Promise.race([
    p.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR:' + e.message)),
    new Promise((r) => setTimeout(() => r('TIMEOUT'), 8000))
  ]);
  ok(
    'clipboard_write',
    typeof clip === 'string' && clip.includes('mas_joven'),
    String(clip).slice(0, 100)
  );
} else {
  ok('clipboard_write', false, 'botón no visible');
}

console.log(out.join('\n'));
await browser.close().catch(() => {});
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
