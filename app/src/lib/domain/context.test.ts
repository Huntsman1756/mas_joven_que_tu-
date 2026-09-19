import { describe, it, expect } from 'vitest';
import { resolveContext, type ContextFile } from './context';

/**
 * G3-D — contratos DATA_SEMANTICS §18 (R-01..R-03):
 *  - bandas por periodo preservadas (MULTIPLE nunca se colapsa)
 *  - NOT_MAPPED ≠ 0 dB; paradas ordenadas por distancia, índice propio
 *  - montes múltiples listados; fechas «null» literales ⇒ «no consta»
 */

const FILE: ContextFile = {
  cod: 20,
  v: 'context_20260919',
  stops: {
    '3': { id: '4035', n: 'Parada Tres', r: ['A3641'] },
    '7': { id: '2100', n: 'Parada Siete', r: ['A2151', 'A2152'] }
  },
  montes: {
    '1': {
      n: 'MONTE UNO',
      p: 'AYTO EJEMPLO',
      fd: '01/01/1950',
      fc: 'null',
      fa: 'null'
    },
    '5': { n: 'MONTE DOS', p: 'null', fd: 'null', fc: 'null', fa: 'null' }
  },
  b: {
    // mapeado en D/T, MULTIPLE en N, con paradas y dentro de un monte
    full: [
      [[55, 60]],
      [[60, 65]],
      [
        [55, 60],
        [60, 65]
      ],
      [
        [3, 120],
        [7, 380]
      ],
      [1]
    ],
    // solo paradas
    stops_only: [[], [], [], [[7, 50]], []],
    // solo monte, MULTIPLE (dos montes)
    monte_multi: [[], [], [], [], [1, 5]],
    // facet presente pero vacío (equivale a no tener facet)
    empty: [[], [], [], [], []]
  }
};

describe('resolveContext — ruido (R-01)', () => {
  it('MAPPED conserva bandas por periodo y MULTIPLE no se colapsa', () => {
    const r = resolveContext(FILE, 'full');
    expect(r.kind).toBe('resolved');
    if (r.kind !== 'resolved') return;
    expect(r.noise.state).toBe('mapped');
    expect(r.noise.d.bands).toEqual([[55, 60]]);
    expect(r.noise.t.bands).toEqual([[60, 65]]);
    // dos bandas en noche: se conservan las dos, nunca se elige «la peor»
    expect(r.noise.n.bands).toEqual([
      [55, 60],
      [60, 65]
    ]);
  });

  it('NOT_MAPPED cuando el municipio tiene isófonas pero el punto no', () => {
    const r = resolveContext(FILE, 'stops_only');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.noise.state).toBe('not_mapped');
    expect(r.noise.d.bands).toEqual([]);
  });

  it('no_coverage cuando el municipio no referencia ninguna isófona', () => {
    const quiet: ContextFile = { ...FILE, b: { x: [[], [], [], [[7, 10]], []] } };
    const r = resolveContext(quiet, 'x');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.noise.state).toBe('no_coverage');
  });

  it('edificio sin facet ⇒ negativo oficial en los tres módulos', () => {
    const r = resolveContext(FILE, 'missing_building');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.noise.state).toBe('not_mapped');
    expect(r.mobility.state).toBe('no_nearby_stop');
    expect(r.mountain.state).toBe('outside');
  });
});

describe('resolveContext — movilidad (R-02)', () => {
  it('paradas ordenadas por distancia con ref e índice de capa', () => {
    const r = resolveContext(FILE, 'full');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mobility.state).toBe('available');
    expect(r.mobility.stops.map((s) => s.i)).toEqual([3, 7]);
    expect(r.mobility.stops[0]).toMatchObject({ dist_m: 120 });
    expect(r.mobility.stops[0].ref.id).toBe('4035');
    expect(r.mobility.stops[1].ref.r).toEqual(['A2151', 'A2152']);
  });

  it('no_nearby_stop es un estado explícito, no una omisión', () => {
    const r = resolveContext(FILE, 'monte_multi');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mobility.state).toBe('no_nearby_stop');
    expect(r.mobility.stops).toEqual([]);
  });

  it('índice de parada sin ref conocida se descarta (fail-closed)', () => {
    const f: ContextFile = { ...FILE, b: { x: [[], [], [], [[99, 10]], []] } };
    const r = resolveContext(f, 'x');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mobility.state).toBe('no_nearby_stop');
  });
});

describe('resolveContext — monte público (R-03)', () => {
  it('INSIDE con metadatos; «null» de fuente ⇒ null («no consta»)', () => {
    const r = resolveContext(FILE, 'full');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mountain.state).toBe('inside');
    expect(r.mountain.montes).toHaveLength(1);
    expect(r.mountain.montes[0].ref.n).toBe('MONTE UNO');
    expect(r.mountain.montes[0].ref.fd).toBe('01/01/1950');
    expect(r.mountain.montes[0].ref.fc).toBeNull();
    expect(r.mountain.montes[0].ref.fa).toBeNull();
  });

  it('MULTIPLE lista todos los montes, nunca elige uno', () => {
    const r = resolveContext(FILE, 'monte_multi');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mountain.state).toBe('multiple');
    expect(r.mountain.montes.map((m) => m.ref.n)).toEqual(['MONTE UNO', 'MONTE DOS']);
    expect(r.mountain.montes[1].ref.p).toBeNull();
  });

  it('outside cuando el municipio tiene montes pero el punto no', () => {
    const r = resolveContext(FILE, 'stops_only');
    if (r.kind !== 'resolved') throw new Error('expected resolved');
    expect(r.mountain.state).toBe('outside');
  });
});
