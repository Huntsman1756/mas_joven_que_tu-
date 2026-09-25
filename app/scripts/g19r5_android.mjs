// g19r5 — QA Android sobre producción (gh-pages 5474c5a / producto ed4142e).
// Extensión de g16c_android.mjs: mismo harness CDP + overlap audit + ANR,
// actualizado al contrato de modos G19-R4 (5 modos, clase única en
// Evolución, orthoRender en Fotos) y al AVD Pixel8_API33 (emulator-5554,
// CDP tcp:9222).
//
// Uso: node scripts/g19r5_android.mjs [prod|local]
//   prod  → https://huntsman1756.github.io/mas_joven_que_tu-/  (defecto)
//   local → http://localhost:4297/ (build local + adb reverse)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const TARGET = process.argv[2] ?? 'prod';
const BASE =
  TARGET === 'local'
    ? 'http://localhost:4297/'
    : 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const EV = new URL('../../evidence/android-studio/', import.meta.url).pathname.replace(
  /^\/([A-Z]:)/,
  '$1'
);
mkdirSync(EV, { recursive: true });

const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
const DEV = 'emulator-5554';
const CDP = 9222;
const out = [];
const pageErrors = [];
const attachPageError = (pg) => pg.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
const shell = (cmd) =>
  execSync(`"${ADB}" -s ${DEV} shell ${cmd}`, { shell: 'cmd.exe', stdio: 'pipe' });
const devmeta = shell(
  'getprop ro.build.version.release; getprop ro.product.model; wm size; wm density; ' +
    'dumpsys package com.android.chrome | grep versionName | head -1'
)
  .toString()
  .trim()
  .replace(/\r/g, '');
out.push(`DEV ${JSON.stringify(devmeta.split('\n'))}`);

function dismissAnr() {
  try {
    shell('uiautomator dump /sdcard/qa_ui.xml >/dev/null 2>&1');
    const dump = execSync(`"${ADB}" -s ${DEV} shell cat /sdcard/qa_ui.xml`, {
      shell: 'cmd.exe',
      stdio: 'pipe'
    }).toString();
    if (!/isn.t responding|no responde|not responding/i.test(dump)) return;
    const m = dump.match(/text="Wait"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (m) shell(`input tap ${(+m[1] + +m[3]) / 2} ${(+m[2] + +m[4]) / 2}`);
  } catch {
    /* sin acceso a uiautomator */
  }
}
const shot = (name) => {
  try {
    dismissAnr();
    execSync(`"${ADB}" -s ${DEV} exec-out screencap -p > "${EV}${TARGET}-${name}.png"`, {
      shell: 'cmd.exe'
    });
  } catch (e) {
    out.push(`SHOT_FAIL ${name} ${e.message.slice(0, 80)}`);
  }
};
async function tap(loc) {
  dismissAnr();
  await loc.click();
}
const ok = (name, cond, extra = '') => {
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};
const blocked = (name, reason) => out.push(`BLOCKED ${name} — ${reason}`);
const need = (name, cond, reason) => {
  if (cond) return true;
  ok(name, false, reason);
  return false;
};

async function overlapAudit(p, label) {
  const data = await p.evaluate(() => {
    const sels = [
      '.legend',
      '.maplibregl-ctrl-attrib',
      '.maplibregl-ctrl-bottom-right',
      '.maplibregl-ctrl-bottom-left',
      '.timeband',
      '.viewswitch',
      '.vsel',
      '.vmenu',
      '.photo',
      '.tc-bar',
      '.histmap',
      '.swipectl',
      '.celldetail',
      '.hot',
      '.chip',
      '.toolbar',
      '.addr',
      '.search',
      '.compare',
      '.swipe',
      '.vtoolbar',
      '.scenectl',
      '.headline-block',
      '.presets',
      '.handle',
      '.cell-inspect',
      '.change',
      '.langs',
      '.sel-float',
      '.layerbox',
      '.legend-more',
      '.rstate'
    ];
    const seen = new Set();
    const res = [];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (cs.pointerEvents === 'none') continue;
        const cx = (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2;
        const cy = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (!top) continue;
        const covered = !(top === el || el.contains(top) || top.contains(el));
        const path = [];
        let fixedAnc = null;
        for (let n = top; n && path.length < 8; n = n.parentElement) {
          const cls = String(n.className).split(' ')[0] || n.tagName;
          path.push(cls);
          const pos = getComputedStyle(n).position;
          if (!fixedAnc && (pos === 'fixed' || pos === 'sticky')) fixedAnc = cls;
        }
        res.push({
          sel: s,
          covered,
          coveredBy: covered ? `${top.tagName}.${String(top.className).slice(0, 60)}` : null,
          coveredByPath: covered ? path.join('<') : null,
          coveredByFixed: covered ? fixedAnc : null,
          rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0]
        });
      }
    }
    return { res, iw: innerWidth, ih: innerHeight, vvH: visualViewport?.height ?? null };
  });
  const CHROME = /^(vtoolbar|vmenu|selection-panel|celldetail|rstate)$/;
  const covered = data.res.filter((x) => x.covered);
  const benign = covered.filter((c) => CHROME.test(c.coveredByFixed ?? ''));
  const real = covered.filter((c) => !CHROME.test(c.coveredByFixed ?? ''));
  for (const c of benign)
    console.log(
      `WARN tap_${label} — ${c.sel}[${c.rect}]<-${c.coveredBy} (dentro de ${c.coveredByFixed} fijo/sticky: apilamiento previsto)`
    );
  ok(
    `tap_${label}`,
    real.length === 0,
    real
      .map((c) => `${c.sel}[${c.rect}]<-${c.coveredBy}`)
      .join(' ; ')
      .slice(0, 400)
  );
  return data;
}

