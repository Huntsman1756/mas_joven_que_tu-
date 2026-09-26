// ANDROID-03 probe — reproduce la comprobación geométrica de g19r5_android.mjs
// (elementFromPoint en el centro de `.cell-inspect`) muestreada en bucle durante
// transiciones de modo, sobre la pestaña de producción ya abierta en Chrome.
// Uso: node .scratch/android03_probe.mjs   (cwd = app/ para resolver playwright)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
const DEV = 'emulator-5554';
const CDP = 9222;

execSync(`"${ADB}" -s ${DEV} forward tcp:${CDP} localabstract:chrome_devtools_remote`);

const browser = await chromium.connectOverCDP(`http://localhost:${CDP}`);
const p = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((pg) => pg.url().includes('mas_joven_que_tu'));
if (!p) throw new Error('tab producción no encontrada');
console.log('TAB', p.url());

// misma lógica que overlapAudit(): qué elemento cubre el centro de cada target
const audit = () =>
  p.evaluate(() => {
    const sels = ['.cell-inspect', '.btn.ghost', '.legend', '.legend-more', '.hot', '.vsel'];
    const out = [];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
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
        out.push({
          sel: s,
          rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0],
          covered,
          coveredBy: covered
            ? `${top.tagName}.${String(top.className).slice(0, 60)}`
            : null
        });
      }
    }
    return {
      mode: window.__mjtApp?.mode,
      legendPos: getComputedStyle(document.querySelector('.legend') || document.body)
        .position,
      scrollY: scrollY | 0,
      ih: innerHeight,
      hits: out
    };
  });

const report = (tag, a) => {
  const bad = a.hits.filter((h) => h.covered);
  for (const h of a.hits)
    if (h.sel === '.cell-inspect' || h.covered)
      console.log(
        `${tag} mode=${a.mode} legend=${a.legendPos} scrollY=${a.scrollY} :: ` +
          `${h.sel}[${h.rect}] covered=${h.covered} by=${h.coveredBy ?? '-'}`
      );
  return bad;
};

const openLegend = async () => {
  // legend-more (visor) o legend-m (apilado): abrir el <details> que contiene .cell-inspect
  await p.evaluate(() => {
    for (const d of document.querySelectorAll('.legend-more, details.legend-m'))
      if (!d.open) d.open = true;
  });
};

let found = 0;
for (let i = 1; i <= 12; i++) {
  // ciclo map -> time con la leyenda abierta y zoom CELDA (z14.3, mismo que el harness)
  const target = i % 2 ? 'time' : 'map';
  try {
    const vsel = p.locator('.vsel');
    if (await vsel.isVisible().catch(() => false)) {
      await vsel.click({ timeout: 3000 });
      await p.waitForSelector('.vmenu', { timeout: 8000 });
      await p.locator(`.vmenu .vopt[data-mode="${target}"]`).click({ timeout: 3000 });
    } else {
      await p.locator(`.viewswitch [data-mode="${target}"]`).click({ timeout: 3000 });
    }
  } catch (e) {
    console.log(`iter ${i} setMode(${target}) failed: ${String(e).slice(0, 120)}`);
    continue;
  }
  await p.waitForFunction((m) => window.__mjtApp?.mode === m, target, {
    timeout: 15000
  });
  await openLegend();
  // muestreo denso durante la transición/scroll
  for (let k = 0; k < 15; k++) {
    const a = await audit();
    found += report(`i${i}.${k}`, a).length;
    if (k === 5) await p.evaluate(() => scrollBy(0, 220)); // fuerza re-layout + toolbar dinámico
    if (k === 10) await p.evaluate(() => scrollBy(0, -220));
    await p.waitForTimeout(120);
  }
}
console.log(`RESULT overlap_hits=${found}`);
await browser.close();
