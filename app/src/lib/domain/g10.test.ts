import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { parseYearInput } from './url';
import { bucketRenderState } from './metrics';
import { fetchNora } from './nora';

const SNAP = 2026;

describe('G10-01 — parseYearInput: dominio entero 1900..snapshot', () => {
  it.each([
    ['', 'vacío'],
    ['   ', 'espacios'],
    ['abc', 'texto'],
    ['mil novecientos', 'texto largo'],
    ['1988.5', 'decimal'],
    ['1e3', 'notación científica'],
    ['-1950', 'negativo'],
    ['0', 'cero'],
    ['1899', 'mínimo - 1'],
    ['2027', 'máximo + 1'],
    ['2500', 'año futuro'],
    ['２０００', 'dígitos fullwidth'],
    ['0x7c0', 'hex → Number() daría 1984'],
    ['01988', 'cinco dígitos'],
    ['+1988', 'signo']
  ])('%s (%s) → null', (raw) => {
    expect(parseYearInput(raw, SNAP)).toBeNull();
  });

  it.each([
    ['1900', 1900, 'mínimo'],
    ['1988', 1988, 'interior'],
    ['2026', 2026, 'máximo = snapshot'],
    [' 1988 ', 1988, 'con espacios pegados']
  ])('%s (%s) → %i', (raw, expected) => {
    expect(parseYearInput(raw, SNAP)).toBe(expected);
  });

  it('el límite superior es el snapshot, no un literal', () => {
    expect(parseYearInput('2030', 2030)).toBe(2030);
    expect(parseYearInput('2031', 2030)).toBeNull();
  });
});

describe('G10-05 — bucketRenderState: cuatro estados explícitos', () => {
  it('nAfter === 0 → all-before', () => {
    expect(bucketRenderState(100, 0)).toBe('all-before');
  });
  it('0 < nAfter < n → split', () => {
    expect(bucketRenderState(100, 40)).toBe('split');
    expect(bucketRenderState(100, 99)).toBe('split');
  });
  it('nAfter === n → all-after (nunca «antes»)', () => {
    expect(bucketRenderState(100, 100)).toBe('all-after');
    expect(bucketRenderState(1, 1)).toBe('all-after');
  });
  it('n === 0 → empty', () => {
    expect(bucketRenderState(0, 0)).toBe('empty');
  });
});

describe('G10-09 — fetchNora: fase de red separada, no bloqueante', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 con lista → devuelve list + subconjunto Bizkaia', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        list: [
          { municipioId: '54', descMunicipio: 'Leioa', provinciaId: '48' },
          { municipioId: '9', descMunicipio: 'León', provinciaId: '24' }
        ]
      })
    } as Response);
    const r = await fetchNora('le');
    expect(r.list).toHaveLength(2);
    expect(r.bizkaia).toHaveLength(1);
  });

  it('204 → list vacía (NO_RESULTS aguas arriba, no error)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 } as Response);
    const r = await fetchNora('zzzzz');
    expect(r.list).toHaveLength(0);
  });

  it('500 → lanza (quien llama degrada con los locales)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(fetchNora('bilbao')).rejects.toThrow('nora 500');
  });

  it('abort propaga AbortError (respuesta tardía descartable)', async () => {
    vi.mocked(fetch).mockImplementation((_u, init) => {
      return new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('aborted', 'AbortError'))
        );
      }) as Promise<Response>;
    });
    const ac = new AbortController();
    const p = fetchNora('bilbao', ac.signal);
    ac.abort();
    await expect(p).rejects.toThrow('aborted');
  });
});
