/**
 * Ejecutor de controles negativos del launch smoke (SOLO LOCAL).
 * Raíz: `scripts/launch_smoke_faults.mjs` — punto de entrada ÚNICO, con rutas
 * y cwd explícitos (se puede lanzar desde cualquier directorio).
 *
 * Para cada fallo inyectado exige, en ESTE orden:
 *   1) el escenario se ejecutó de verdad (los checks previos al fallo están
 *      en verde en el informe de ESTA corrida);
 *   2) el informe existe, es fresco (mtime + `utc` dentro de la ventana de
 *      esta ejecución) **y pertenece a ESTA corrida**: cada hijo recibe un
 *      `LAUNCH_RUN_ID` único que el smoke registra en su informe
 *      (`run_id`); un informe sin identificador, con identificador distinto
 *      o de otra ejecución se rechaza — la fecha es comprobación adicional,
 *      no sustituto de identidad;
 *   3) exit code del smoke == 1 (contrato del smoke: 1 = checks fallidos);
 *      exit 2/null (sintaxis, puerto, navegador, timeout de proceso) = fallo
 *      de infraestructura → el ejecutor FALLA, no lo celebra;
 *   4) el aserto esperado de ese defecto figura entre los fallidos;
 *   5) se ejecutaron pruebas (>0).
 * Después: escenario NORMAL que debe salir 0 con TODOS los checks
 * obligatorios presentes y en verde.
 *
 * El ejecutor sale ≠0 si: faltan corridas obligatorias, alguna no ejecutó
 * pruebas, falta un informe, un fallo no fue detectado por su aserto, o el
 * escenario normal no pasa.
 *
 * Inyección (harness local, nunca producción): LAUNCH_FAULT en
 * `app/scripts/launch_browser_smoke.mjs` —
 *   cta_missing | place_noop | raster_blocked | metrics_blocked.
 *
 * Uso:  node scripts/launch_smoke_faults.mjs
 * Evidencia: evidence/red-team-2026/launch-faults-<utc>.json (UNA por
 *            ejecución; no sobrescribe la de rondas anteriores).
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');
const APP = join(REPO, 'app');
const SMOKE = join(APP, 'scripts', 'launch_browser_smoke.mjs');
const OUT = join(REPO, 'evidence', 'red-team-2026');

/** Checks previos al fallo que deben estar en verde (el escenario corrió). */
const SPECS = {
  cta_missing: {
    expectFail: 'fotos_cta_activacion_visible',
    mustPass: [
      'hero_visible',
      'resultado_headline',
      'mapa_canvas_presente',
      'fotos_intencion_estado_inicial'
    ]
  },
  place_noop: {
    expectFail: 'cambio_lugar_estado_getxo',
    mustPass: [
      'hero_visible',
      'resultado_headline',
      'mapa_canvas_presente',
      'fotos_intencion_estado_inicial',
      'fotos_cta_activacion_visible'
    ]
  },
  raster_blocked: {
    expectFail: 'fotos_cobertura_sonda',
    mustPass: [
      'hero_visible',
      'resultado_headline',
      'mapa_canvas_presente',
      'fotos_intencion_estado_inicial',
      'fotos_cta_activacion_visible',
      'fotos_intencion_registrada',
      'fotos_url_con_ortho',
      'fotos_peticion_orto'
    ]
  },
  metrics_blocked: {
    expectFail: 'resultado_headline',
    mustPass: ['hero_visible']
  }
};

/** Checks obligatorios de una corrida NORMAL completa. */
const NORMAL_REQUIRED = [
  'hero_visible',
  'resultado_headline',
  'mapa_canvas_presente',
  'fotos_intencion_estado_inicial',
  'fotos_cta_activacion_visible',
  'fotos_intencion_registrada',
  'fotos_url_con_ortho',
  'fotos_cobertura_sonda',
  'fotos_contenido_render',
  'fotos_peticion_orto',
  'fotos_respuesta_imagen_200',
  'cambio_lugar_estado_getxo',
  'cambio_lugar_url',
  'cambio_lugar_copy_getxo',
  'sin_pageerrors'
];

const problems = [];
const results = [];

