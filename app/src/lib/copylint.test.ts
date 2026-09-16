import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { es } from './i18n/es';

/**
 * Copy-lint (G1 C1/C3):
 *  - C1: 0 literales visibles en componentes (todo el copy sale del diccionario).
 *  - C3: afirmaciones prohibidas nunca en el copy ni en plantillas.
 */

const SRC = fileURLToPath(new URL('..', import.meta.url));

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(svelte|ts)$/.test(e)) yield p;
  }
}

const FORBIDDEN = [
  /bizkaia (creci[oó]|ha crecido)/i,
  /naci[oó] (el|este|en) barrio/i,
  /no hab[ií]a nada/i,
  /superficie construida/i, // huella ≠ superficie construida (salvo la negación explícita)
  /año de c[aá]lculo|ano_calcul/i,
  /parque hist[oó]rico/i,
];

describe('copy-lint', () => {
  it('C3: el diccionario no contiene afirmaciones prohibidas', () => {
    for (const [k, v] of Object.entries(es)) {
      for (const re of FORBIDDEN) {
        // la única aparición permitida es la nota que NIEGA la confusión
        if (['building.fields.note', 'result.area', 'how.nocalc'].includes(k)) continue;
        expect(re.test(v), `${k} contiene ${re}`).toBe(false);
      }
    }
  });

  it('C1: los componentes .svelte no contienen texto literal visible', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (!f.endsWith('.svelte')) continue;
      const src = readFileSync(f, 'utf8');
      // texto entre > < con letras, fuera de <style>/<script>
      const noStyle = src
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/\{[^}]*\}/g, ''); // expresiones {…} y bloques {#if …}
      const matches = noStyle.match(/>[^<{}]*[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}[^<{}]*</g) ?? [];
      // permitidos: atributos aria-label con t(), comentarios, ✕
      const bad = matches.filter((m) => !/[{}]/.test(m) && !/^\s*>?\s*(✕|·|\||—)\s*</.test(m) && !/aria-/.test(m));
      if (bad.length) offenders.push(`${f}: ${bad.slice(0, 3).join(' | ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('las claves usadas existen (cobertura mínima del diccionario)', () => {
    const keys = new Set(Object.keys(es));
    const used = new Set<string>();
    for (const f of walk(SRC)) {
      if (f.endsWith('.test.ts')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?<![\w])t\('([^']+)'/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !keys.has(k));
    expect(missing).toEqual([]);
  });
});
