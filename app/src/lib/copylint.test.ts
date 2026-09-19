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
  // G3-D GD5: interpretación sanitaria/valorativa del ruido (solo banda oficial)
  /zona ruidosa|silencioso|insalubre|malo para dormir|contaminaci[oó]n ac[uú]stica/i,
  // G3-D GD5: monte público ≠ espacio protegido
  /espacio (natural )?protegido|parque natural|reserva natural|conservaci[oó]n/i
];

describe('copy-lint', () => {
  it('C3: el diccionario no contiene afirmaciones prohibidas', () => {
    for (const [k, v] of Object.entries(es)) {
      for (const re of FORBIDDEN) {
        // la única aparición permitida es la nota que NIEGA la confusión
        // (context.monte.source: «monte público NO equivale a espacio protegido»)
        if (
          ['building.fields.note', 'result.area', 'how.nocalc', 'context.monte.source'].includes(k)
        )
          continue;
        expect(re.test(v), `${k} contiene ${re}`).toBe(false);
      }
    }
  });

  it('C1: los componentes .svelte no contienen texto literal visible', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (!f.endsWith('.svelte')) continue;
      const src = readFileSync(f, 'utf8');
      // texto entre > < con ≥2 letras, fuera de <style>/<script>
      const noStyle = src
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/\{[^}]*\}/g, ''); // expresiones {…} y bloques {#if …}
      const matches = noStyle.match(/>[^<{}]*[a-zA-ZáéíóúñÁÉÍÓÚÑ]{2,}[^<{}]*</g) ?? [];
      // permitidos: comentarios, símbolos (✕ · | —); aria-label debe usar t()
      const bad = matches.filter((m) => !/[{}]/.test(m) && !/^\s*>?\s*(✕|·|\||—)\s*</.test(m));
      if (bad.length) offenders.push(`${f}: ${bad.slice(0, 3).join(' | ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('C1: ningún aria-label/atributo accesible es literal (debe usar t())', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (!f.endsWith('.svelte')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:aria-label|aria-description|title|alt)\s*=\s*"([^"]*)"/g)) {
        if (/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{2,}/.test(m[1])) offenders.push(`${f}: ${m[0]}`);
      }
      for (const m of src.matchAll(
        /setAttribute\(\s*['"](?:aria-label|aria-description)['"]\s*,\s*['"]([^'"]+)['"]/g
      )) {
        offenders.push(`${f}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('C1: sin literales de copy en <script> (fallbacks, mensajes)', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (!f.endsWith('.svelte')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/<script[\s\S]*?<\/script>/g)) {
        // cadenas en español (≥2 palabras minúsculas o con tildes) como fallback/literal
        for (const s of m[0].matchAll(/(?:\|\||\?\?|=>|=)\s*'([^'\n]*[a-záéíóúñ]{2,}[^'\n]*)'/g)) {
          const v = s[1];
          if (/[a-záéíóúñ] [a-záéíóúñ]/.test(v) || /[áéíóúñ]/.test(v)) {
            offenders.push(`${f}: '${v}'`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('HR2 regresión: la afirmación catastral falsa «campaña 1956 (vuelo 1956–1957)» no aparece en superficies activas', () => {
    // El rango 1956-57 es el vuelo AMERICANO de geoEuskadi (ORTO_1956_57_AMERICANO),
    // no el vuelo catastral del que deriva ORTO_BFA_1956 (fecha sin determinar,
    // 1953-1955, ficha ODB). Permitidas: menciones del vuelo americano y las
    // negaciones/documentación de la corrección; prohibido afirmarlo para la
    // campaña catastral en copy de producto o documentos canónicos.
    const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
    const files = [
      'app/src/lib/i18n/es.ts',
      'docs/UX_COPY.md',
      'docs/DATA_SEMANTICS.md',
      'data/manifests/bizkaia.ortofotos.historicas.yaml'
    ];
    const offenders: string[] = [];
    for (const rel of files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const line of src.split('\n')) {
        if (/americano|ORTO_1956_57/i.test(line)) continue;
        if (/1956[–-](?:1957|57)/.test(line)) offenders.push(`${rel}: ${line.trim()}`);
      }
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
