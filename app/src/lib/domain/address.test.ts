import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isMunicipio,
  isBizkaia,
  municipioRef,
  matchPortalExact,
  noraYear,
  yearAgreement,
  searchStreets,
  listPortals,
  portalBuildings,
  type NoraCalle,
  type NoraPortal
} from './address';
import type { Place } from './types';

const PLACE: Place = {
  slug: 'bilbao',
  cod: 20,
  name: 'Bilbao',
  lat: 43.263,
  lon: -2.935,
  bbox: [-3.09, 43.2, -2.85, 43.32],
  buildings: 100
};

function calle(id: string, mun: string | null, prov = '48'): NoraCalle {
  return {
    id,
    calleCod: 'c',
    descripcionCastellano: 'GRAN VIA',
    descripcionEuskera: 'GRAN VIA',
    descripcionBilingue: 'GRAN VIA',
    localidad: mun
      ? [
          {
            id: 'l',
            descripcionOficial: 'X',
            entidad: { municipio: { id: mun, idProvincia: prov, descripcionOficial: 'Y' } }
          }
        ]
      : undefined
  };
}

function portal(numero: string | null, bis: string | null = null, id = numero): NoraPortal {
  return {
    id: String(id),
    numero,
    bis,
    acepcion: null,
    bloque: null,
    codigoPostal: null,
    latETRS89: '43.26',
    lonETRS89: '-2.93'
  };
}

describe('R1 desambiguación por municipio canónico', () => {
  it('calles del mismo municipio (cod 020, prov 48) → mine', () => {
    expect(isMunicipio(calle('1', '020'), 20)).toBe(true);
    expect(isMunicipio(calle('1', '054'), 20)).toBe(false);
  });
  it('otra provincia → nunca Bizkaia', () => {
    expect(isBizkaia(calle('1', '020', '01'))).toBe(false);
    expect(isBizkaia(calle('1', '020', '48'))).toBe(true);
  });
  it('calle sin localidad → no se puede probar municipio → fuera', () => {
    expect(municipioRef(calle('1', null))).toBeNull();
    expect(isMunicipio(calle('1', null), 20)).toBe(false);
  });
});

describe('R2 matching exacto de portal (prefijo → filtro local)', () => {
  const ps = [
    portal('2', null, 'a'),
    portal('2A', null, 'b'),
    portal('2B', null, 'c'),
    portal('2C', null, 'd'),
    portal('20', null, 'e'),
    portal('22', null, 'f')
  ];
  it('«2» exacto distingue de 2A/2B/2C/20: variantes se muestran', () => {
    const { exact, siblings } = matchPortalExact(ps, '2');
    expect(exact.map((p) => p.numero)).toEqual(['2']);
    // las variantes del MISMO número base no se esconden — el usuario las ve
    expect(siblings.length).toBe(0); // numero '2' exacto; 2A tiene numero '2A'
  });
  it('«2A» exacto no colapsa a «2»', () => {
    const { exact } = matchPortalExact(ps, '2A');
    expect(exact.map((p) => p.numero)).toEqual(['2A']);
  });
  it('número inexistente → 0 exactos (NO_PORTALS, nunca elegir otro)', () => {
    const { exact } = matchPortalExact(ps, '7');
    expect(exact).toEqual([]);
  });
  it('bis se respeta como parte de la identidad', () => {
    const conBis = [portal('5', null, 'x'), portal('5', 'BIS', 'y')];
    // sin bis: 5 y 5BIS son ambiguos → ambos exactos (la UI los muestra, fail-closed)
    const { exact } = matchPortalExact(conBis, '5');
    expect(exact).toHaveLength(2);
    // con bis explícito: solo el portal bis coincide
    const exactBis = matchPortalExact(conBis, '5', 'BIS');
    expect(exactBis.exact).toHaveLength(1);
    expect(exactBis.exact[0].bis).toBe('BIS');
    expect(exactBis.siblings).toHaveLength(1);
    expect(exactBis.siblings[0].bis).toBeNull();
  });
});

describe('NORA fechaConstr (observación independiente, gate §3)', () => {
  it('parsea año de «1972-12-31 00:00:00»', () => {
    expect(noraYear('1972-12-31 00:00:00')).toBe(1972);
  });
  it('null/vacío/raro → null, nunca inventar', () => {
    expect(noraYear(null)).toBeNull();
    expect(noraYear('')).toBeNull();
    expect(noraYear('x')).toBeNull();
  });
});

describe('yearAgreement: discrepancia sin ganador', () => {
  it('ambos válidos e iguales → BOTH_EQUAL', () => {
    expect(yearAgreement(1972, 'VALID', 1972)).toBe('BOTH_EQUAL');
  });
  it('ambos válidos pero distintos → BOTH_DIFFER (mostrar los dos)', () => {
    expect(yearAgreement(1998, 'VALID', 2001)).toBe('BOTH_DIFFER');
  });
  it('catastro sin año válido no usa UNKNOWN como 0', () => {
    expect(yearAgreement(1998, 'UNKNOWN', null)).toBe('BOTH_UNKNOWN');
    expect(yearAgreement(null, 'VALID', 2001)).toBe('NORA_ONLY');
    expect(yearAgreement(1998, 'VALID', null)).toBe('CATASTRO_ONLY');
  });
});

describe('acceso NORA con fetch mock (contrato de endpoints)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockFetch(body: unknown, status = 200) {
    const f = vi.fn().mockResolvedValue(
      new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', f);
    return f;
  }

  it('searchStreets filtra local, no confía en descMunicipio (R1)', async () => {
    const f = mockFetch([
      calle('a', '020'), // Bilbao → mía
      calle('b', '054'), // Leioa → otra
      calle('c', null), // sin municipio → fuera
      calle('d', '001', '01') // Araba → fuera
    ]);
    const r = await searchStreets('gran via', PLACE);
    expect(f).toHaveBeenCalledOnce();
    expect(String(f.mock.calls[0][0])).toContain('/calles?');
    expect(r.mine.map((c) => c.id)).toEqual(['a']);
    expect(r.bizkaia).toBe(2); // a (020) + b (054) son Bizkaia
    expect(r.outside).toBe(2);
  });

  it('searchStreets 204 → lista vacía, no error (R3)', async () => {
    mockFetch(null, 204);
    const r = await searchStreets('inexistente', PLACE);
    expect(r.mine).toEqual([]);
    expect(r.bizkaia).toBe(0);
  });

  it('listPortals usa /calle/{id}/portales (endpoint canónico)', async () => {
    const f = mockFetch([portal('1'), portal('2')]);
    const ps = await listPortals('calle-42');
    expect(String(f.mock.calls[0][0])).toContain('/calle/calle-42/portales');
    expect(ps).toHaveLength(2);
  });

  it('portalBuildings normaliza objeto único → lista', async () => {
    mockFetch({ id: 'e1', tipo: 'res', estado: 'ok', fechaConstr: '1972-12-31 00:00:00' });
    const es = await portalBuildings('p-9');
    expect(es).toHaveLength(1);
    expect(noraYear(es[0].fechaConstr)).toBe(1972);
  });

  it('error de red/500 → throw (fail a NETWORK_ERROR en UI)', async () => {
    mockFetch({}, 500);
    await expect(listPortals('calle-x')).rejects.toThrow('nora 500');
  });
});
