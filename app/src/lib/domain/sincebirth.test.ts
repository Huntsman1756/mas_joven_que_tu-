import { describe, it, expect } from 'vitest';
import {
  resolvePopulationObs,
  resolveHousingObs,
  cellHotspots,
  type PopulationEntry
} from './sincebirth';

const CENSUS_PERIODS = ['1900', '1981', '1986', '1991', '1996', '2001'];
const PADRON_PERIODS = ['20010101', '20020101', '20030101', '20220701', '20250101'];
const HOUSING_PERIODS = ['1991', '1996', '2001', '2006', '2011', '2016', '2021'];

const ENTRY: PopulationEntry = {
  census: { '1900': 1936, '1981': 6511, '1986': 7060, '1991': 7008, '1996': 6806, '2001': 6843 },
  padron_series: {
    '20010101': 6780,
    '20020101': 6885,
    '20030101': 6897,
    '20220701': 7718,
    '20250101': 7800
  },
  housing: {
    total: { '1991': 2315, '2001': 2501, '2021': 3592 },
    principal: { '1991': 1955, '2001': 2199, '2021': 3047 },
    desocupada: { '1991': 351, '2001': 291, '2021': null }
  }
};

describe('resolvePopulationObs (G6-F)', () => {
  it('nacimiento 1987 → censo 1986 (observación real más próxima)', () => {
    const o = resolvePopulationObs(ENTRY, CENSUS_PERIODS, PADRON_PERIODS, 1987);
    expect(o).toMatchObject({
      year: 1986,
      population: 7060,
      family: 'censo',
      exact: false,
      delta_years: 1
    });
  });

  it('nacimiento 2003 → padrón 20030101 exacto', () => {
    const o = resolvePopulationObs(ENTRY, CENSUS_PERIODS, PADRON_PERIODS, 2003);
    expect(o).toMatchObject({ year: 2003, population: 6897, family: 'padron', exact: true });
  });

  it('mismo año en censo y padrón → gana padrón', () => {
    const o = resolvePopulationObs(ENTRY, CENSUS_PERIODS, PADRON_PERIODS, 2001);
    expect(o?.family).toBe('padron');
    expect(o?.population).toBe(6780);
  });

  it('empate de distancia → observación anterior', () => {
    // 1988.5 sería empate 1986/1991; con 1988: d(1986)=2 < d(1991)=3 → 1986.
    // Empate real: 1998.5 no existe; probar con periods '1990','1996' y year 1993.
    const e: PopulationEntry = { census: { '1990': 100, '1996': 200 } };
    const o = resolvePopulationObs(e, ['1990', '1996'], [], 1993);
    expect(o?.year).toBe(1990);
  });

  it('año anterior a toda observación → la primera disponible', () => {
    const o = resolvePopulationObs(ENTRY, CENSUS_PERIODS, PADRON_PERIODS, 1890);
    expect(o?.year).toBe(1900);
    expect(o?.exact).toBe(false);
  });

  it('null en fuente nunca se usa como observación', () => {
    const e: PopulationEntry = { census: { '1986': null, '1991': 5000 } };
    const o = resolvePopulationObs(e, ['1986', '1991'], [], 1987);
    expect(o?.year).toBe(1991);
  });

  it('sin datos → null', () => {
    expect(resolvePopulationObs({ census: {} }, ['1986'], [], 1987)).toBeNull();
  });
});

describe('resolveHousingObs (G6-G)', () => {
  it('nacimiento 1987 → censo de vivienda 1991', () => {
    const o = resolveHousingObs(ENTRY, HOUSING_PERIODS, 1987);
    expect(o).toMatchObject({ year: 1991, total: 2315, principal: 1955, exact: false });
  });

  it('nulls de «desocupada» no afectan al total', () => {
    const o = resolveHousingObs(ENTRY, HOUSING_PERIODS, 2021);
    expect(o?.total).toBe(3592);
  });

  it('sin serie → null', () => {
    expect(resolveHousingObs({}, HOUSING_PERIODS, 1987)).toBeNull();
  });
});

describe('cellHotspots (G6-I)', () => {
  const M = new Map([
    [1, { ys: '1980:1,1990:5,2000:4', ya: '1990:300,2000:200', lon: -2.99, lat: 43.33 }],
    [2, { ys: '1990:3,2010:2', ya: '1990:100,2010:80', lon: -2.991, lat: 43.331 }], // ~90 m de la 1
    [3, { ys: '2005:1', ya: '2005:60', lon: -3.1, lat: 43.4 }], // < min count
    [4, { ys: '1950:2,1995:8', ya: '1995:900', lon: -3.2, lat: 43.2 }],
    [5, { ys: null, ya: null, lon: -3.0, lat: 43.3 }], // sin serie
    [6, { ys: '2000:4', ya: '2000:300', lon: null, lat: null }] // sin centroide
  ]);

  it('cuenta solo edificios posteriores a Y, mínimo 2', () => {
    const hs = cellHotspots(M, 1987, 5);
    // fid4 (8 post-1987) primero; fid1 (9: 1990+2000) primero en realidad
    expect(hs.map((h) => h.fid)).toEqual([1, 4]); // fid2 se funde con fid1 (<800 m)
    expect(hs[0].count).toBe(9);
  });

  it('celdas vecinas se funden en una sola zona', () => {
    const hs = cellHotspots(M, 1987, 5);
    expect(hs.find((h) => h.fid === 2)).toBeUndefined();
  });

  it('sin serie o sin centroide → excluidas', () => {
    const hs = cellHotspots(M, 1900, 10);
    expect(hs.map((h) => h.fid)).not.toContain(5);
    expect(hs.map((h) => h.fid)).not.toContain(6);
  });

  it('año posterior a todo → lista vacía (no ruido)', () => {
    expect(cellHotspots(M, 2020)).toEqual([]);
  });
});
