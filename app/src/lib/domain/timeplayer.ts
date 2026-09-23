/**
 * G18-R — reproductor temporal de Evolución (un único control: play/pausa
 * + scrubber con ticks de década; el único marcador personal es un tick
 * sutil en el año elegido — la edad no es la interfaz).
 *
 * Dominio puro y determinista:
 *   - unidad semántica = AÑO registrado (`Ano_Constr`); la reproducción
 *     incorpora el stock ACTUAL por año de construcción — nunca reconstruye
 *     el parque histórico (regla evidence-first: CURRENT != HISTORICAL);
 *   - el ritmo hace el recorrido año elegido → actualidad en ~6–15 s sin
 *     quemar CPU: 1 año por tick (~7–13 actualizaciones/s).
 */

/** Límite inferior del eje: el mismo que la entrada de año del hero. */
export const AXIS_MIN = 1900;

/**
 * ms por año de reproducción: el recorrido completo birth→snapshot dura
 * ~6–15 s (140 ms/año de guía, acotado). Devuelve el intervalo del tick;
 * el componente avanza UN año por tick — nunca interpolación por frame.
 */
export function playbackTickMs(birth: number, snapshot: number): number {
  const span = Math.max(1, snapshot - birth);
  const total = Math.min(15000, Math.max(6000, span * 140));
  return total / span;
}

export function clampYear(y: number, snapshot: number, axisMin = AXIS_MIN): number {
  return Math.min(snapshot, Math.max(axisMin, Math.round(y)));
}
