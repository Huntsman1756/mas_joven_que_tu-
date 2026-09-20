import { describe, it, expect } from 'vitest';
import {
  fmt,
  fmtDec,
  fmtPct,
  fmtHa,
  fmtDateEs,
  fmtDateShortEs,
  fmtYearRange,
  fmtDecade,
  decadeName,
  relYearLabel,
  relYearShort,
  obsLabel,
  joinEs
} from './format';

// Contrato editorial (docs/EDITORIAL_STYLE.md): los formatos públicos se
// fijan aquí — ninguna vista puede improvisar otro estilo.
describe('formato editorial es-ES', () => {
  it('enteros con separador de miles', () => {
    expect(fmt(13738)).toBe('13.738');
    expect(fmt(4483)).toBe('4.483');
    expect(fmt(9)).toBe('9');
  });

  it('decimales con coma', () => {
    expect(fmtDec(80.5)).toBe('80,5');
    expect(fmtPct(59.9)).toBe('59,9');
    expect(fmtPct(100)).toBe('100');
    expect(fmtHa(805_000)).toBe('80,5');
  });

  it('fechas ISO nunca se muestran crudas', () => {
    expect(fmtDateEs('2026-08-04')).toBe('4 de agosto de 2026');
    expect(fmtDateEs('20250101')).toBe('1 de enero de 2025');
    expect(fmtDateShortEs('2025-01-01')).toBe('1 ene 2025');
    // literal no-fecha pasa tal cual (fail-open, nunca rompe la UI)
    expect(fmtDateEs('2025')).toBe('2025');
  });

  it('rangos de años completos con en dash', () => {
    expect(fmtYearRange(2000, 2009)).toBe('2000–2009');
    expect(fmtDecade(2000)).toBe('2000–2009');
    expect(fmtDecade('1990')).toBe('1990–1999');
    expect(fmtDecade('2000')).not.toContain('–9'); // regresión «2000–9»
  });

  it('nombres narrativos de década', () => {
    expect(decadeName(2000)).toBe('años 2000');
    expect(decadeName('1960')).toBe('años 1960');
  });

  it('etiquetas de observación según familia y literal de periodo', () => {
    const tr = (k: string, p?: Record<string, unknown>) =>
      k.replace(/^(place\.obs\.)/, '') + `:${p?.year ?? p?.month_year ?? ''}`;
    expect(obsLabel('censo', '1950', tr)).toBe('censo:1950');
    expect(obsLabel('padron', '20250101', tr)).toBe('padron:2025');
    expect(obsLabel('padron', '20220701', tr)).toBe('padron_month:julio de 2022');
  });

  it('distancia honesta al año personal', () => {
    const tr = (k: string, p?: Record<string, unknown>) => `${k}:${p?.n ?? ''}`;
    expect(relYearLabel(1977, 1979, tr)).toBe('photo.rel_before:2 años');
    expect(relYearLabel(1982, 1979, tr)).toBe('photo.rel_after:3 años');
    expect(relYearLabel(1979, 1979, tr)).toBe('photo.rel_exact:');
    expect(relYearLabel(1977, null, tr)).toBeNull();
    // variante corta para cards («2 años antes»)
    expect(relYearShort(1977, 1979, tr)).toBe('rel.short.before:2 años');
    expect(relYearShort(1979, 1979, tr)).toBe('rel.short.exact:');
    expect(relYearShort(1977, null, tr)).toBeNull();
  });

  it('enumeraciones naturales', () => {
    expect(joinEs(['a'])).toBe('a');
    expect(joinEs(['a', 'b'])).toBe('a y b');
    expect(joinEs(['a', 'b', 'c'])).toBe('a, b y c');
  });
});
