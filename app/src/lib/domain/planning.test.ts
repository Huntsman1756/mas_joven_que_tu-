import { describe, it, expect } from 'vitest';
import { resolveFacets, type PlanningFile } from './planning';

const FILE: PlanningFile = {
  cod: 20,
  v: 'planning_20260918',
  muni: null,
  ambitos: {
    '0': { n: 'AIS - IB - RM06 Ibarzaharra', t: 'au', c: 'Industrial' },
    '1': { n: 'UE - 05', t: 'ru', c: 'Vivienda densidad >75 viv/ha' }
  },
  ae: {
    '3': { id: 438, n: 'POLÍGONO INDUSTRIAL SARRIKOLA' }
  },
  b: {
    'b-urbano': [1, 100, [[1, 100]], [], []],
    'b-partial': [
      1,
      87,
      [
        [1, 87],
        [2, 13]
      ],
      [],
      []
    ],
    'b-ambito': [1, 100, [[2, 100]], [[0, 100]], []],
    'b-multi': [
      1,
      100,
      [],
      [
        [0, 60],
        [1, 40]
      ],
      []
    ],
    'b-ae': [1, 100, [], [], [[3, 55]]],
    'b-outside': [0, 0, [], [], []]
  }
};

describe('resolveFacets (G3-B, contratos P-07..P-09)', () => {
  it('edificio sin facets ⇒ not_covered', () => {
    expect(resolveFacets(FILE, 'no-existe')).toEqual({ kind: 'not_covered' });
  });

  it('clasif urbano 100 % ⇒ inside', () => {
    const r = resolveFacets(FILE, 'b-urbano');
    expect(r.kind).toBe('inside');
    if (r.kind === 'inside') {
      expect(r.clasif).toBe(1);
      expect(r.clasifShare).toBe(100);
      expect(r.usos[0]).toEqual({ uso: 1, share: 100 });
    }
  });

  it('huella a caballo conserva share <100 (honestidad de borde)', () => {
    const r = resolveFacets(FILE, 'b-partial');
    if (r.kind !== 'inside') throw new Error('expected inside');
    expect(r.clasifShare).toBe(87);
    expect(r.usos).toHaveLength(2);
  });

  it('un ámbito ⇒ inside con ref oficial', () => {
    const r = resolveFacets(FILE, 'b-ambito');
    if (r.kind !== 'inside') throw new Error('expected inside');
    expect(r.ambitos[0].ref.n).toBe('AIS - IB - RM06 Ibarzaharra');
    expect(r.ambitos[0].ref.t).toBe('au');
  });

  it('varios ámbitos ⇒ multiple_ambito, nunca elige uno', () => {
    const r = resolveFacets(FILE, 'b-multi');
    expect(r.kind).toBe('multiple_ambito');
    if (r.kind === 'multiple_ambito') expect(r.ambitos).toHaveLength(2);
  });

  it('solape AE devuelve la referencia oficial', () => {
    const r = resolveFacets(FILE, 'b-ae');
    if (r.kind !== 'inside') throw new Error('expected inside');
    expect(r.ae[0].ref.n).toBe('POLÍGONO INDUSTRIAL SARRIKOLA');
    expect(r.ae[0].share).toBe(55);
  });

  it('sin ningún facet ⇒ outside', () => {
    expect(resolveFacets(FILE, 'b-outside')).toEqual({ kind: 'outside' });
  });
});
