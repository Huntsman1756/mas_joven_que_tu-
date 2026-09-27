/**
 * Controles negativos del smoke de lanzamiento (SOLO LOCAL).
 *
 * Para cada fallo inyectado demuestra:
 *   1) qué fallo se introdujo,
 *   2) qué aserto del smoke lo detectó (primer check en FAIL),
 *   3) qué exit code produjo la corrida con fallo (debe ser ≠ 0),
 *   4) que la ejecución NORMAL posterior vuelve a salir 0.
 *
 * Inyección (solo sobre build local y servidor local; nunca contra
 * producción): LAUNCH_FAULT en scripts/launch_browser_smoke.mjs.
 *   cta_missing    → el CTA de activación de FOTOS no es utilizable (CSS)
 *   place_noop     → el commit del cambio de lugar no aplica (commitSearch)
 *   raster_blocked → teselas de ortofoto abortadas (interceptación local)
 *   metrics_blocked→ el resultado obligatorio nunca aparece (JSON bloqueado)
 *
 * Uso: node scripts/launch_smoke_faults.mjs
 * Salida: ../evidence/launch-qa/launch-faults.json  (exit 1 si un control no
 *         se detecta o si la corrida normal posterior no vuelve a PASS)
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), '..');
const OUT = process.env.LAUNCH_OUT || join(ROOT, 'evidence/launch-qa');
const SMOKE = join(process.cwd(), 'scripts', 'launch_browser_smoke.mjs');
const FAULTS = ['cta_missing', 'place_noop', 'raster_blocked', 'metrics_blocked'];

await mkdir(OUT, { recursive: true });

async function runSmoke(extraEnv, label) {
  const env = { ...process.env, LAUNCH_ENGINES: 'chromium' };
  delete env.LAUNCH_FAULT;
  Object.assign(env, extraEnv);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [SMOKE], { env, encoding: 'utf8', timeout: 300000 });
  const stdout = (r.stdout || '') + (r.stderr || '');
  const m = /run → (.+)/.exec(stdout);
  const file = m ? m[1].trim() : null;
  let detail = null;
  if (file) {
    try {
      detail = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      /* sin detalle */
    }
  }
  const failed = detail
    ? Object.entries(detail.engines || {}).flatMap(([n, e]) => e.failed.map((f) => `${n}:${f}`))
    : [];
  return {
    label,
    fault: extraEnv.LAUNCH_FAULT || null,
    exit: r.status,
    seconds: Math.round((Date.now() - t0) / 1000),
    run_file: file ? file.split(/[\\/]/).slice(-1)[0] : null,
    run_pass: detail ? detail.pass : null,
    failed,
    first_failed: failed[0] || null,
    tail: stdout.split('\n').slice(-6).join('\n').trim()
  };
}

const results = [];
const problems = [];

console.log('== controles negativos (la corrida DEBE fallar) ==');
for (const f of FAULTS) {
  const r = await runSmoke({ LAUNCH_FAULT: f }, `fault:${f}`);
  results.push(r);
  const detected = r.exit !== 0 && !!r.first_failed;
  console.log(
    `${detected ? 'ok  ' : 'FAIL'} ${f}: exit=${r.exit} aserto="${r.first_failed}" (${r.seconds}s)`
  );
  if (!detected) problems.push(`${f}: exit=${r.exit} first_failed=${r.first_failed}`);
}

console.log('== corrida normal posterior (debe volver a PASS) ==');
const normal = await runSmoke({}, 'normal-post-faults');
results.push(normal);
const normalOk = normal.exit === 0 && normal.failed.length === 0;
console.log(
  `${normalOk ? 'ok  ' : 'FAIL'} normal: exit=${normal.exit} failed=${normal.failed.join(',')}`
);
if (!normalOk) problems.push(`normal: exit=${normal.exit} failed=${normal.failed.join(',')}`);

const report = {
  utc: new Date().toISOString(),
  what: 'controles negativos locales del launch smoke (fallo inyectado en el harness, no en producción)',
  faults_injected: FAULTS,
  results,
  problems
};
await writeFile(join(OUT, 'launch-faults.json'), JSON.stringify(report, null, 1));
console.log('→', join(OUT, 'launch-faults.json'));
if (problems.length) {
  console.log('FAULT CONTROLS FAIL:', problems.join(' | '));
  process.exit(1);
}
console.log('FAULT CONTROLS PASS');
process.exit(0);
