/**
 * G18 — reproductor temporal de Evolución (un único control: play/pausa +
 * scrubber + hitos personales, modelo de interacción tipo Google Earth sin
 * copiar su estética).
 *
 * Dominio puro y determinista:
 *   - unidad semántica = AÑO registrado (`Ano_Constr`); la reproducción
 *     incorpora el stock ACTUAL por año de construcción — nunca reconstruye
 *     el parque histórico (regla evidence-first: CURRENT != HISTORICAL);
 *   - los hitos son derivados del año personal: nacimiento, edades
 *     señaladas, actualidad del snapshot;
 *   - el ritmo hace el recorrido nacimiento → actualidad en ~6–15 s sin
 *     quemar CPU: 1 año por tick (~7–13 actualizaciones/s).
 */

/** Límite inferior del eje: el mismo que la entrada de año del hero. */
export const AXIS_MIN = 1900;

/** Edades señaladas del relato personal (orden ascendente). */
export const MILESTONE_AGES = [10, 18, 30, 50] as const;

export interface Milestone {
  year: number;
  kind: 'birth' | 'age' | 'today';
  /** edad cumplida en ese hito (0 en nacimiento; la edad alcanzada en 'today') */
  age: number | null;
}

export function ageAt(birth: number, year: number): number {
  return year - birth;
}

/**
 * Hitos dentro del intervalo [birth, snapshot]: nacimiento, las edades
 * señaladas que quepan y la actualidad. Un hito `> snapshot` no existe
 * (el futuro no se afirma); si `snapshot === birth` solo hay nacimiento.
 */
export function milestones(birth: number, snapshot: number): Milestone[] {
  const out: Milestone[] = [{ year: birth, kind: 'birth', age: 0 }];
  for (const a of MILESTONE_AGES) {
    const y = birth + a;
    if (y > birth && y < snapshot) out.push({ year: y, kind: 'age', age: a });
  }
  if (snapshot > birth) {
    out.push({ year: snapshot, kind: 'today', age: snapshot - birth });
  }
  return out;
}

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
