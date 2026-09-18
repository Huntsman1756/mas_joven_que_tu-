// Probe: drive the MI EDIFICIO flow in Chromium and dump app state.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const server = await createStaticServer(BUILD, 4179);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => {
  console.log('PAGEERROR:', String(e).slice(0, 200));
  if (e.stack) console.log('STACK:', e.stack.split('\n').slice(0, 25).join('\n'));
});
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300));
});

try {
  await page.goto(`http://localhost:4179/?year=1987&place=bilbao`, {
    waitUntil: 'load'
  });
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.click('.invite .start');
  await page.waitForSelector('#addr-street', { timeout: 10000 });
  await page.fill('#addr-street', 'Gran Via');
  await page.waitForTimeout(1500);
  console.log('streetQ:', await page.locator('#addr-street').inputValue());
  console.log('status:', await page.locator('.status').innerText());
  await page.fill('#addr-num', '1');
  await page.waitForTimeout(8000);
  const dump = await page.evaluate(() => {
    const a = window.__mjtApp;
    return {
      addressResult: a?.addressResult
        ? {
            identity: a.addressResult.identity,
            agreement: a.addressResult.agreement,
            nCand: a.addressResult.catastroCandidates?.length,
            cat: a.addressResult.catastroBuilding?.id ?? null,
            nEdificios: a.addressResult.edificios?.length,
            portal: a.addressResult.portal?.numero
          }
        : null,
      identityPoint: a?.identityPoint ?? null,
      identityResult: a?.identityResult
        ? { identity: a.identityResult.identity, n: a.identityResult.candidates?.length }
        : null,
      selectedBuilding: a?.selectedBuilding?.id ?? null,
      view: a?.view,
      pmtilesError: a?.pmtilesError
    };
  });
  console.log('STATE:', JSON.stringify(dump, null, 2));
  console.log('status:', await page.locator('.status').innerText());
  console.log('res html:', (await page.locator('.res').innerHTML().catch(() => 'none')).slice(0, 800));
  await page.screenshot({ path: 'probe-g3a.png', fullPage: true });
} catch (e) {
  console.log('ERR:', String(e).slice(0, 400));
  await page.screenshot({ path: 'probe-g3a-fail.png', fullPage: true }).catch(() => {});
}
await browser.close();
server.close();
