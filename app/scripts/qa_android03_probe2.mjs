// ANDROID-03 probe 2 — mismo audit, pero muestreando durante PLAYBACK activo
// (la leyenda .cells.play cambia de texto cada tick -> reflow continuo).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
execSync(`"${ADB}" -s emulator-5554 forward tcp:9222 localabstract:chrome_devtools_remote`);

const browser = await chromium.connectOverCDP('http://localhost:9222');
const p = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((pg) => pg.url().includes('mas_joven_que_tu'));
if (!p) throw new Error('tab producción no encontrada');
console.log('TAB', p.url());

const audit = () =>
  p.evaluate(() => {
    const sels = ['.cell-inspect', '.btn.ghost', '.legend', '.hot'];
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
    return { mode: window.__mjtApp?.mode, play: window.__mjtApp?.playYear, hits: out };
  });

// garantizar modo time + leyenda abierta
const vsel = p.locator('.vsel');
if (await vsel.isVisible().catch(() => false)) {
  await vsel.click();
  await p.waitForSelector('.vmenu', { timeout: 8000 });
  await p.locator('.vmenu .vopt[data-mode="time"]').click();
  await p.waitForFunction(() => window.__mjtApp?.mode === 'time', null, { timeout: 15000 });
}
await p.evaluate(() => {
  for (const d of document.querySelectorAll('.legend-more, details.legend-m'))
    if (!d.open) d.open = true;
});

let found = 0;
for (let round = 0; round < 3; round++) {
  // volver a 1900 y dar a play: la leyenda cambia cada tick
  await p.evaluate(() => {
    const s = document.querySelector('[aria-label*="Año en reproducción"], input[type="range"]');
  });
  const playBtn = p.locator('button:has-text("Reproducir"), [aria-label*="Reproducir"]');
  await playBtn.first().click().catch(() => {});
  for (let k = 0; k < 40; k++) {
    const a = await audit();
    for (const h of a.hits) {
      if (h.sel === '.cell-inspect' || h.covered) {
        const flag = h.covered ? 'HIT' : 'ok ';
        console.log(
          `${flag} r${round}.${k} mode=${a.mode} play=${a.play} :: ` +
            `${h.sel}[${h.rect}] covered=${h.covered} by=${h.coveredBy ?? '-'}`
        );
        if (h.covered) found++;
      }
    }
    await p.waitForTimeout(150);
  }
}
console.log(`RESULT overlap_hits=${found}`);
await browser.close();
