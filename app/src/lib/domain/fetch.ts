/**
 * Señal de fetch con timeout + cancelación externa combinadas.
 * `AbortSignal.any` requiere Chrome ≥116 / Safari ≥17.4 — en navegadores
 * anteriores (p.ej. Chrome 109 en Android emulado) no existe y lanzaría
 * TypeError, clasificando toda respuesta como error de servicio.
 * Fallback: AbortController + listeners equivalentes.
 */
export function timeoutSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([timeout, signal]);
  const ctrl = new AbortController();
  for (const s of [timeout, signal]) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      break;
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}
