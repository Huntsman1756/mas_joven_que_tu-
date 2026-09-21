import { describe, it, expect } from 'vitest';
import {
  parseYs,
  cellDataState,
  shareAfter,
  shareAfterParsed,
  shareUntilParsed,
  countAfterParsed,
  countUntilParsed,
  knownFromYs,
  footprintShareAfter
} from './cells';

describe('estado de carga independiente de ausencia de año', () => {
  it('solo un denominador cero confirma ausencia', () => {
    expect(cellDataState(0, null)).toBe('no-known');
    expect(cellDataState(137, null)).toBe('loading');
    expect(cellDataState(137, null, true)).toBe('error');
    expect(cellDataState(137, 0)).toBe('ready');
    expect(cellDataState(137, 1)).toBe('ready');
    expect(cellDataState(137, 0.3, true)).toBe('ready');
  });

  it('descarga resuelta sin el fid no es «cargando» ni «sin año conocido»', () => {
    expect(cellDataState(137, null, false, true)).toBe('missing');
    // la ausencia de año conocido (denominador 0) prima sobre resolved
    expect(cellDataState(0, null, false, true)).toBe('no-known');
    // resolved no convierte un error de descarga en «missing»
    expect(cellDataState(137, null, true, false)).toBe('error');
  });
});

describe('ys (serie anual serializada)', () => {
  it('parsea pares y:n', () => {
    const m = parseYs('1900:3,1950:7,1987:2');
    expect(m.get(1900)).toBe(3);
    expect(m.get(1950)).toBe(7);
    expect(m.get(1987)).toBe(2);
  });
  it('tolerante con basura', () => {
    expect(parseYs('').size).toBe(0);
    expect(parseYs(null).size).toBe(0);
    expect(parseYs('a:b').size).toBe(0);
  });
  it('shareAfter: cuota sobre año conocido', () => {
    // 10 conocidos; 4 con y > 1987 → 0.4
    expect(shareAfter('1900:6,1990:4', 1987)).toBeCloseTo(0.4);
  });
  it('shareAfter: año en el límite queda «ya existía»', () => {
    expect(shareAfter('1987:5,1988:5', 1987)).toBeCloseTo(0.5);
  });
  it('shareAfter: sin conocidos → null (no 0)', () => {
    expect(shareAfter(null, 1987)).toBeNull();
    expect(shareAfter('', 1987)).toBeNull();
  });
  it('knownFromYs suma', () => {
    expect(knownFromYs('1900:3,1950:7')).toBe(10);
  });
});

describe('ya (huella por año) — C-08 tooltip de celda', () => {
  it('cuota de huella posterior sobre huella con año conocido', () => {
    // 1000 m² en 1900 + 400 m² en 1990 → después de 1987: 400/1400
    expect(footprintShareAfter('1900:1000,1990:400', 1987)).toBeCloseTo(400 / 1400);
  });
  it('año en el límite no cuenta como posterior', () => {
    expect(footprintShareAfter('1987:100,1988:100', 1987)).toBeCloseTo(0.5);
  });
  it('sin huella con año conocido → null (no 0)', () => {
    expect(footprintShareAfter(null, 1987)).toBeNull();
    expect(footprintShareAfter('', 1987)).toBeNull();
  });
  it('tolera áreas decimales serializadas', () => {
    expect(footprintShareAfter('1900:33.33,1990:66.67', 1987)).toBeCloseTo(2 / 3);
  });
});

describe('shareUntilParsed — proyección temporal G2 (contrato S2)', () => {
  it('cuota del stock actual constatada hasta P (incluye el límite)', () => {
    expect(shareUntilParsed(parseYs('1900:6,1990:4'), 1987)).toBeCloseTo(0.6);
    expect(shareUntilParsed(parseYs('1987:5,1988:5'), 1987)).toBeCloseTo(0.5);
  });
  it('complementaria de shareAfterParsed: until(P) = 1 − after(P)', () => {
    const m = parseYs('1950:3,1980:4,2010:3');
    for (const p of [1900, 1975, 2000, 2026]) {
      expect(shareUntilParsed(m, p)! + shareAfterParsed(m, p)!).toBeCloseTo(1);
    }
  });
  it('monótona no decreciente y share(∞)=1', () => {
    const m = parseYs('1950:2,1990:5,2020:3');
    let prev = -1;
    for (let p = 1900; p <= 2026; p += 10) {
      const s = shareUntilParsed(m, p)!;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    expect(shareUntilParsed(m, 2026)).toBe(1);
    expect(shareUntilParsed(m, 1900)).toBe(0);
  });
  it('sin conocidos → null (no 0): celda sin VALID queda indefinida', () => {
    expect(shareUntilParsed(null, 1990)).toBeNull();
    expect(shareUntilParsed(parseYs(null), 1990)).toBeNull();
  });
});

describe('countAfter/countUntilParsed — numeradores de la ficha de zona', () => {
  it('conteo exacto coherente con la cuota: N = share · known', () => {
    const m = parseYs('1900:6,1990:4');
    expect(countAfterParsed(m, 1987)).toBe(4);
    expect(countUntilParsed(m, 1987)).toBe(6);
    expect(countAfterParsed(m, 1987)! / 10).toBeCloseTo(shareAfterParsed(m, 1987)!);
    expect(countUntilParsed(m, 1987)! / 10).toBeCloseTo(shareUntilParsed(m, 1987)!);
  });
  it('año en el límite: after excluye, until incluye', () => {
    const m = parseYs('1987:5,1988:5');
    expect(countAfterParsed(m, 1987)).toBe(5);
    expect(countUntilParsed(m, 1987)).toBe(5);
  });
  it('sin conocidos → null (nunca 0 con denominador vacío)', () => {
    expect(countAfterParsed(null, 1990)).toBeNull();
    expect(countUntilParsed(null, 1990)).toBeNull();
    expect(countAfterParsed(parseYs(''), 1990)).toBeNull();
  });
});
