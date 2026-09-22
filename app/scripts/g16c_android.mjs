// g16c — QA en Chrome REAL dentro del emulador Android (hbo / emulator-5556).
// Conecta por CDP (adb forward tcp:9333 localabstract:chrome_devtools_remote).
// Capturas a nivel de dispositivo con `adb exec-out screencap` (incluye barras
// del sistema y diálogos ANR — evidencia fiel de lo que ve el usuario).
//
// Detección de solape: para cada elemento semántico visible se comprueba que
// elementFromPoint(centro) devuelve el propio elemento o un descendiente —
// si no, hay una capa (visible o transparente) tapándolo e interceptando el
// toque real.
//
// Uso: node scripts/g16c_android.mjs [prod|local]
//   prod  → https://huntsman1756.github.io/mas_joven_que_tu-/  (25452e0)
//   local → http://localhost:4297/ (app/build servido + adb reverse)
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const TARGET = process.argv[2] ?? 'prod';
const BASE =
  TARGET === 'local'
    ? 'http://localhost:4297/'
    : 'https://huntsman1756.github.io/mas_joven_que_tu-/';
const EV = new URL('../../evidence/g16c/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(EV, { recursive: true });

const ADB = 'F:/Android/Sdk/platform-tools/adb.exe';
const DEV = 'emulator-5556';
const IS_LOCAL = TARGET === 'local';
const out = [];
// pageerror en TODAS las páginas: se reengancha tras cada reconexión
// (ensurePage) — un error de página rompe el veredicto igual que un FAIL.
const pageErrors = [];
const attachPageError = (pg) =>
  pg.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
const shell = (cmd) =>
  execSync(`"${ADB}" -s ${DEV} shell ${cmd}`, { shell: 'cmd.exe', stdio: 'pipe' });

// Un diálogo ANR («… isn't responding») ensucia capturas y clics: se
// detecta por uiautomator y se pulsa «Wait» antes de capturar.
function dismissAnr() {
  try {
    const xml = shell('uiautomator dump /sdcard/qa_ui.xml >/dev/null 2>&1')
      .toString();
    void xml;
    const dump = execSync(`"${ADB}" -s ${DEV} shell cat /sdcard/qa_ui.xml`, {
      shell: 'cmd.exe',
      stdio: 'pipe'
    }).toString();
    if (!/isn.t responding|no responde|not responding/i.test(dump)) return;
    const m = dump.match(/text="Wait"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (m) shell(`input tap ${(+m[1] + +m[3]) / 2} ${(+m[2] + +m[4]) / 2}`);
  } catch {
    /* sin acceso a uiautomator */
  }
}
const shot = (name) => {
  try {
    dismissAnr();
    execSync(`"${ADB}" -s ${DEV} exec-out screencap -p > "${EV}${TARGET}-${name}.png"`, {
      shell: 'cmd.exe'
    });
  } catch (e) {
    out.push(`SHOT_FAIL ${name} ${e.message.slice(0, 80)}`);
  }
};
// Un diálogo ANR activo bloquea la entrada: los clics esperan
// actionability hasta agotar el timeout. Se descarta antes de pulsar.
async function tap(loc) {
  dismissAnr();
  await loc.click();
}
const ok = (name, cond, extra = '') => {
  out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};
// Paso realmente no aplicable: visible y justificado por versión, no PASS.
const skip = (name, reason) => out.push(`SKIP ${name} — ${reason}`);
// Imposible de probar en este entorno (p.ej. IME bajo CDP): resultado parcial.
const blocked = (name, reason) => out.push(`BLOCKED ${name} — ${reason}`);
// Control esperado ausente: en el build LOCAL es FAIL — la QA debe
// demostrarlo. En el despliegue solo es SKIP si la funcionalidad no
// existe en esa versión, y la razón lo dice explícitamente.
const need = (name, cond, reason) => {
  if (cond) return true;
  if (IS_LOCAL) ok(name, false, reason);
  else skip(name, `${reason} — versión desplegada 25452e0 sin G16`);
  return false;
};

// Devuelve elementos semánticos visibles cuyo centro está tapado por otra capa.
async function overlapAudit(p, label) {
  const data = await p.evaluate(() => {
    const sels = [
      '.legend', '.maplibregl-ctrl-attrib', '.maplibregl-ctrl-bottom-right',
      '.maplibregl-ctrl-bottom-left', '.timeline', '.viewswitch', '.vsel',
      '.vmenu', '.photo', '.timeband', '.swipectl', '.celldetail', '.hot', '.chip',
      '.toolbar', '.addr', '.search', '.compare',
      // NB: el canvas NO se audita — es la superficie de fondo; que un
      // control flote sobre él es el diseño, no un solape. Sí se audita
      // lo que puede tapar a los controles.
      '.swipe', '.vtoolbar', '.scenectl', '.headline-block', '.vsel',
      '.presets', '.handle', '.cell-inspect', '.change', '.langs'
    ];
    const seen = new Set();
    const res = [];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        // etiquetas/decoración con pointer-events:none no pueden interceptar
        // el toque — el solape relevante es el de elementos accionables
        if (cs.pointerEvents === 'none') continue;
        // centro de la parte VISIBLE del elemento (un elemento parcialmente
        // bajo la toolbar sticky no es un solape: es scroll normal)
        const cx = (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2;
        const cy = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (!top) continue;
        const covered = !(top === el || el.contains(top) || top.contains(el));
        // ancestros del elemento que tapa: sirve para distinguir un solape
        // real de un apilamiento previsto — pero solo cuenta como tal si el
        // cobertor está DENTRO de un elemento con position fixed/sticky
        // (hoja modal o toolbar), comprobado por estilo computado, no solo
        // por nombre de clase.
        const path = [];
        let fixedAnc = null;
        for (let n = top; n && path.length < 8; n = n.parentElement) {
          const cls = String(n.className).split(' ')[0] || n.tagName;
          path.push(cls);
          const pos = getComputedStyle(n).position;
          if (!fixedAnc && (pos === 'fixed' || pos === 'sticky')) fixedAnc = cls;
        }
        res.push({
          sel: s,
          covered,
          coveredBy: covered
            ? `${top.tagName}.${String(top.className).slice(0, 60)}`
            : null,
          coveredByPath: covered ? path.join('<') : null,
          coveredByFixed: covered ? fixedAnc : null,
          rect: [r.left | 0, r.top | 0, r.width | 0, r.height | 0]
        });
      }
    }
    return { res, iw: innerWidth, ih: innerHeight, vvH: visualViewport?.height ?? null };
  });
  // Apilamientos previstos por diseño, y SOLO cuando el cobertor está
  // dentro de chrome fijo/sticky comprobado: la toolbar sticky recorta lo
  // que pasa por debajo al hacer scroll; las hojas fijas (.vmenu, panel de
  // selección, ficha de celda) son modales y cubren su lanzador. Un
  // elemento fijo/sticky fuera de esa lista NO se descarta.
  const CHROME = /^(vtoolbar|vmenu|selection-panel|celldetail)$/;
  const covered = data.res.filter((x) => x.covered);
  const benign = covered.filter((c) => CHROME.test(c.coveredByFixed ?? ''));
  const real = covered.filter((c) => !CHROME.test(c.coveredByFixed ?? ''));
  for (const c of benign)
    console.log(
      `WARN tap_${label} — ${c.sel}[${c.rect}]<-${c.coveredBy} (dentro de ${c.coveredByFixed} fijo/sticky: apilamiento previsto)`
    );
  ok(
    `tap_${label}`,
    real.length === 0,
    real
      .map((c) => `${c.sel}[${c.rect}]<-${c.coveredBy}`)
      .join(' ; ')
      .slice(0, 400)
  );
  return data;
}

// Cambio de modo según breakpoint: móvil = .vsel → .vmenu .vopt
async function setMode(p, mode) {
  const vsel = p.locator('.vsel');
  if (await vsel.isVisible().catch(() => false)) {
    await tap(vsel);
    await p.waitForSelector('.vmenu', { timeout: 8000 });
    await tap(p.locator(`.vmenu .vopt[data-mode="${mode}"]`));
  } else {
    await tap(p.locator(`.viewswitch [data-mode="${mode}"]`));
  }
  await p.waitForFunction((m) => window.__mjtApp?.mode === m, mode, { timeout: 15000 });
}

// Chrome 109 en emulador x86_64 es propenso a ANR: reintentos + dismiss
async function connectCdp() {
  for (let i = 0; i < 4; i++) {
    try {
      return await chromium.connectOverCDP('http://localhost:9333');
    } catch {
      try {
        shell('input tap 540 1342'); // «Wait» del diálogo ANR
      } catch {
        /* sin diálogo ANR */
      }
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  return chromium.connectOverCDP('http://localhost:9333');
}
let browser = await connectCdp();
let p = browser.contexts()[0].pages().find((x) => x.url().includes('mas_joven'))
  ?? browser.contexts()[0].pages()[0];
p.setDefaultTimeout(60000);
attachPageError(p);

// La conexión CDP puede caer durante un ANR: reintenta y relocaliza la página
async function ensurePage() {
  try {
    await p.evaluate(() => 1);
    return p;
  } catch {
    /* página caída: reconectar */
  }
  for (let i = 0; i < 4; i++) {
    try {
      shell('input tap 540 1342');
    } catch {
      /* sin diálogo ANR */
    }
    await new Promise((r) => setTimeout(r, 10000));
    try {
      browser = await connectCdp();
      const pages = browser.contexts()[0].pages();
      p = pages.find((x) => x.url().includes('mas_joven')) ?? pages[0];
      p.setDefaultTimeout(60000);
      attachPageError(p); // tras la reconexión la página es otra instancia
      await p.evaluate(() => 1);
      return p;
    } catch {
      /* sigue caída: otro intento */
    }
  }
  throw new Error('CDP irrecuperable');
}

// Cada paso del recorrido es tolerante: un fallo puntual (ANR, timing)
// no aborta el resto de la QA — se registra como FAIL.
async function step(name, fn) {
  try {
    await ensurePage();
    await fn();
  } catch (e) {
    out.push(`FAIL step_${name} — ${String(e.message ?? e).split('\n')[0].slice(0, 160)}`);
  }
}


// La pestaña puede traer cualquier estado (about:blank sin viewport meta da
// iw=980): el entorno se mide tras la primera navegación real a la app.
await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
const env = await p.evaluate(() => ({
  iw: innerWidth,
  ih: innerHeight,
  vvW: visualViewport?.width,
  vvH: visualViewport?.height,
  dpr: devicePixelRatio,
  ua: navigator.userAgent,
  lang: navigator.language
}));
out.push(`ENV ${JSON.stringify(env)}`);
ok('env_viewport_mobile', env.iw <= 430 && env.dpr > 1, `iw=${env.iw} dpr=${env.dpr}`);
// Idioma determinista: la preferencia persiste en localStorage entre
// sesiones — el recorrido se valida en ES y el cambio EU se prueba como
// conmutación real en su paso.
await p.evaluate(() => localStorage.setItem('mjt-lang', 'es')).catch(() => {});
await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});

await step('portada', async () => {
  // 1. Portada en vertical (la página ya está cargada — recargo limpio)
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.headline-block, form, .hero', { timeout: 60000 });
  await p.waitForTimeout(3000);
  shot('01-portada');
  await overlapAudit(p, 'portada');


});

await step('scroll', async () => {
  // 2. Scroll abajo y regreso
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(800);
  shot('02-scroll-abajo');
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(600);


});

await step('edificios', async () => {
  // 3. Resultado (Edificios) — deep link año+municipio
  await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(5000);
  shot('03-edificios');
  await overlapAudit(p, 'edificios');


});

await step('evolucion', async () => {
  // 4. Evolución: modo + reproducción + pausa verificadas por estado.
  // No basta con que playing cambie: el año de reproducción debe AVANZAR
  // y, tras pausar, quedar estable (ni rebote ni avance residual).
  await setMode(p, 'time');
  await p.waitForTimeout(2500);
  shot('04-evolucion');
  await overlapAudit(p, 'evolucion');
  const playBtn = p.locator('.timeband [data-action="play"]').first();
  if (!(await playBtn.isVisible().catch(() => false))) {
    ok('time_play_pause', false, 'botón de reproducción no visible en modo time');
    return;
  }
  const y0 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  await tap(playBtn);
  const advanced = await p
    .waitForFunction(
      (y) => window.__mjtApp?.playing === true && window.__mjtApp?.playYear !== y,
      y0,
      { timeout: 20000 }
    )
    .then(() => true)
    .catch(() => false);
  shot('04b-play');
  await tap(playBtn); // pausa
  const paused = await p
    .waitForFunction(() => window.__mjtApp?.playing === false, null, { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  const y1 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  await p.waitForTimeout(2500); // ventana para detectar avance residual
  const y2 = await p.evaluate(() => window.__mjtApp?.playYear ?? null);
  ok(
    'time_play_pause',
    advanced && paused && y1 === y2 && y1 !== y0,
    `y0=${y0} y1=${y1} y2=${y2} advanced=${advanced} paused=${paused}`
  );


});

await step('fotos', async () => {
  // 5. Fotos + cambio de campaña verificado por el año mostrado (.p-year)
  await setMode(p, 'photo');
  await p.waitForTimeout(4000);
  shot('05-fotos');
  await overlapAudit(p, 'fotos');
  const nextBtn = p.locator('.photo [data-action="next"]').first();
  const prevBtn = p.locator('.photo [data-action="prev"]').first();
  const anyBtn = (await nextBtn.count()) + (await prevBtn.count()) > 0;
  // El panel de foto debe tener navegación de campañas en ambos builds:
  // ausente = FAIL (no es un SKIP aplicable).
  if (!need('photo_campaign_nav', anyBtn, 'sin botones de campaña en .photo')) return;
  const btn = (await nextBtn.isEnabled().catch(() => false))
    ? nextBtn
    : (await prevBtn.isEnabled().catch(() => false))
      ? prevBtn
      : null;
  if (!btn) {
    ok('photo_campaign_change', false, 'botones presentes pero todos deshabilitados');
  } else {
    const before = await p.locator('.photo .p-year').first().textContent();
    await tap(btn);
    const changed = await p
      .waitForFunction(
        (b) => document.querySelector('.photo .p-year')?.textContent?.trim() !== b,
        before?.trim(),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);
    const after = await p.locator('.photo .p-year').first().textContent();
    ok('photo_campaign_change', changed, `${before?.trim()} -> ${after?.trim()}`);
    shot('05b-campana');
  }


});

await step('swipe', async () => {
  // 6. Comparador — regresión geométrica del solape G16c: la cortina debe
  // coincidir con la caja del canvas y la leyenda no debe quedar debajo.
  await setMode(p, 'swipe');
  await p.waitForTimeout(4000);
  // encuadra el mapa para que la captura demuestre la cortina visible
  await p.evaluate(() => document.querySelector('.mapcell')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(800);
  shot('06-comparador');
  await overlapAudit(p, 'swipe');
  const g = await p.evaluate(() => {
    const R = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.top | 0, r.bottom | 0];
    };
    return { sw: R('.swipe'), mw: R('.mapwrap'), lg: R('.legend') };
  });
  // .swipe debe cubrir EXACTAMENTE el lienzo (±3px) y la leyenda empieza
  // donde acaba el canvas — no debajo de la cortina ni desbordada.
  ok(
    'swipe_box_eq_canvas',
    g.sw && g.mw && Math.abs(g.sw[0] - g.mw[0]) <= 3 && Math.abs(g.sw[1] - g.mw[1]) <= 3,
    JSON.stringify(g)
  );
  ok('legend_below_canvas', !g.lg || !g.mw || g.lg[0] >= g.mw[1] - 2, JSON.stringify(g));
  // captura DOM (sin UI del sistema) del estado sano — los chips deben
  // anunciar campañas reales en ambos lados
  const okUi = await p.evaluate(() => ({
    left: document.querySelector('.swipe .chip.left')?.textContent ?? null,
    right: document.querySelector('.swipe .chip.right')?.textContent ?? null
  }));
  out.push(`INFO swipe_chips ${JSON.stringify(okUi)}`);
  await p.screenshot({ path: `${EV}${TARGET}-06-comparador-dom.png` }).catch(() => {});
  // Estado fallido: sobre CDP no hay intercepción de red — se inyecta el
  // veredicto de la sonda (NOT_COVERED) a nivel de estado, lo cual prueba
  // la PRESENTACIÓN (etiquetas honestas), no la sonda real. Etiquetado
  // como tal en la evidencia.
  if (IS_LOCAL) {
    await p.evaluate(() => {
      window.__mjtApp.orthoState = 'NOT_COVERED';
    });
    await p.waitForTimeout(800);
    const failUi = await p.evaluate(() => ({
      right: document.querySelector('.swipe .chip.right')?.textContent ?? '',
      miss: !!document.querySelector('.swipe .chip.right.miss'),
      warnInFlow: !!document.querySelector('.swipectl .sw-status.warn'),
      overlayStatus: !!document.querySelector('.swipe [role="status"]'),
      year: window.__mjtApp?.orthoCampaign?.year ?? window.__mjtApp?.latest?.year
    }));
    ok(
      'swipe_failed_honest',
      failUi.miss &&
        new RegExp(String(failUi.year)).test(failUi.right) &&
        !/Actualidad|Gaur egun/.test(failUi.right),
      `chip.right="${failUi.right}" (agnóstico de idioma; estado inyectado)`
    );
    ok(
      'swipe_failed_notice_in_flow',
      failUi.warnInFlow && !failUi.overlayStatus,
      `warn=${failUi.warnInFlow} overlayStatus=${failUi.overlayStatus}`
    );
    shot('06b-comparador-fallo');
    await p.screenshot({ path: `${EV}${TARGET}-06b-comparador-fallo-dom.png` }).catch(() => {});
    // Recuperación real: UNKNOWN dispara la sonda de la campaña vigente
    // (efecto de SwipeCompare). La recuperación correcta es que la sonda
    // se re-ejecute y la UI quede CONSISTENTE con el veredicto medido —
    // si el servicio real sigue sin imagen, el chip de respaldo es lo
    // honesto, no un AVAILABLE forzado.
    await p.evaluate(() => {
      window.__mjtApp.orthoState = 'UNKNOWN';
    });
    const settled = await p
      .waitForFunction(
        () =>
          ['AVAILABLE', 'NOT_COVERED', 'SERVICE_ERROR'].includes(
            window.__mjtApp?.orthoState
          ),
        null,
        { timeout: 30000 }
      )
      .then(() => true)
      .catch(() => false);
    const post = await p.evaluate(() => ({
      st: window.__mjtApp?.orthoState,
      right: document.querySelector('.swipe .chip.right')?.textContent ?? '',
      miss: !!document.querySelector('.swipe .chip.right.miss')
    }));
    const consistent =
      post.st === 'AVAILABLE'
        ? !post.miss && /\d{4}/.test(post.right)
        : post.st === 'NOT_COVERED' || post.st === 'SERVICE_ERROR'
          ? post.miss
          : false;
    ok('swipe_failed_recovers', settled && consistent, JSON.stringify(post));
  } else {
    skip(
      'swipe_failed_honest',
      'prod=25452e0 no tiene la presentación honesta — es el defecto reproducido'
    );
  }
});

await step('celda', async () => {
  // 7. Edificios de vuelta → ficha de zona (hotspot): verifica que la
  // selección realmente queda registrada en el estado
  await setMode(p, 'map');
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForTimeout(600);
  const hotBtn = p.locator('.hot .btn.ghost').first();
  if (!need('cell_select', await hotBtn.isVisible().catch(() => false), 'sin hotspots visibles en .lazyview'))
    return;
  await tap(hotBtn);
  await p.waitForTimeout(3000);
  const spot = p.locator('[data-action="spot-map"]').first();
  if (!need('cell_select', await spot.isVisible().catch(() => false), 'hotspot abierto sin acción spot-map'))
    return;
  await tap(spot);
  const selected = await p
    .waitForFunction(() => !!window.__mjtApp?.selectedCell, null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  ok('cell_select', selected, 'app.selectedCell tras spot-map');
  shot('07-celda');
  await overlapAudit(p, 'celda');


});

await step('teclado_muni', async () => {
  // 8. Teclado en edición de municipio: botón «Cambiar» → formulario
  await tap(p.locator('.change').first());
  const search = p.locator('.changeform .search input').first();
  if (
    !need(
      'teclado_muni',
      await search.isVisible().catch(() => false),
      'sin input de búsqueda visible en .changeform'
    )
  )
    return;
  {
    await search.click().catch(() => {});
    await p.waitForTimeout(1500);
    const kb = await p.evaluate(() => ({
      ih: innerHeight,
      vvH: visualViewport?.height,
      focused: document.activeElement?.tagName === 'INPUT'
    }));
    // Observación real del IME: visualViewport se encoge Y el sistema
    // reporta el teclado mostrado. El foco sintético NO vale como prueba.
    let imeShown = false;
    try {
      const dump = shell('dumpsys input_method').toString();
      imeShown = /mInputShown=true/.test(dump);
    } catch {
      /* dumpsys no disponible */
    }
    const vvShrunk = kb.vvH != null && kb.vvH < kb.ih * 0.8;
    shot('08-teclado-muni');
    out.push(`KBD ih=${kb.ih} vvH=${kb.vvH} focused=${kb.focused} mInputShown=${imeShown}`);
    ok('teclado_muni_focus', kb.focused === true, `activeElement=${kb.focused}`);
    if (imeShown || vvShrunk) {
      ok('teclado_ime', true, `mInputShown=${imeShown} vvShrunk=${vvShrunk}`);
    } else {
      // El IME virtual no abre bajo foco sintético CDP en este AVD
      // (hw.keyboard=no, mInputShown=false) — queda NO VALIDADO.
      blocked('teclado_ime', `IME no abierto: mInputShown=false, vvH=${kb.vvH}≈ih=${kb.ih}`);
    }
    await overlapAudit(p, 'teclado');
    // fill() sustituye el valor — keyboard.type lo añade al nombre prefill
    // («Getxobilb») y no produce sugerencias. NB: el IME no abre bajo CDP
    // en este AVD (mInputShown=false aun con hw.keyboard=no) — se registra
    // como límite del entorno, no de la app.
    await search.fill('bilb');
    // el listbox ya estaba abierto con el listado inicial: hay que esperar
    // a que la primera opción responda al filtro, no solo a que exista
    await p
      .waitForFunction(
        () =>
          /bilb/i.test(
            document.querySelector('#place-listbox [role="option"]')?.textContent ?? ''
          ),
        { timeout: 15000 }
      )
      .catch(() => {});
    shot('08b-sugerencias');
    // seleccionar una sugerencia = cambio real de municipio
    const opt = p.locator('#place-listbox [role="option"] button').first();
    if (!(await opt.count())) {
      out.push('WARN sugerencias — listbox vacío tras teclear «bilb»');
    }
    if (await opt.count()) {
      const prev = await p.evaluate(() => window.__mjtApp?.place?.slug ?? null);
      await tap(opt);
      // PlaceSearch es «draft»: elegir solo fija el borrador — el cambio real
      // requiere confirmar el formulario (.cf-submit)
      await tap(p.locator('.cf-submit'));
      const now = await p
        .waitForFunction(
          (prevSlug) => {
            const s = window.__mjtApp?.place?.slug ?? null;
            return s && s !== prevSlug ? s : false;
          },
          prev,
          { timeout: 30000 }
        )
        .then((h) => h.jsonValue())
        .catch(() => p.evaluate(() => window.__mjtApp?.place?.slug ?? null));
      ok('muni_change_by_suggestion', !!now && now !== prev, `${prev} -> ${now}`);
      shot('08c-muni-cambiado');
    }
    // cerrar con Atrás (sistema)
    shell('input keyevent 4');
    await p.waitForTimeout(1200);
    const kb2 = await p.evaluate(() => ({ ih: innerHeight, vvH: visualViewport?.height }));
    out.push(`KBD_CLOSED ih=${kb2.ih} vvH=${kb2.vvH}`);
    await p.keyboard.press('Escape').catch(() => {});
  }


});

await step('teclado_dir', async () => {
  // 9. Búsqueda de dirección (below-fold, doble lazy: LazyView monta la
  // invitación y ésta carga AddressSearch al pulsar «Buscar mi portal»)
  await p.evaluate(() => document.querySelector('.lazyview')?.scrollIntoView());
  await p.waitForSelector('.invite .start', { timeout: 20000 });
  await tap(p.locator('.invite .start').first());
  await p.waitForSelector('.addr', { timeout: 20000 });
  const addr = p.locator('.addr input').first();
  if (!need('teclado_dir', await addr.isVisible().catch(() => false), '.addr sin input tras abrir la invitación'))
    return;
  await addr.scrollIntoViewIfNeeded().catch(() => {});
  await addr.click().catch(() => {});
  await p.waitForTimeout(1500);
  const focused = await p.evaluate(() => document.activeElement?.tagName === 'INPUT');
  ok('teclado_dir_focus', focused, `focused=${focused}`);
  shot('09-teclado-dir');
  await overlapAudit(p, 'teclado-dir');
  shell('input keyevent 4');
  await p.waitForTimeout(800);


});

await step('editar', async () => {
  // 10. Edición de año real: abrir «Cambiar», escribir otro año válido,
  // confirmar y verificar que el estado y el resultado cambian.
  await p.evaluate(() => scrollTo(0, 0));
  await tap(p.locator('.change').first());
  const yearInput = p.locator('#edit-year');
  if (
    !need(
      'year_change',
      await yearInput.isVisible().catch(() => false),
      'formulario de edición sin #edit-year visible'
    )
  )
    return;
  const prevYear = await p.evaluate(() => window.__mjtApp?.year ?? null);
  const newYear = prevYear === 1980 ? 1975 : 1980;
  await yearInput.fill(String(newYear));
  shot('10-editar-anio');
  await tap(p.locator('.cf-submit'));
  const now = await p
    .waitForFunction((y) => window.__mjtApp?.year === y, newYear, { timeout: 20000 })
    .then(() => newYear)
    .catch(() => p.evaluate(() => window.__mjtApp?.year ?? null));
  ok('year_change', now === newYear && now !== prevYear, `${prevYear} -> ${now}`);
  // el resultado se reescribe: el kicker muestra el nuevo año
  const kicker = await p
    .locator('.headline-block .kicker')
    .first()
    .textContent()
    .catch(() => '');
  ok('year_result_updates', !!kicker && kicker.includes(String(newYear)), kicker?.trim().slice(0, 90));


});

await step('rotacion', async () => {
  // 11. Rotación vertical → horizontal → vertical: ambas transiciones
  // deben ser EFECTIVAS (iw/ih realmente cambian y vuelven).
  shell('settings put system accelerometer_rotation 0');
  shell('settings put system user_rotation 1');
  await p.waitForTimeout(3500);
  const land = await p.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
  shot('11-apaisado');
  await overlapAudit(p, 'apaisado');
  ok('rotation_landscape', land.iw > land.ih, `land=${land.iw}x${land.ih}`);
  shell('settings put system user_rotation 0');
  await p.waitForTimeout(3500);
  const port = await p.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
  shot('12-vertical-vuelta');
  await overlapAudit(p, 'vertical2');
  ok(
    'rotation_back',
    port.iw === env.iw && port.iw < port.ih,
    `land=${land.iw}x${land.ih} port=${port.iw}x${port.ih} env.iw=${env.iw}`
  );


});

await step('texto130', async () => {
  // 12. Texto grande (font_scale 1.3). Cambiar la escala con la página WebGL
  // viva mata el renderer de Chrome 109 en este AVD (determinista): primero
  // se descarga a about:blank, se cambia la escala y se recarga la app.
  // La prueba exige un cambio EFECTIVO en el contenido web: se mide el
  // tamaño computado del titular antes y después.
  const measureFont = () =>
    p.evaluate(() => ({
      h1: parseFloat(
        getComputedStyle(document.querySelector('.headline-block h1') ?? document.body)
          .fontSize
      ),
      body: parseFloat(getComputedStyle(document.body).fontSize)
    }));
  const baseFont = await measureFont().catch(() => null);
  await p.goto('about:blank').catch(() => {});
  shell('settings put system font_scale 1.3');
  try {
    await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
  } catch {
    await ensurePage();
    await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
  }
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(4000);
  const bigFont = await measureFont().catch(() => null);
  shot('13-texto130');
  await overlapAudit(p, 'texto130');
  // Cambio efectivo = el texto web medido crece (>3% sobre el ruido de
  // subpíxel); font_scale no escala 1:1 el CSS, basta un crecimiento
  // consistente y medible.
  const grew =
    baseFont &&
    bigFont &&
    (bigFont.h1 > baseFont.h1 * 1.03 || bigFont.body > baseFont.body * 1.03);
  if (grew) {
    ok('texto130_effective', true, `h1 ${baseFont.h1}px -> ${bigFont.h1}px`);
  } else {
    // limitación del entorno, no de la app: Chrome 109 no escala el texto
    // de una página con viewport meta correcto bajo font_scale del sistema
    blocked(
      'texto130_effective',
      `font_scale=1.3 no cambia el texto web en este Chrome (${JSON.stringify(baseFont)} -> ${JSON.stringify(bigFont)})`
    );
  }
  await p.goto('about:blank').catch(() => {});
  shell('settings put system font_scale 1.0');
  try {
    await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
  } catch {
    await ensurePage();
    await p.goto(`${BASE}?year=1952&place=getxo`, { waitUntil: 'domcontentloaded' });
  }
  await p.waitForSelector('.headline-block h1', { timeout: 60000 });
  await p.waitForTimeout(3000);


});

await step('eu', async () => {
  // 13. EU: el cambio de idioma se verifica por <html lang> y copy
  const euBtn = p.locator('.langs button').filter({ hasText: 'EU' }).first();
  // El selector de idioma existe en ambas versiones: ausente = FAIL.
  // Un clic forzado NO demuestra que sea pulsable — se usa el clic normal
  // (con actionability); si no lo es, el paso falla.
  if (!need('eu_switch', await euBtn.isVisible().catch(() => false), 'sin selector de idioma visible'))
    return;
  await euBtn.scrollIntoViewIfNeeded().catch(() => {});
  await tap(euBtn);
  const langOk = await p
    .waitForFunction(() => document.documentElement.lang === 'eu', null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  await p.waitForTimeout(2000);
  shot('14-eu');
  ok('eu_switch', langOk, `html lang=${await p.evaluate(() => document.documentElement.lang)}`);
  await overlapAudit(p, 'eu');


});

await step('canvas', async () => {
  // 14. Canvas vs contenedor: ambas dimensiones CSS == .mapwrap y
  // bitmap == CSS × dpr (solape por CSS ≠ bitmap queda descartado)
  const geom = await p.evaluate(() => {
    const cv = document.querySelector('.maplibregl-canvas');
    const wrap = document.querySelector('.mapwrap');
    if (!cv || !wrap) return null;
    const r = cv.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      canvasCss: [r.width | 0, r.height | 0],
      canvasAttr: [cv.width, cv.height],
      wrap: [w.width | 0, w.height | 0]
    };
  });
  if (!geom) {
    ok('canvas_size_matches', false, 'sin canvas o .mapwrap');
    return;
  }
  const dprOk =
    Math.abs(geom.canvasAttr[0] / Math.max(geom.canvasCss[0], 1) - env.dpr) < 0.6 &&
    Math.abs(geom.canvasAttr[1] / Math.max(geom.canvasCss[1], 1) - env.dpr) < 0.6;
  const wrapOk =
    Math.abs(geom.canvasCss[0] - geom.wrap[0]) <= 2 &&
    Math.abs(geom.canvasCss[1] - geom.wrap[1]) <= 2 &&
    geom.wrap[1] > 0;
  ok('canvas_size_matches', dprOk && wrapOk, JSON.stringify(geom));


});

shot('15-final');

// ── Veredicto calculado, no escrito a mano ─────────────────────────────
// Comprobaciones obligatorias del recorrido: si alguna no aparece en el
// registro (ni PASS ni FAIL/SKIP/BLOCKED) el QA está INCOMPLETO — es un
// FAIL explícito, no un silencio.
const REQUIRED = [
  'env_viewport_mobile',
  'tap_portada',
  'tap_edificios',
  'time_play_pause',
  'photo_campaign_change',
  'tap_swipe',
  'swipe_box_eq_canvas',
  'legend_below_canvas',
  'swipe_failed_honest',
  'swipe_failed_notice_in_flow',
  'swipe_failed_recovers',
  'cell_select',
  'teclado_muni_focus',
  'teclado_ime',
  'muni_change_by_suggestion',
  'teclado_dir_focus',
  'year_change',
  'year_result_updates',
  'rotation_landscape',
  'rotation_back',
  'texto130_effective',
  'eu_switch',
  'canvas_size_matches'
];
const seen = (n) => out.some((l) => /^(PASS|FAIL|SKIP|BLOCKED) /.test(l) && l.split(' ')[1] === n);
for (const n of REQUIRED) {
  if (!seen(n)) {
    out.push(`FAIL missing_${n} — prueba obligatoria no ejecutada`);
  }
}
for (const [i, e] of pageErrors.entries()) {
  out.push(`FAIL pageerror_${i} — ${e}`);
}
const counts = { PASS: 0, FAIL: 0, SKIP: 0, BLOCKED: 0 };
for (const l of out) {
  const m = l.match(/^(PASS|FAIL|SKIP|BLOCKED) /);
  if (m) counts[m[1]]++;
}
// COMPLETO exige: sin FAIL, sin obligatorias omitidas y sin BLOCKED ni
// SKIP — cualquier laguna produce PARCIAL y el proceso sale distinto de 0.
const verdict =
  counts.FAIL > 0 ? 'FALLO' : counts.BLOCKED > 0 || counts.SKIP > 0 ? 'PARCIAL' : 'COMPLETO';
console.log(out.join('\n'));
console.log(
  `\nRESUMEN target=${TARGET} PASS=${counts.PASS} FAIL=${counts.FAIL} SKIP=${counts.SKIP} BLOCKED=${counts.BLOCKED}`
);
console.log(`VEREDICTO: ${verdict}`);
if (verdict === 'PARCIAL')
  console.log('  → resultado parcial: hay pruebas bloqueadas o no aplicables — no es un QA completo');
await browser.close().catch(() => {});
process.exit(counts.FAIL > 0 ? 1 : verdict === 'PARCIAL' ? 2 : 0);
