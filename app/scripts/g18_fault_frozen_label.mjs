/**
 * Control negativo LOCAL de RT-13 — «texto congelado mientras el cabezal
 * avanza».
 *
 * 1) Corrida con `G18_FAULT=frozen_label`: un observer local congela el
 *    rótulo `.tc-year`. La comprobación en vivo `g18_now_follows_live`
 *    (igualdad DOM↔cabezal muestreada en el mismo instante) DEBE FALLAR y
 *    el script debe salir con exit≠0.
 * 2) Corrida normal posterior: exit=0 y todos los checks en true.
 *
 * La evidencia de la corrida con fallo va a su propio directorio
 * (evidence/g18-fault-frozen-label/) para no pisar la del gate.
 *
 * Uso: node scripts/g18_fault_frozen_label.mjs
 * Salida: ../evidence/g18-fault-frozen-label/report.json (exit 1 si un
 *         control no se cumple)
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), '..');
const SMOKE = join(process.cwd(), 'scripts', 'g18_timeplayer.mjs');
const FAULT_OUT = join(ROOT, 'evidence/g18-fault-frozen-label');
const NORMAL_OUT = join(ROOT, 'evidence/g18');

await mkdir(FAULT_OUT, { recursive: true });

function run(extraEnv) {
  const env = { ...process.env };
  delete env.G18_FAULT;
  delete env.G18_OUT;
  Object.assign(env, extraEnv);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [SMOKE], { env, encoding: 'utf8', timeout: 600000 });
  const outText = (r.stdout || '') + (r.stderr || '');
  return {
    exit: r.status,
    signal: r.signal ?? null,
    spawnError: r.error ? String(r.error) : null,
    seconds: Math.round((Date.now() - t0) / 1000),
    tail: outText.split('\n').slice(-6).join('\n').trim()
  };
}

const results = [];
const problems = [];

console.log('== 1) fallo inyectado: rótulo de año congelado (solo local) ==');
const fault = run({ G18_FAULT: 'frozen_label', G18_OUT: FAULT_OUT });
let faultChecks = {};
try {
  faultChecks = JSON.parse(await readFile(join(FAULT_OUT, 'checks.json'), 'utf8'));
} catch {
  problems.push('falta evidence/g18-fault-frozen-label/checks.json');
}
const liveFailed = faultChecks?.checks?.['g18_now_follows_live'] === false;
const pausedState = faultChecks?.checks?.['g18_now_follows'];
console.log(
  `frozen_label: exit=${fault.exit} signal=${fault.signal} spawnError=${fault.spawnError} · g18_now_follows_live=${faultChecks?.checks?.['g18_now_follows_live']} · (pausa) g18_now_follows=${pausedState}`
);
results.push({
  mode: 'frozen_label',
  exit: fault.exit,
  signal: fault.signal,
  spawnError: fault.spawnError,
  seconds: fault.seconds,
  live_check: faultChecks?.checks?.['g18_now_follows_live'],
  paused_check: pausedState,
  tail: fault.tail
});
if (fault.exit === 0) problems.push('la corrida con fallo salió con exit=0');
if (!liveFailed) problems.push('g18_now_follows_live NO detectó el texto congelado');

console.log('== 2) corrida normal posterior (debe volver a PASS) ==');
const normal = run({});
let normalChecks = {};
try {
  normalChecks = JSON.parse(await readFile(join(NORMAL_OUT, 'checks.json'), 'utf8'));
} catch {
  problems.push('falta evidence/g18/checks.json');
}
const falseChecks = Object.entries(normalChecks?.checks || {})
  .filter(([, v]) => v === false || String(v).startsWith('FAIL'))
  .map(([k]) => k);
console.log(
  `normal: exit=${normal.exit} · checks=${Object.keys(normalChecks?.checks || {}).length} · fails=${falseChecks.length} · live=${normalChecks?.checks?.['g18_now_follows_live']}`
);
results.push({
  mode: 'normal',
  exit: normal.exit,
  seconds: normal.seconds,
  checks: Object.keys(normalChecks?.checks || {}).length,
  failed: falseChecks,
  live_check: normalChecks?.checks?.['g18_now_follows_live'],
  tail: normal.tail
});
if (normal.exit !== 0) problems.push(`la corrida normal salió con exit=${normal.exit}`);
if (normalChecks?.checks?.['g18_now_follows_live'] !== true)
  problems.push('la corrida normal no tiene g18_now_follows_live=true');

const report = {
  utc: new Date().toISOString(),
  what: 'control negativo LOCAL de RT-13 (fallo inyectado en el harness, no en el producto)',
  results,
  problems
};
await writeFile(join(FAULT_OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log('→', join(FAULT_OUT, 'report.json'));
if (problems.length) {
  console.log('G18 FAULT CONTROL FAIL:', problems.join(' | '));
  process.exit(1);
}
console.log('G18 FAULT CONTROL PASS');
process.exit(0);
