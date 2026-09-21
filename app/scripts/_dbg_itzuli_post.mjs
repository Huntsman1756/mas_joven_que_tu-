// Sonda puntual: qué POST lanza Itzuli y qué devuelve (URL + cuerpo).
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('response', async (r) => {
  if (r.request().method() !== 'POST') return;
  const url = r.url();
  if (!/euskadi|itzuli|traduc/i.test(url)) return;
  let body;
  try {
    body = (await r.text()).slice(0, 600);
  } catch {
    body = '<unreadable>';
  }
  console.log('POST', r.status(), url);
  console.log('REQDATA', (r.request().postData() || '').slice(0, 300));
  console.log('BODY', body, '\n---');
});
await page.goto('https://www.euskadi.eus/traductor/', { waitUntil: 'networkidle', timeout: 60000 });
await page.selectOption('#model', 'es2eu');
await page.fill('#text_input', 'Frase de prueba del contraste.');
await page.click('button:has-text("Traducir"), button:has-text("Itzuli")');
await page.waitForTimeout(6000);
console.log('OUT', await page.evaluate(() => document.querySelector('#translation_text')?.textContent));
await browser.close();
