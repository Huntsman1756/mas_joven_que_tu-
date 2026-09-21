/**
 * Locale de la interfaz (G13). `t()` lee `locale.lang` (reactivo) y cae a
 * `es` por clave ausente.
 *
 * EU existe como borrador asistido verificado estructuralmente
 * (`verify:eu`); no ha pasado revisión lingüística humana — ver
 * docs/UX_COPY.md §11 para el estado exacto. `AVAILABLE_LANGS` lista los
 * idiomas seleccionables; el selector se renderiza cuando hay más de uno.
 */
export type Lang = 'es' | 'eu';

export const locale = $state<{ lang: Lang }>({ lang: 'es' });

export const AVAILABLE_LANGS: { id: Lang; label: string }[] = [
  { id: 'es', label: 'ES' },
  { id: 'eu', label: 'EU' }
];
