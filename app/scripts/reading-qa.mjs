import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installCiFixtures } from './fixtures.mjs';

const out = resolve(
  process.env.READING_OUT || `../evidence/copy-review-20260930/run-${Date.now()}`
);
await mkdir(out, { recursive: true });
const server = process.env.READING_BASE ? null : await createStaticServer(resolve('build'), 0);
const base = process.env.READING_BASE || `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const report = {
  base,
  browser: browser.version(),
  fixtures: process.argv.includes('--fixtures'),
  checks: [],
  errors: [],
  pass: false
};
let page;
const check = async (name, action) => {
  try {
    report.checks.push({ name, pass: true, detail: await action() });
  } catch (e) {
    report.checks.push({ name, pass: false, error: String(e) });
    throw e;
  }
};
const layout = async () => {
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  assert.ok(sizes.content <= sizes.width + 1, JSON.stringify(sizes));
  return sizes;
};
const capture = async (name, selector) => {
  await page.evaluate(() => document.fonts.ready);
  await page.locator(selector).screenshot({ path: join(out, `${name}.png`) });
};
try {
  for (const width of [320, 390, 768, 1440]) {
    page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => report.errors.push(e.message));
    if (report.fixtures) await installCiFixtures(page);
    await page.goto(`${base}?year=1979&place=mungia`);
    await page.locator('.headline-block h1').waitFor();
    report.build = await page.evaluate(
      () => document.querySelector('meta[name="mjt:build"]')?.getAttribute('content') ?? null
    );
    if (process.env.EXPECTED_BUILD) assert.equal(report.build, process.env.EXPECTED_BUILD);
    await page.locator('.below').scrollIntoViewIfNeeded();
    await page.locator('#context-h').waitFor();
    await page.locator('#context-h').scrollIntoViewIfNeeded();
    await page.locator('.ctx.plan > .src').waitFor();
    await page.locator('.planning-facts').waitFor();
    await check(`${width}-context`, async () => {
      const styles = await page.locator('.ctx.plan').evaluate((el) =>
        [...el.querySelectorAll('p.fact, .planning-facts li, p.note')].map((x) => ({
          text: x.innerText,
          font: getComputedStyle(x).fontFamily,
          size: getComputedStyle(x).fontSize,
          color: getComputedStyle(x).color,
          line: getComputedStyle(x).lineHeight
        }))
      );
      assert.ok(styles.length >= 5);
      for (const style of styles) {
        for (const property of ['font', 'size', 'color', 'line'])
          assert.equal(style[property], styles[0][property], `${property}: ${style.text}`);
      }
      const text = await page.locator('.planning-facts').innerText();
      for (const value of ['2.122', '46,1', '57,6']) assert.ok(text.includes(value));
      return { styles, layout: await layout() };
    });
    await capture(`${width}-context`, '.ctx.plan');
    if (width === 320) {
      await page.getByRole('button', { name: 'EU', exact: true }).click();
      await check('320-eu-context', layout);
      await capture('320-eu-context', '.ctx.plan');
    }
    await page.goto(`${base}?story=f4036`);
    await page.locator('.chapter .scontrast').waitFor();
    await page.getByRole('button', { name: 'ES', exact: true }).click();
    await check(`${width}-percentages`, async () => {
      const sizes = await page.locator('.scontrast').evaluate((el) =>
        [...el.querySelectorAll('.row')].map((row) => ({
          text: row.innerText,
          number: parseFloat(getComputedStyle(row.querySelector('.num')).fontSize),
          body: parseFloat(getComputedStyle(row.querySelector('.txt')).fontSize)
        }))
      );
      assert.equal(sizes.length, 2);
      for (const row of sizes) {
        assert.ok(row.number <= row.body * 1.25, JSON.stringify(row));
        assert.match(row.text, /%\s+de/);
      }
      const note = page.locator('.scontrast .note');
      assert.ok(await note.isVisible());
      assert.match(await note.innerText(), /actuales con año conocido y geometría válida/);
      return { sizes, layout: await layout() };
    });
    await capture(`${width}-story`, '.chapter');
    await page.evaluate(axe);
    await check(`${width}-axe-story`, async () => {
      const audit = await page.evaluate(() =>
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
      );
      assert.deepEqual(
        audit.violations.map((v) => v.id),
        []
      );
      return { violations: 0 };
    });
    if (width === 320) {
      await page.getByRole('button', { name: 'EU', exact: true }).click();
      await check('320-eu-story', layout);
      await capture('320-eu-story', '.chapter');
    }
    if (width === 1440) {
      for (const id of ['c2803', 'f4233', 'f4738', 'f149']) {
        await page.goto(`${base}?story=${id}`);
        await page.locator(`.chapter[data-story="${id}"]`).waitFor();
        await check(`chapter-${id}`, layout);
        await capture(`chapter-${id}`, '.chapter');
      }
      await page.goto(`${base}como-lo-sabemos`);
      await page.locator('h1').waitFor();
      await check('method', layout);
      await capture('method', '.how');
    }
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.pass = true;
} finally {
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server?.close();
}