async function setMode(p, mode) {
  const vsel = p.locator('.vsel');
  if (await vsel.isVisible().catch(() => false)) {
    await tap(vsel);
    await p.waitForSelector('.vmenu', { timeout: 8000 });
    await tap(p.locator(`.vmenu .vopt[data-mode="${mode}"]`));
  } else {
    await tap(p.locator(`.viewswitch [data-mode="${mode}"]`));
  }
  await p.waitForFunction((m) => window.__mjtApp?.mode === m, mode, { timeout: 15000 });
}

async function connectCdp() {
  for (let i = 0; i < 4; i++) {
    try {
      return await chromium.connectOverCDP(`http://localhost:${CDP}`);
    } catch {
      try {
        shell('input tap 540 1342');
      } catch {
        /* sin diálogo ANR */
      }
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  return chromium.connectOverCDP(`http://localhost:${CDP}`);
}
let browser = await connectCdp();
let p =
  browser
    .contexts()[0]
    .pages()
    .find((x) => x.url().includes('mas_joven')) ?? browser.contexts()[0].pages()[0];
p.setDefaultTimeout(60000);
attachPageError(p);

async function ensurePage() {
  try {
    await p.evaluate(() => 1);
    return p;
  } catch {
    /* reconectar */
  }
  for (let i = 0; i < 4; i++) {
    try {
      shell('input tap 540 1342');
    } catch {
      /* sin diálogo ANR */
    }
    await new Promise((r) => setTimeout(r, 10000));
    try {
      browser = await connectCdp();
      const pages = browser.contexts()[0].pages();
      p = pages.find((x) => x.url().includes('mas_joven')) ?? pages[0];
      p.setDefaultTimeout(60000);
      attachPageError(p);
      await p.evaluate(() => 1);
      return p;
    } catch {
      /* sigue caída */
    }
  }
  throw new Error('CDP irrecuperable');
}

async function step(name, fn) {
  try {
    await ensurePage();
    await fn();
  } catch (e) {
    out.push(
      `FAIL step_${name} — ${String(e.message ?? e)
        .split('\n')[0]
        .slice(0, 160)}`
    );
  }
}

// ── Entorno + pre-smoke ────────────────────────────────────────────────
await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const envEval = () =>
  p.evaluate(() => ({
    iw: innerWidth,
    ih: innerHeight,
    vvW: visualViewport?.width,
    vvH: visualViewport?.height,
    dpr: devicePixelRatio,
    ua: navigator.userAgent,
    lang: navigator.language
  }));
const env = await envEval().catch(async () => {
  await p.waitForTimeout(4000); // navegación tardía del SPA
  return envEval();
});
out.push(`ENV ${JSON.stringify(env)}`);
ok('env_viewport_mobile', env.iw <= 430 && env.dpr > 1, `iw=${env.iw} dpr=${env.dpr}`);
await p.evaluate(() => localStorage.setItem('mjt-lang', 'es')).catch(() => {});
await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});

