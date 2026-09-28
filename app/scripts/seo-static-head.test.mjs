import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('dominio propio, subruta, repetición y rechazo de configuración incoherente', () => {
  const root = mkdtempSync(join(tmpdir(), 'mjt-seo-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'build'));
    const script = join(root, 'scripts/seo-static-head.mjs');
    copyFileSync('scripts/seo-static-head.mjs', script);
    for (const file of ['index.html', 'como-lo-sabemos.html']) {
      writeFileSync(join(root, 'build', file), readFileSync('src/app.html'));
    }
    const run = (url, base) => execFileSync(process.execPath, [script], {
      env: { ...process.env, SITE_URL: url, BASE_PATH: base }, stdio: 'pipe'
    });
    for (const [url, base] of [['https://example.invalid', ''], ['https://example.invalid/visor', '/visor']]) {
      run(url, base);
      for (const file of ['index.html', 'como-lo-sabemos.html', 'robots.txt', 'sitemap.xml']) {
        const text = readFileSync(join(root, 'build', file), 'utf8');
        assert.ok(text.includes(url));
        assert.ok(!text.includes('huntsman1756.github.io'));
      }
      const home = readFileSync(join(root, 'build/index.html'), 'utf8');
      assert.ok(home.includes(`rel="canonical" href="${url}/"`));
      assert.ok(home.includes(`content="${url}/og-card.png"`));
      assert.equal((home.match(/name="mjt:build"/g) || []).length, 1);
      const method = readFileSync(join(root, 'build/como-lo-sabemos.html'), 'utf8');
      assert.ok(method.includes(`rel="canonical" href="${url}/como-lo-sabemos"`));
      assert.ok(method.includes('Cómo lo sabemos — Más joven que tú'));
    }
    for (const [url, base] of [['http://example.invalid', ''], ['https://example.invalid/visor', ''], ['https://example.invalid/?x=1', '']]) {
      assert.throws(() => run(url, base));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
