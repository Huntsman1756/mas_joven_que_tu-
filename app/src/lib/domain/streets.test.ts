import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadStreets, matchStreets, type StreetEntry } from './streets';

// Forma real del callejero EUSTAT: nombre + «(Tipo)» en ambos idiomas.
const OGONO: StreetEntry = { i: '1', e: 'Ogoño (Calle)', u: 'Ogoño (Kalea)', bis: false, n: 1 };
const MAYOR: StreetEntry = { i: '2', e: 'Mayor (Calle)', u: 'Mayor (Kalea)', bis: true, n: 30 };
const ARENAL: StreetEntry = {
  i: '3',
  e: 'Arenal (Paseo)',
  u: 'Areatza (Pasealekua)',
  bis: false,
  n: 9
};
const STREETS = [OGONO, MAYOR, ARENAL];

describe('matchStreets', () => {
  it('acepta el nombre solo, con o sin tilde', () => {
    for (const q of ['ogono', 'Ogoño', 'OGOÑO']) {
      const ms = matchStreets(q, STREETS);
      expect(ms.map((m) => m.entry.i)).toContain('1');
      expect(ms.every((m) => m.kind === 'exact')).toBe(true);
    }
  });

  it('acepta el orden habitual «tipo + nombre» en ambos idiomas', () => {
    for (const q of ['Calle Ogoño', 'calle ogono', 'Kalea Ogoño', 'kalea ogono']) {
      const ms = matchStreets(q, STREETS);
      expect(ms.map((m) => m.entry.i)).toContain('1');
      expect(ms.every((m) => m.kind === 'exact')).toBe(true);
    }
  });

  it('acepta el orden «nombre + tipo»', () => {
    for (const q of ['Ogoño Calle', 'ogono kalea']) {
      const ms = matchStreets(q, STREETS);
      expect(ms.map((m) => m.entry.i)).toContain('1');
      expect(ms.every((m) => m.kind === 'exact')).toBe(true);
    }
  });

  it('casa el nombre extendido tal cual', () => {
    const ms = matchStreets('Ogoño (Calle)', STREETS);
    expect(ms[0].entry.i).toBe('1');
    expect(ms[0].kind).toBe('exact');
  });

  it('cruza idiomas: el tipo castellano con el nombre euskera y viceversa', () => {
    // «Paseo Areatza»: el nombre EU con el tipo ES ya registrado como variante
    const ms = matchStreets('Pasealekua Areatza', STREETS);
    expect(ms.map((m) => m.entry.i)).toContain('3');
  });

  it('el casi-match se ofrece, nunca se autoselecciona (kind=near)', () => {
    const ms = matchStreets('ogonoo', STREETS);
    expect(ms.map((m) => m.entry.i)).toContain('1');
    expect(ms.every((m) => m.kind === 'near')).toBe(true);
  });

  it('casi-match también con el tipo delante («Calle Ogonoo»)', () => {
    const ms = matchStreets('Calle Ogonoo', STREETS);
    expect(ms.map((m) => m.entry.i)).toContain('1');
    expect(ms.every((m) => m.kind === 'near')).toBe(true);
  });

  it('el tipo de vía solo no casa nada (no es nombre)', () => {
    expect(matchStreets('calle', STREETS)).toHaveLength(0);
  });

  it('consulta corta no produce casi-matches', () => {
    expect(matchStreets('og', STREETS)).toHaveLength(0); // <3 → []
    expect(matchStreets('ogo', STREETS).map((m) => m.entry.i)).toContain('1'); // prefijo exacto
    expect(matchStreets('zzz', STREETS)).toHaveLength(0);
  });

  it('sin coincidencias devuelve lista vacía', () => {
    expect(matchStreets('zzzzzzzz', STREETS)).toHaveLength(0);
  });
});

describe('loadStreets — un HTTP 200 no basta (esquema en la frontera)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = (body: unknown, status = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status }))
    );

  it('rechaza un cuerpo {} aunque el HTTP sea 200', async () => {
    stub({});
    await expect(loadStreets('bad-empty')).rejects.toThrow('streets schema');
  });

  it('rechaza entradas mal formadas', async () => {
    stub({ v: 1, mun: 'X', streets: [{ i: 7 }] });
    await expect(loadStreets('bad-entry')).rejects.toThrow('streets schema');
  });

  it('un payload válido resuelve las entradas', async () => {
    stub({ v: 1, mun: 'X', streets: [OGONO] });
    await expect(loadStreets('ok-mun')).resolves.toEqual([OGONO]);
  });

  it('un fallo no se cachea: el siguiente intento reintenta la descarga', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ v: 1, mun: 'X', streets: [OGONO] }), { status: 200 })
      );
    vi.stubGlobal('fetch', f);
    await expect(loadStreets('retry-mun')).rejects.toThrow();
    await expect(loadStreets('retry-mun')).resolves.toEqual([OGONO]);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