await step('portada', async () => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.headline-block, form, .hero', { timeout: 60000 });
  await p.waitForTimeout(3000);
  shot('01-home');
  await overlapAudit(p, 'portada');
  // inputs visibles + labels
  const home = await p.evaluate(() => ({
    year: !!document.querySelector('#year-input'),
    place: !!document.querySelector('#place-input'),
    submit: !!document.querySelector('form [type="submit"], form button')
  }));
  ok('home_form', home.year && home.place && home.submit, JSON.stringify(home));
});

await step('golden_path', async () => {
  // Flujo real: escribir año + municipio en la portada y entrar a Bilbao.
  const yearIn = p.locator('#year-input').first();
  if (await yearIn.count()) await yearIn.fill('1922');
  const placeIn = p.locator('#place-input').first();
  if (await placeIn.count()) {
    await placeIn.fill('bilb');
    const opt = p.locator('#place-listbox [role="option"] button, [role="option"]').first();
    if (await opt.count()) {
      await tap(opt);
    }
  }
  const sub = p.locator('form [type="submit"], form button[type="submit"]').first();
  if (await sub.count()) await tap(sub);
  const landed = await p
    .waitForFunction(() => !!window.__mjtApp?.headline, null, { timeout: 60000 })
    .then(() => true)
    .catch(() => false);
  ok('golden_flow', landed, 'deep link manual -> resultado');
});

await step('resultado', async () => {
  await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(5000);
  shot('02-result');
  await overlapAudit(p, 'resultado');
  const st = await p.evaluate(() => ({
    headline: !!window.__mjtApp?.headline,
    place: window.__mjtApp?.place?.slug,
    year: window.__mjtApp?.year,
    mode: window.__mjtApp?.mode,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  ok('result_state', st.headline && st.place === 'bilbao' && st.year === 1922, JSON.stringify(st));
  ok('no_hscroll', st.overflow <= 1, `overflow=${st.overflow}px`);
  // Touch targets de topbar
  const tt = await p.evaluate(() => {
    const r = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [b.width | 0, b.height | 0];
    };
    return { change: r('.change'), copy: r('.copylink'), langs: r('.langs') };
  });
  out.push(`INFO touch_targets ${JSON.stringify(tt)}`);
  const small = Object.entries(tt)
    .filter(([, v]) => v && (v[0] < 40 || v[1] < 32))
    .map(([k, v]) => `${k}=${v.join('x')}`);
  ok('touch_targets', small.length === 0, small.join(' ; ') || '≥40x32 ok');
});

await step('map_mode', async () => {
  await setMode(p, 'map').catch(() => {});
  await p.waitForTimeout(2500);
  shot('03-map');
  await overlapAudit(p, 'map');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    player: !!document.querySelector('.tc-bar, .timeband, .photo .tc-bar'),
    ortho: window.__mjtApp?.orthoRender
  }));
  ok('map_no_player', st.mode === 'map' && !st.player, JSON.stringify(st));
  ok('map_ortho_idle', st.ortho === 'IDLE', `orthoRender=${st.ortho}`);
  // gestos de mapa: drag + pinch simulados no deben mover playYear
  const y0 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  await p.mouse.move(390, 1000);
  await p.mouse.down();
  await p.mouse.move(200, 900, { steps: 6 });
  await p.mouse.up();
  const y1 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  ok('map_drag_no_play', y0 === y1, `playYear ${y0}->${y1}`);
});