async function runSmoke(label, extraEnv) {
  const env = { ...process.env, LAUNCH_ENGINES: 'chromium' };
  delete env.LAUNCH_FAULT;
  delete env.LAUNCH_OUT;
  delete env.LAUNCH_RUN_ID;
  const runId = randomUUID();
  env.LAUNCH_RUN_ID = runId;
  Object.assign(env, extraEnv);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [SMOKE], {
    env,
    cwd: APP, // cwd explícito: el smoke resuelve build/ y evidence/ desde aquí
    encoding: 'utf8',
    timeout: 300000
  });
  const stdout = (r.stdout || '') + (r.stderr || '');
  const m = /run → (.+)/.exec(stdout);
  const runFile = m ? m[1].trim() : null;

  let detail = null;
  let mtime = null;
  if (runFile) {
    try {
      const st = await stat(runFile);
      mtime = st.mtimeMs;
      detail = JSON.parse(await readFile(runFile, 'utf8'));
    } catch {
      /* informe ilegible = ausente para efectos prácticos */
    }
  }
  const checks = detail
    ? Object.fromEntries(
        Object.entries(detail.engines || {}).flatMap(([n, e]) =>
          Object.entries(e.checks || {}).map(([k, v]) => [`${n}:${k}`, v.ok === true])
        )
      )
    : {};
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  const passed = Object.entries(checks)
    .filter(([, ok]) => ok)
    .map(([k]) => k);
  const ageMs = mtime === null ? null : Date.now() - mtime;
  const utcMs = detail?.utc ? Date.parse(detail.utc) : NaN;
  return {
    label,
    fault: extraEnv.LAUNCH_FAULT || null,
    exit: r.status,
    seconds: Math.round((Date.now() - t0) / 1000),
    t0,
    run_file: runFile,
    run_file_base: runFile ? runFile.split(/[\\/]/).slice(-1)[0] : null,
    expected_run_id: runId,
    report_run_id: detail?.run_id ?? null,
    report_exists: !!detail,
    report_age_ms: ageMs,
    report_utc_fresh: Number.isFinite(utcMs) && Math.abs(utcMs - t0) < 15 * 60 * 1000,
    checks_total: Object.keys(checks).length,
    checks,
    failed,
    passed,
    tail: stdout.split('\n').slice(-5).join('\n').trim()
  };
}

/** Identidad: el informe debe pertenecer a ESTA ejecución hija. */
function whyRunId(r) {
  if (!r.report_exists) return [];
  if (!r.report_run_id) return ['informe sin run_id: no acredita pertenecer a esta ejecución'];
  if (r.report_run_id !== r.expected_run_id)
    return [`run_id ajeno (${r.report_run_id} ≠ ${r.expected_run_id}): informe de otra ejecución`];
  return [];
}

/** Valida la corrida de un fallo contra su spec. */
function judgeFault(spec, r) {
  const why = [];
  if (r.exit === null) why.push(`el smoke no terminó (signal/timeout) → infraestructura`);
  else if (r.exit !== 1)
    why.push(`exit=${r.exit} (se exige 1: checks fallidos; 2/null = infraestructura)`);
  if (!r.report_exists) why.push('informe ausente o ilegible (¿crash antes de escribir?)');
  why.push(...whyRunId(r));
  if (r.report_exists && (r.report_age_ms === null || r.report_age_ms < 0 || r.report_age_ms > 15 * 60 * 1000))
    why.push(`informe no fresco (age=${r.report_age_ms} ms)`);
  if (r.report_exists && !r.report_utc_fresh) why.push('utc del informe fuera de la ventana de esta corrida');
  if (r.checks_total === 0) why.push('cero pruebas ejecutadas en el informe');
  for (const k of spec.mustPass) {
    if (r.checks[`chromium:${k}`] !== true)
      why.push(`escenario no ejecutado: ${k} no está en verde`);
  }
  if (!r.failed.includes(`chromium:${spec.expectFail}`))
    why.push(
      `el aserto esperado «${spec.expectFail}» NO figura entre los fallidos (fallaron: ${r.failed.join(', ') || 'ninguno'})`
    );
  return why;
}

/** Valida la corrida normal (misma exigencia que en la batería). */
function judgeNormal(n) {
  const why = [];
  if (n.exit !== 0) why.push(`exit=${n.exit} (se exige 0)`);
  if (!n.report_exists) why.push('informe ausente o ilegible');
  why.push(...whyRunId(n));
  if (n.report_exists && (n.report_age_ms === null || n.report_age_ms > 15 * 60 * 1000))
    why.push(`informe no fresco (age=${n.report_age_ms} ms)`);
  if (n.report_exists && !n.report_utc_fresh) why.push('utc del informe fuera de la ventana de esta corrida');
  if (n.checks_total === 0) why.push('cero pruebas ejecutadas');
  for (const k of NORMAL_REQUIRED) {
    if (n.checks[`chromium:${k}`] !== true) why.push(`check obligatorio ausente o en fallo: ${k}`);
  }
  return why;
}

