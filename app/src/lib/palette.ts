/**
 * Paleta G5 (docs/g5/VISUAL-SYSTEM.md). Fuente única para los colores que
 * el código necesita como valor (MapLibre paint, canvas de hatch). Los
 * tokens CSS en +page.svelte replican estos valores para el chrome.
 */
export const PALETTE = {
  paper: '#f5f1e8',
  paper2: '#efe9dc',
  ink: '#191817',
  ink2: '#4a463f',
  ink3: '#655f54',
  accent: '#c9403b',
  accentDeep: '#8e2f2c',
  before: '#3f6f8e',
  after: '#c9403b',
  afterBoth: '#2f2c28',
  noyear: '#e2ded4',
  noyearStroke: '#7c7868',
  line: '#d8d2c4',
  warnBg: '#fbf0d8',
  warnLine: '#b07a1e',
  warnText: '#6b4d13',
  ramp: ['#ead9c0', '#e5b39b', '#dd9385', '#c9403b', '#8e2f2c'],
  muniLine: '#8a8474'
} as const;