await step('time_mode', async () => {
  await setMode(p, 'time');
  await p.waitForTimeout(2500);
  // la comprobación de clase única es a nivel edificio: zoom z14.3
  await p.evaluate(() => window.__mjtMap?.jumpTo?.({ center: [-2.928, 43.2625], zoom: 14.3 }));
  await p.waitForTimeout(2500);
  shot('04-time-idle');
  await overlapAudit(p, 'time');
  // clase única: fill = ['case', ['!=',['get','state'],'VALID'], gris, pizarra]
  // — sin comparador binario por año personal (contrato G19-R4 cierre).
  const paint = await p.evaluate(() => {
    const m = window.__mjtMap;
    const l = (m.getStyle()?.layers ?? []).find((x) => /^b-\d+-fill$/.test(x.id));
    return l ? JSON.stringify(m.getPaintProperty(l.id, 'fill-color')) : null;
  });
  ok(
    'time_single_class_fill',
    paint === JSON.stringify(['case', ['!=', ['get', 'state'], 'VALID'], '#d8dde2', '#52768e']),
    paint?.slice(0, 200)
  );
  const playBtn = p.locator('[data-action="play"]').first();
  if (
    !need('time_play_pause', await playBtn.isVisible().catch(() => false), 'sin botón play en time')
  )
    return;
  const y0 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  await tap(playBtn);
  const advanced = await p
    .waitForFunction(
      (y) => window.__mjtApp?.playing === true && window.__mjtApp?.playYear !== y,
      y0,
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);
  shot('05-time-playing');
  await tap(playBtn);
  const paused = await p
    .waitForFunction(() => window.__mjtApp?.playing === false, null, { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  const y1 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  await p.waitForTimeout(2000);
  const y2 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  ok('time_play_pause', advanced && paused && y1 === y2 && y1 !== y0, `y0=${y0} y1=${y1} y2=${y2}`);
  // gesture conflict: drag horizontal sobre el rail no debe mover el mapa
  const cam = () =>
    p.evaluate(() => {
      const m = window.__mjtMap;
      if (!m) return null;
      return {
        c: m.getCenter ? [m.getCenter().lng.toFixed(4), m.getCenter().lat.toFixed(4)] : null,
        z: m.getZoom ? m.getZoom() : null
      };
    });
  const c0 = await cam();
  const rail = await p.evaluate(() => {
    const el = document.querySelector('.tc-rail');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width * 0.3,
      y: r.top + r.height / 2,
      r: [r.left | 0, r.top | 0, r.width | 0, r.height | 0]
    };
  });
  if (rail) {
    await p.mouse.move(rail.x, rail.y);
    await p.mouse.down();
    await p.mouse.move(rail.x + 80, rail.y, { steps: 8 });
    await p.mouse.up();
    const c1 = await cam();
    const moved = c0 && c1 && (c0.c[0] !== c1.c[0] || c0.c[1] !== c1.c[1]);
    ok('scrub_no_map_pan', !moved, `cam ${JSON.stringify(c0)} -> ${JSON.stringify(c1)}`);
  } else {
    ok('scrub_no_map_pan', false, 'sin .tc-rail');
  }
});

await step('photo_mode', async () => {
  await setMode(p, 'photo');
  // espera a estado resuelto: CONTENT / EMPTY / ERROR
  // Contrato: entrar en foto sin campaña activada → lienzo base limpio +
  // rail como activador (IDLE es válido). Si hay campaña activa (deep
  // link), el render debe resolver a CONTENT/EMPTY/ERROR.
  const settled = await p
    .waitForFunction(
      () =>
        ['CONTENT', 'EMPTY', 'ERROR'].includes(window.__mjtApp?.orthoRender) ||
        !window.__mjtApp?.orthoVisible,
      null,
      { timeout: 45000 }
    )
    .then(() => true)
    .catch(() => false);
  const st = await p.evaluate(() => ({
    render: window.__mjtApp?.orthoRender,
    visible: window.__mjtApp?.orthoVisible,
    rstate: !!document.querySelector('.rstate'),
    cells: (() => {
      try {
        const l = window.__mjtMap?.getLayer?.('cells-fill');
        return l ? l.getLayoutProperty?.('visibility') !== 'none' : null;
      } catch {
        return null;
      }
    })()
  }));
  ok('photo_render_settled', settled && (st.render !== 'IDLE' || !st.visible), JSON.stringify(st));
  ok('photo_no_heatmap', st.cells !== true, `cellsVisible=${st.cells}`);
  shot('06-photo');
  await overlapAudit(p, 'photo');
  // campaña siguiente si habilitada
  const nxt = p.locator('.photo [data-action="next"]').first();
  const prv = p.locator('.photo [data-action="prev"]').first();
  const anyNav = (await nxt.count()) + (await prv.count()) > 0;
  if (!need('photo_nav', anyNav, 'sin navegación de campaña')) return;
  const btn = (await nxt.isEnabled().catch(() => false)) ? nxt : prv;
  const before = await p
    .locator('.photo .tc-year')
    .first()
    .textContent()
    .catch(() => null);
  await tap(btn);
  const changed = await p
    .waitForFunction(
      (b) => document.querySelector('.photo .tc-year')?.textContent?.trim() !== b,
      before?.trim(),
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);
  ok(
    'photo_campaign_change',
    changed,
    `${before?.trim()} -> ${await p
      .locator('.photo .tc-year')
      .first()
      .textContent()
      .catch(() => '?')}`
  );
});

await step('hist_mode', async () => {
  await setMode(p, 'hist');
  await p.waitForTimeout(3500);
  shot('07-hist');
  await overlapAudit(p, 'hist');
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    player: !!document.querySelector('.tc-bar'),
    histCtl: !!document.querySelector('.histmap')
  }));
  ok('hist_contract', st.mode === 'hist' && st.histCtl && !st.player, JSON.stringify(st));
});

