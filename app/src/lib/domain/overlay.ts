/**
 * MOB-R1 §2/§14 — política de overlays móviles: como mucho UN panel
 * pesado abierto a la vez. Los paneles ligeros (zoom, play, handle,
 * chips) no participan.
 */
export type MobileOverlay = 'edit' | 'cell' | 'campaigns' | 'layers' | 'info' | null;

/** Abrir un overlay distinto sustituye al anterior; reabrir el mismo lo cierra. */
export function nextOverlay(current: MobileOverlay, next: MobileOverlay): MobileOverlay {
  return next === null || next === current ? null : next;
}
