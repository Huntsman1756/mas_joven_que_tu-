import { describe, expect, it } from 'vitest';
import { es } from './es';
import { eu } from './eu';

describe('correcciones editoriales concretas, no certificación nativa', () => {
  it('conserva el sujeto de la comparación y las acciones corregidas', () => {
    expect(eu['hero.title']).toBe('Zu baino gazteagoa');
    expect(eu['map.intro.title']).toContain('zu baino');
    expect(eu['story.back']).toBe('Itzuli nire Bizkaira');
    expect(eu['story.air']).toBe('Ikusi airetik');
  });
  it('el cálculo singular no representa una multiplicación', () => {
    for (const key of ['result.calc', 'result.calc.one']) {
      expect(eu[key]).toContain('{known} eraikinetatik');
      expect(eu[key]).toContain('zenbakitzailean');
      expect(eu[key]).toContain('izendatzailean');
      expect(eu[key]).not.toMatch(/[·×÷]/);
    }
  });
  it('preserva los identificadores reales de la fuente y el corte del hallazgo', () => {
    expect(eu['how.check.src']).toContain('«Edificio»');
    expect(eu['how.check.src']).toContain('Ano_Constr');
    for (const dict of [es, eu]) {
      for (const number of ['60', '70', '1979', '1,9'])
        expect(dict['story.f4036.concl']).toContain(number);
    }
  });
  it('distingue año nominal y vuelo también en las limitaciones', () => {
    expect(es['how.limits.ortho']).toContain('nominal');
    expect(es['how.limits.ortho']).toContain('vuelo');
    expect(eu['how.limits.ortho']).toContain('nominala');
    expect(eu['how.limits.ortho']).toContain('hegaldiaren');
  });
});