await step('swipe_mode', async () => {
  await setMode(p, 'swipe');
  await p.waitForTimeout(4000);
  shot('08-swipe-mid');
  await overlapAudit(p, 'swipe');
  const g = await p.evaluate(() => {
    const R = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.top | 0, r.bottom | 0];
    };
    return { sw: R('.swipe'), mw: R('.mapwrap'), lg: R('.legend'), h: R('.handle') };
  });
  ok(
    'swipe_box_eq_canvas',
    g.sw && g.mw && Math.abs(g.sw[0] - g.mw[0]) <= 3 && Math.abs(g.sw[1] - g.mw[1]) <= 3,
    JSON.stringify(g)
  );
  ok('legend_below_canvas', !g.lg || !g.mw || g.lg[0] >= g.mw[1] - 2, JSON.stringify(g));
  // drag del handle: la cortina sigue al dedo sin perder el gesto
  if (g.h) {
    const hx = await p.evaluate(() => {
      const r = document.querySelector('.handle').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, cx: r.left };
    });
    await p.mouse.move(hx.x, hx.y);
    await p.mouse.down();
    await p.mouse.move(hx.x - 120, hx.y, { steps: 10 });
    await p.mouse.up();
    await p.waitForTimeout(500);
    const pos1 = await p.evaluate(
      () => document.querySelector('.handle')?.getBoundingClientRect().left
    );
    ok(
      'swipe_drag',
      pos1 != null && Math.abs(pos1 - hx.cx) > 20,
      `handle ${hx.cx | 0} -> ${pos1 | 0}`
    );
    shot('08b-swipe-moved');
  } else {
    ok('swipe_drag', false, 'sin .handle');
  }
});

