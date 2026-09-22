// Capturas del comparador en el emulador: ambas imágenes disponibles
// (after = campaña que la sonda real verifica) — evidencia DOM y
// dispositivo sin ANR.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
const DEV = 'emulator-5556';
const EV = 'F:/_CONCURSOS/mas_joven_que_tu/evidence/g16c/';
const BASE = 'http://localhost:4297/';
const shell = (cmd) =>
  execSync(`"${ADB}" -s ${DEV} shell ${cmd}`, { shell: 'cmd.exe', stdio: 'pipe' });

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
  } catch { /* noop */ }
}

const browser = await chromium.connectOverCDP('http://localhost:9333');
const p = browser.contexts()[0].pages().find((x) => x.url().includes('localhost')) ??
  browser.contexts()[0].pages()[0];
p.setDefaultTimeout(60000);
await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.headline-block h1', { timeout: 60000 });
await p.waitForTimeout(3000);
await p.evaluate(() => localStorage.setItem('mjt-lang', 'es'));
// swipe: before=1956 (BFA), after=1983 (BFA) — otro proveedor para probar
// disponibilidad real; la WMS de geoEuskadi falla en este emulador.
await p.goto(`${BASE}?year=1952&place=getxo&view=swipe&ortho=2002&ortho2=1956`, {
  waitUntil: 'domcontentloaded'
});
await p.waitForSelector('.swipectl select', { timeout: 60000 });
const st = await p
  .waitForFunction(
    () => ['AVAILABLE', 'NOT_COVERED', 'SERVICE_ERROR'].includes(window.__mjtApp?.orthoState),
    null,
    { timeout: 30000 }
  )
  .then(() => p.evaluate(() => window.__mjtApp.orthoState))
  .catch(() => 'TIMEOUT');
console.log('orthoState(1983) =', st);
const bst = await p
  .waitForFunction(
    () => window.__mjtApp?.swipeBeforeState !== 'probing',
    null,
    { timeout: 30000 }
  )
  .then(() => p.evaluate(() => window.__mjtApp.swipeBeforeState))
  .catch(() => 'TIMEOUT');
console.log('swipeBeforeState(1956) =', bst);
await p.evaluate(() =>
  document.querySelector('.mapcell')?.scrollIntoView({ block: 'center' })
);
await p.waitForTimeout(1500);
const chips = await p.evaluate(() => ({
  left: document.querySelector('.swipe .chip.left')?.textContent ?? null,
  right: document.querySelector('.swipe .chip.right')?.textContent ?? null
}));
console.log('chips', JSON.stringify(chips));
await p.screenshot({ path: `${EV}local-06c-comparador-ambas-dom.png` });
dismissAnr();
execSync(`"${ADB}" -s ${DEV} exec-out screencap -p > "${EV}local-06c-comparador-ambas.png"`, {
  shell: 'cmd.exe'
});
await browser.close();
