/**
 * Señal de fetch con timeout + cancelación externa combinadas.
 * `AbortSignal.timeout` requiere Chrome ≥103 / Safari ≥16 / Firefox ≥100
 * y `AbortSignal.any` Chrome ≥116 / Safari ≥17.4 — en navegadores
 * anteriores (p.ej. Chrome 109 en Android emulado) lanzarían TypeError,
 * clasificando toda respuesta como error de servicio.
 * Fallback: AbortController + listeners equivalentes (misma semántica:
 * abort con DOMException 'TimeoutError' y propagación de la externa).
 */
function legacyTimeout(timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();
  const id = setTimeout(
    () => ctrl.abort(new DOMException('Se agotó el tiempo', 'TimeoutError')),
    timeoutMs
  );
  ctrl.signal.addEventListener('abort', () => clearTimeout(id), { once: true });
  return ctrl.signal;
}

export function timeoutSignal(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout =
    typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : legacyTimeout(timeoutMs);
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
