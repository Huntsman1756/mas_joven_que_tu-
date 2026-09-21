/**
 * Paleta G11 (docs/gates/G11.md §tokens). Fuente única para los colores que
 * el código necesita como valor (MapLibre paint, canvas de hatch). Los
 * tokens CSS en +page.svelte replican estos valores para el chrome.
 * Contrastes verificados: evidence/g11/contrast.json.
 */
export const PALETTE = {
  paper: '#f7f8fa',
  paper2: '#eef1f4',
  surface: '#ffffff',
  ink: '#182631',
  ink2: '#52606d',
  ink3: '#5f6d79',
  accent: '#a8372a',
  accentDeep: '#8c2d21',
  before: '#52768e',
  after: '#c94f38',
  afterBoth: '#182631',
  noyear: '#d8dde2',
  noyearStroke: '#5b6874',
  line: '#dce2e7',
  warnBg: '#fdf3e0',
  warnLine: '#a86e14',
  warnText: '#5e4210',
  ramp: ['#e3e8ec', '#d8c2b6', '#c79a85', '#b5704f', '#a8372a'],
  muniLine: '#9aa5ad'
} as const;