/* ── autoteste del propio juez: este ejecutor NO puede dar PASS por una
   ejecución vacía, antigua, caída o sin el aserto esperado ─────────────── */
function makeFaultFixture(spec, over = {}) {
  const checks = {};
  for (const k of spec.mustPass) checks[`chromium:${k}`] = true;
  checks[`chromium:${spec.expectFail}`] = false;
  const failed = [`chromium:${spec.expectFail}`];
  return {
    label: 'fixture',
    fault: 'x',
    exit: 1,
    seconds: 1,
    t0: Date.now(),
    run_file: 'fixture.json',
    run_file_base: 'fixture.json',
    expected_run_id: 'RID-ESTA',
    report_run_id: 'RID-ESTA',
    report_exists: true,
    report_age_ms: 100,
    report_utc_fresh: true,
    checks_total: Object.keys(checks).length + 5,
    checks,
    failed,
    passed: Object.keys(checks).filter((k) => checks[k]),
    tail: '',
    ...over
  };
}
function makeNormalFixture(over = {}) {
  const checks = {};
  for (const k of NORMAL_REQUIRED) checks[`chromium:${k}`] = true;
  return {
    label: 'fixture-normal',
    fault: null,
    exit: 0,
    seconds: 1,
    t0: Date.now(),
    run_file: 'fixture.json',
    run_file_base: 'fixture.json',
    expected_run_id: 'RID-ESTA',
    report_run_id: 'RID-ESTA',
    report_exists: true,
    report_age_ms: 100,
    report_utc_fresh: true,
    checks_total: NORMAL_REQUIRED.length,
    checks,
    failed: [],
    passed: [...NORMAL_REQUIRED],
    tail: '',
    ...over
  };
}
function runSelfTest() {
  const spec = SPECS.cta_missing;
  const cases = [
    { name: 'corrida_de_fallo_válida', kind: 'fault', expect: 'ok', r: makeFaultFixture(spec) },
    { name: 'informe_ausente', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { report_exists: false, checks: {}, checks_total: 0, failed: [] }) },
    { name: 'informe_antiguo', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { report_age_ms: 86_400_000 }) },
    { name: 'utc_ajeno', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { report_utc_fresh: false }) },
    {
      // informe válido y FRESCO pero de otra ejecución (p. ej. generado 60 s
      // antes): la frescura ya no basta — el run_id lo desenmascara
      name: 'run_id_de_otra_ejecucion',
      kind: 'fault',
      expect: 'reject',
      r: makeFaultFixture(spec, { report_run_id: 'RID-OTRA-EJECUCION' })
    },
    {
      name: 'run_id_ausente',
      kind: 'fault',
      expect: 'reject',
      r: makeFaultFixture(spec, { report_run_id: null })
    },
    { name: 'infra_exit_2', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { exit: 2 }) },
    { name: 'proceso_no_terminó', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { exit: null }) },
    { name: 'cero_pruebas', kind: 'fault', expect: 'reject', r: makeFaultFixture(spec, { checks_total: 0 }) },
    {
      name: 'escenario_no_ejecutado',
      kind: 'fault',
      expect: 'reject',
      r: (() => {
        const f = makeFaultFixture(spec);
        delete f.checks[`chromium:${spec.mustPass[0]}`];
        return f;
      })()
    },
    {
      name: 'aserto_esperado_ausente',
      kind: 'fault',
      expect: 'reject',
      r: (() => {
        const f = makeFaultFixture(spec);
        delete f.checks[`chromium:${spec.expectFail}`];
        f.failed = ['chromium:otro_check'];
        return f;
      })()
    },
    { name: 'normal_válido', kind: 'normal', expect: 'ok', r: makeNormalFixture() },
    {
      name: 'normal_run_id_ajeno',
      kind: 'normal',
      expect: 'reject',
      r: makeNormalFixture({ report_run_id: 'RID-OTRA-EJECUCION' })
    },
    {
      name: 'normal_sin_obligatorios',
      kind: 'normal',
      expect: 'reject',
      r: makeNormalFixture({
        checks: { 'chromium:hero_visible': true },
        checks_total: 1,
        failed: [],
        passed: ['chromium:hero_visible']
      })
    },
    { name: 'normal_exit_1', kind: 'normal', expect: 'reject', r: makeNormalFixture({ exit: 1 }) }
  ];
  const out = [];
  let bad = 0;
  for (const c of cases) {
    const why = c.kind === 'fault' ? judgeFault(spec, c.r) : judgeNormal(c.r);
    const rejected = why.length > 0;
    const ok = c.expect === 'ok' ? !rejected : rejected;
    if (!ok) bad++;
    out.push({ case: c.name, kind: c.kind, expect: c.expect, rejected, why });
    console.log(`${ok ? 'ok  ' : 'FAIL'} self-test/${c.name} → ${rejected ? `rechazado (${why[0]})` : 'aceptado'}`);
  }
  return { cases: out, bad };
}