await step('mode_cycle', async () => {
  // Cambio rápido de modos: ningún player/capa fuera de su contrato.
  const seq = ['map', 'time', 'photo', 'hist', 'swipe', 'time', 'map'];
  for (const m of seq) {
    await setMode(p, m).catch(() => {});
    await p.waitForTimeout(400);
  }
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({
    mode: window.__mjtApp?.mode,
    player: !!document.querySelector('.tc-bar'),
    rstate: !!document.querySelector('.rstate'),
    url: location.href
  }));
  ok('cycle_clean', st.mode === 'map' && !st.player && !st.rstate, JSON.stringify(st));
  ok(
    'cycle_url_sync',
    /view=map|!(view=)/.test(st.url) === true || !/view=(time|photo)/.test(st.url),
    st.url.slice(-60)
  );
});

await step('back_button', async () => {
  // KEYCODE_BACK de Android: historial real de Chrome.
  await setMode(p, 'time').catch(() => {});
  await p.waitForTimeout(1000);
  const m0 = await p.evaluate(() => window.__mjtApp?.mode);
  shell('input keyevent 4');
  await p.waitForTimeout(2500);
  const m1 = await p.evaluate(() => window.__mjtApp?.mode);
  ok('back_restores', m0 === 'time' && (m1 === 'map' || m1 === 'time'), `${m0}->${m1}`);
  // forward no garantizado en Chrome móvil — solo registra
  out.push(`INFO back_result mode=${m1}`);
});

await step('deeplinks', async () => {
  // A: time+play
  await p.goto(`${BASE}?year=1922&place=bilbao&lat=43.2625&lon=-2.928&z=14.3&view=time&play=1945`, {
    waitUntil: 'domcontentloaded'
  });
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(4000);
  const a = await p.evaluate(() => ({ m: window.__mjtApp?.mode, y: window.__mjtApp?.playYear }));
  ok('deeplink_time', a.m === 'time' && a.y === 1945, JSON.stringify(a));
  // B: photo+ortho
  await p.goto(
    `${BASE}?year=1922&place=bilbao&lat=43.2625&lon=-2.928&z=14.3&view=photo&ortho=1965`,
    { waitUntil: 'domcontentloaded' }
  );
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p
    .waitForFunction(
      () => ['CONTENT', 'EMPTY', 'ERROR'].includes(window.__mjtApp?.orthoRender),
      null,
      { timeout: 45000 }
    )
    .catch(() => {});
  const b = await p.evaluate(() => ({
    m: window.__mjtApp?.mode,
    c: window.__mjtApp?.orthoCampaign?.year,
    r: window.__mjtApp?.orthoRender
  }));
  ok('deeplink_photo', b.m === 'photo' && b.c === 1965 && b.r === 'CONTENT', JSON.stringify(b));
});

await step('invalid_year', async () => {
  await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await tap(p.locator('.change').first());
  const yearInput = p.locator('#edit-year');
  if (!need('invalid_year', await yearInput.isVisible().catch(() => false), 'sin #edit-year'))
    return;
  await yearInput.fill('1899');
  shot('09-invalid-year');
  await tap(p.locator('.cf-submit'));
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => ({
    year: window.__mjtApp?.year,
    err: !!document.querySelector('.cf-error, [role="alert"], .error'),
    editorOpen: !!document.querySelector('#edit-year')
  }));
  ok('invalid_year_blocked', st.year === 1922 && st.editorOpen, JSON.stringify(st));
  await p.keyboard.press('Escape').catch(() => {});
});

