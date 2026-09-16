import { describe, it, expect } from 'vitest';
import { nearestCampaign, type Campaign } from './ortho';

const LIST: Campaign[] = [
  { year: 1956, source: 'bizkaia', flightRange: '1956-1957', verified: true },
  { year: 1983, source: 'bizkaia', flightRange: null, verified: true },
  { year: 1990, source: 'bizkaia', flightRange: null, verified: false },
  { year: 2002, source: 'bizkaia', flightRange: null, verified: true },
  { year: 2025, source: 'geoeuskadi', flightRange: '2025', verified: true },
];

describe('nearestCampaign (C-11)', () => {
  it('1987 → 1990 (no 1983)', () => {
    expect(nearestCampaign(LIST, 1987)?.year).toBe(1990);
  });
  it('empate → campaña anterior', () => {
    // 1986.5 empataría; usamos 1987 → 1990 (3) vs 1983 (4): gana 1990
    expect(nearestCampaign(LIST, 1986)?.year).toBe(1983);
  });
  it('extremos', () => {
    expect(nearestCampaign(LIST, 1900)?.year).toBe(1956);
    expect(nearestCampaign(LIST, 2026)?.year).toBe(2025);
  });
});