// ── autoteste del juez (siempre, antes de la batería) ─────────────────────
console.log('== self-test del juez (el ejecutor no puede dar PASS por una ejecución vacía) ==');
const selfTest = runSelfTest();
if (selfTest.bad > 0) {
  console.log(`SELF-TEST FAIL (${selfTest.bad}) — se detiene antes de la batería`);
  await mkdir(OUT, { recursive: true });
  const st = new Date().toISOString();
  await writeFile(
    join(OUT, `launch-faults-selftest-${st.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}.json`),
    JSON.stringify({ utc: st, what: 'self-test del juez', cases: selfTest.cases }, null, 1)
  );
  process.exit(1);
}
if (process.argv.includes('--self-test')) {
  console.log('SELF-TEST PASS (modo --self-test: batería omitida)');
  process.exit(0);
}

// ── controles negativos ───────────────────────────────────────────────────
console.log('== controles negativos (la corrida DEBE fallar por el aserto esperado) ==');
for (const fault of Object.keys(SPECS)) {
  const r = await runSmoke(`fault:${fault}`, { LAUNCH_FAULT: fault });
  const why = judgeFault(SPECS[fault], r);
  results.push({ kind: 'fault', fault, ...r, verdict_why: why });
  if (why.length) {
    problems.push(`${fault}: ${why.join(' | ')}`);
    console.log(`FAIL ${fault}: exit=${r.exit} informe=${r.run_file_base} → ${why.join(' | ')}`);
  } else {
    console.log(
      `ok   ${fault}: exit=${r.exit} informe=${r.run_file_base} (fresco ${r.report_age_ms} ms) aserto="chromium:${SPECS[fault].expectFail}" pruebas=${r.checks_total} (${r.seconds}s)`
    );
  }
}

// ── escenario normal posterior ────────────────────────────────────────────
console.log('== escenario normal posterior (debe pasar con todos los checks obligatorios) ==');
const n = await runSmoke('normal-post-faults', {});
const normalWhy = judgeNormal(n);
results.push({ kind: 'normal', ...n, verdict_why: normalWhy });
if (normalWhy.length) {
  problems.push(`normal: ${normalWhy.join(' | ')}`);
  console.log(`FAIL normal: exit=${n.exit} → ${normalWhy.join(' | ')}`);
} else {
  console.log(
    `ok   normal: exit=${n.exit} informe=${n.run_file_base} pruebas=${n.checks_total} obligatorios=${NORMAL_REQUIRED.length} (${n.seconds}s)`
  );
}

// ── evidencia propia de ESTA ejecución (no sobrescribe las anteriores) ────
await mkdir(OUT, { recursive: true });
const utc = new Date().toISOString();
const reportPath = join(OUT, `launch-faults-${utc.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}.json`);
const report = {
  utc,
  what:
    'Controles negativos locales del launch smoke — ejecutor con validación de escenario, frescura de informe y exit codes (FASE B.2)',
  entry_point: 'scripts/launch_smoke_faults.mjs (raíz, cwd explícito = app/)',
  smoke: SMOKE,
  faults_injected: Object.keys(SPECS),
  normal_required_checks: NORMAL_REQUIRED,
  results,
  problems
};
await writeFile(reportPath, JSON.stringify(report, null, 1));
console.log('→', reportPath);

if (problems.length) {
  console.log('FAULT CONTROLS FAIL:', problems.length, 'problema(s)');
  process.exit(1);
}
if (results.length !== Object.keys(SPECS).length + 1) {
  console.log('FAULT CONTROLS FAIL: corridas obligatorias incompletas');
  process.exit(1);
}
console.log(`FAULT CONTROLS PASS (${Object.keys(SPECS).length} fallos + 1 normal)`);
process.exit(0);