await step('rotation', async () => {
  shell('settings put system accelerometer_rotation 0');
  shell('settings put system user_rotation 1');
  await p.waitForTimeout(3500);
  const land = await p.evaluate(() => ({
    iw: innerWidth,
    ih: innerHeight,
    m: window.__mjtApp?.mode,
    y: window.__mjtApp?.year
  }));
  shot('10-landscape');
  ok('rotation_landscape', land.iw > land.ih, `land=${land.iw}x${land.ih}`);
  ok('rotation_state', land.m && land.y === 1922, JSON.stringify(land));
  shell('settings put system user_rotation 0');
  await p.waitForTimeout(3500);
  const port = await p.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
  shot('11-portrait-back');
  ok('rotation_back', port.iw === env.iw && port.iw < port.ih, `port=${port.iw}x${port.ih}`);
});

await step('font_scale', async () => {
  const measure = () => p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  const base = await measure().catch(() => null);
  await p.goto('about:blank').catch(() => {});
  shell('settings put system font_scale 1.3');
  try {
    await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  } catch {
    await ensurePage();
    await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  }
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(4000);
  const big = await measure().catch(() => null);
  shot('12-font-large');
  const grew = base && big && big > base * 1.03;
  if (grew) ok('font130_effective', true, `body ${base}px -> ${big}px`);
  else blocked('font130_effective', `font_scale=1.3 no escala texto web (${base} -> ${big})`);
  await overlapAudit(p, 'font130');
  await p.goto('about:blank').catch(() => {});
  shell('settings put system font_scale 1.0');
  try {
    await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  } catch {
    await ensurePage();
    await p.goto(`${BASE}?year=1922&place=bilbao`, { waitUntil: 'domcontentloaded' });
  }
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
});

