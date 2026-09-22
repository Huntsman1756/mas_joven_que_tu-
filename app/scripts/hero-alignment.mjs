import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.HERO_URL || 'http://127.0.0.1:4430/';
const browser = await chromium.launch();
try {
  for (const width of [360, 390, 768, 1024, 1440]) {
    for (const lang of ['es', 'eu']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript((lang) => localStorage.setItem('mjt-lang', lang), lang);
      await page.goto(base);
      await page.waitForSelector('#place-input');
      await page.evaluate(() => document.fonts.ready);
      const positions = () =>
        page.evaluate(() => {
          const year = document.querySelector('#year-input').getBoundingClientRect();
          const place = document.querySelector('#place-input').getBoundingClientRect();
          return { year: year.top + scrollY, place: place.top + scrollY };
        });
      const aligned = async () => {
        const pos = await positions();
        assert.ok(Math.abs(pos.year - pos.place) <= 1, JSON.stringify(pos));
        return pos;
      };
      const initial = await aligned();
      await page.fill('#year-input', '1952');
      await page.fill('#place-input', 'Bilbao');
      await page.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
      const selected = await aligned();
      assert.ok(Math.abs(initial.place - selected.place) <= 1, 'Selection moved input');
      await page.fill('#place-input', '');
      const cleared = await aligned();
      assert.ok(Math.abs(initial.place - cleared.place) <= 1, 'Clearing moved input');
      await page.fill('#place-input', 'Bilbao');
      await page.locator('[role=option] button').filter({ hasText: 'Bilbao' }).click();
      await page.fill('#year-input', '1899');
      await page.locator('.cta').click();
      await page.waitForSelector('#year-err');
      await aligned();
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await aligned();
      console.log(`PASS ${width} ${lang}: aligned, stable selection/clear, error, enlarged text`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