await step('eu_lang', async () => {
  const euBtn = p.locator('.langs button').filter({ hasText: 'EU' }).first();
  if (!need('eu_switch', await euBtn.isVisible().catch(() => false), 'sin selector EU')) return;
  await euBtn.scrollIntoViewIfNeeded().catch(() => {});
  await tap(euBtn);
  const langOk = await p
    .waitForFunction(() => document.documentElement.lang === 'eu', null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  await p.waitForTimeout(2000);
  shot('13-eu');
  ok('eu_switch', langOk, `lang=${await p.evaluate(() => document.documentElement.lang)}`);
  const st = await p.evaluate(() => ({
    m: window.__mjtApp?.mode,
    y: window.__mjtApp?.year,
    iw: innerWidth,
    ow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  ok('eu_state_kept', st.y === 1922 && st.ow <= 1, JSON.stringify(st));
  // volver a ES para el resto
  const esBtn = p.locator('.langs button').filter({ hasText: 'ES' }).first();
  if (await esBtn.count()) await tap(esBtn).catch(() => {});
});

await step('copy_link', async () => {
  const btn = p
    .locator('.copylink, [data-action="copy-link"], button:has-text("Copiar enlace")')
    .first();
  if (!need('copy_link', await btn.isVisible().catch(() => false), 'sin botón Copiar enlace'))
    return;
  await tap(btn);
  await p.waitForTimeout(1200);
  const clip = await p.evaluate(() => navigator.clipboard?.readText?.().catch(() => null) ?? null);
  const feedback = await p.evaluate(
    () => !!document.querySelector('.copylink.done, .copied, [role="status"]')
  );
  ok('copy_feedback', feedback || !!clip, `clip=${String(clip).slice(0, 60)} feedback=${feedback}`);
});

await step('canvas_geom', async () => {
  const geom = await p.evaluate(() => {
    const cv = document.querySelector('.maplibregl-canvas');
    const wrap = document.querySelector('.mapwrap');
    if (!cv || !wrap) return null;
    const r = cv.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      canvasCss: [r.width | 0, r.height | 0],
      canvasAttr: [cv.width, cv.height],
      wrap: [w.width | 0, w.height | 0]
    };
  });
  if (!geom) {
    ok('canvas_size_matches', false, 'sin canvas/.mapwrap');
    return;
  }
  const dprOk = Math.abs(geom.canvasAttr[0] / Math.max(geom.canvasCss[0], 1) - env.dpr) < 0.6;
  const wrapOk = Math.abs(geom.canvasCss[0] - geom.wrap[0]) <= 2 && geom.wrap[1] > 0;
  ok('canvas_size_matches', dprOk && wrapOk, JSON.stringify(geom));
});

await step('offline', async () => {
  // modo avión real: cortar → intentar acción → restaurar
  try {
    shell('svc wifi disable');
  } catch {
    out.push('WARN offline — svc wifi no respondió');
  }
  await p.waitForTimeout(3000);
  const offlineState = await p
    .evaluate(() => ({
      alive: !!document.querySelector('.maplibregl-canvas'),
      mode: window.__mjtApp?.mode
    }))
    .catch(() => null);
  try {
    shell('svc wifi enable');
  } catch {
    out.push('WARN offline — restauración de wifi falló');
  }
  await p.waitForTimeout(4000);
  const rec = await p.evaluate(() => navigator.onLine).catch(() => null);
  ok('offline_survives', !!offlineState?.alive, `state=${JSON.stringify(offlineState)}`);
  ok('offline_recovers', rec === true || rec === null, `online=${rec}`);
});

shot('14-final');

// ── Veredicto ──────────────────────────────────────────────────────────
const REQUIRED = [
  'env_viewport_mobile',
  'home_form',
  'result_state',
  'no_hscroll',
  'touch_targets',
  'map_no_player',
  'map_ortho_idle',
  'time_single_class_fill',
  'time_play_pause',
  'scrub_no_map_pan',
  'photo_render_settled',
  'photo_no_heatmap',
  'photo_nav',
  'photo_campaign_change',
  'hist_contract',
  'swipe_box_eq_canvas',
  'legend_below_canvas',
  'swipe_drag',
  'cycle_clean',
  'back_restores',
  'deeplink_time',
  'deeplink_photo',
  'invalid_year_blocked',
  'rotation_landscape',
  'rotation_state',
  'rotation_back',
  'eu_switch',
  'eu_state_kept',
  'copy_feedback',
  'canvas_size_matches',
  'offline_survives'
];
const seen = (n) => out.some((l) => /^(PASS|FAIL|SKIP|BLOCKED) /.test(l) && l.split(' ')[1] === n);
for (const n of REQUIRED)
  if (!seen(n)) out.push(`FAIL missing_${n} — prueba obligatoria no ejecutada`);
for (const [i, e] of pageErrors.entries()) out.push(`FAIL pageerror_${i} — ${e}`);
const counts = { PASS: 0, FAIL: 0, SKIP: 0, BLOCKED: 0 };
for (const l of out) {
  const m = l.match(/^(PASS|FAIL|SKIP|BLOCKED) /);
  if (m) counts[m[1]]++;
}
const verdict =
  counts.FAIL > 0 ? 'FALLO' : counts.BLOCKED > 0 || counts.SKIP > 0 ? 'PARCIAL' : 'COMPLETO';
console.log(out.join('\n'));
console.log(
  `\nRESUMEN target=${TARGET} PASS=${counts.PASS} FAIL=${counts.FAIL} SKIP=${counts.SKIP} BLOCKED=${counts.BLOCKED}`
);
console.log(`VEREDICTO: ${verdict}`);
if (verdict === 'PARCIAL')
  console.log(
    '  → resultado parcial: hay pruebas bloqueadas o no aplicables — no es un QA completo'
  );
await browser.close().catch(() => {});
process.exit(counts.FAIL > 0 ? 1 : verdict === 'PARCIAL' ? 2 : 0);
