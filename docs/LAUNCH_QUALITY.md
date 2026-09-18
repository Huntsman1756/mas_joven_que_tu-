# LAUNCH_QUALITY — checklist de lanzamiento

Checklist ejecutable de calidad de lanzamiento. **No es un gate nuevo ni
sustituye a G1**: recoge las comprobaciones de superficie de release que no
pertenecen al gate técnico congelado.

Fases: `REQUIRED_PRE_SUBMIT` (antes de presentar al concurso) ·
`REQUIRED_PRE_PUBLIC` (antes del despliegue público definitivo) ·
`POST_LAUNCH` (tras publicar) · `N/A` (no aplica por arquitectura).

| item | phase | check | command_or_method | evidence | status |
|---|---|---|---|---|---|
| SEO/meta | REQUIRED_PRE_SUBMIT | title por ruta, description, sin fallbacks stale (`G0 vertical slice`) | `grep` en `build/index.html` | `build/` generado | PASS |
| canonical | REQUIRED_PRE_SUBMIT | `/` y `/como-lo-sabemos` canonical propio; `?year&place` canonicaliza a `/` | `app.html` (home) + `scripts/seo-static-head.mjs` (resto) — con `ssr=false` el `svelte:head` no llega al HTML | build HTML | PASS |
| robots/sitemap | REQUIRED_PRE_SUBMIT | `robots.txt` + `sitemap.xml` solo con URLs canónicas reales (2) | `curl /robots.txt /sitemap.xml` | `static/` | PASS |
| favicon/manifest | REQUIRED_PRE_SUBMIT | `favicon.svg` + `site.webmanifest` | `curl` 200 + manifest válido | `static/` | PASS |
| social card | REQUIRED_PRE_SUBMIT | `og-card.png` 1200×630 propia, sin datos inventados | `node scripts/build-social-card.mjs` | `static/og-card.png` | PASS |
| og/twitter | REQUIRED_PRE_SUBMIT | og:title/description/image/url/type + twitter card en ambas rutas | inspección build HTML | `build/` | PASS |
| JSON-LD | REQUIRED_PRE_PUBLIC | solo si los campos son reales y estables (`WebSite`/`CreativeWork`) | decisión pendiente | — | PENDIENTE |
| Chromium smoke | REQUIRED_PRE_SUBMIT | hero → resultado → mapa → ortofoto → cambio de lugar | `node scripts/launch_browser_smoke.mjs` | `evidence/launch-qa/launch-smoke.json` | PASS |
| Firefox smoke | REQUIRED_PRE_SUBMIT | idem | idem (`firefox`) | idem | PASS |
| WebKit smoke | REQUIRED_PRE_SUBMIT | idem | idem (`webkit`) | idem | PASS |
| PERF budgets | N/A | preregistrados solo en Chromium (G1); no replicar | `g1_gate_perf.mjs` | evidencia G1 | N/A |
| 320 CSS px reflow | REQUIRED_PRE_SUBMIT | sin scroll horizontal, sin pérdida de función | `node scripts/launch_browser_smoke.mjs --reflow` | `evidence/launch-qa/launch-smoke.json` + `reflow-320.png` | PASS (tabla sr-only envuelta en div: el `<caption>` forzaba hscroll) |
| 400 % zoom | REQUIRED_PRE_SUBMIT | contenido y función disponibles | idem (`--zoom400`) | `launch-smoke.json` + `zoom-400.png` | PASS |
| NVDA screen-reader | REQUIRED_PRE_SUBMIT | journey hero→resultado comprensible | manual NVDA Windows | nota manual | PENDIENTE_HUMANO |
| VoiceOver/iOS | POST_LAUNCH | deseable, no bloquea si NVDA+WebKit+teclado+axe OK | manual | — | PENDIENTE |
| móvil físico | REQUIRED_PRE_SUBMIT | smoke real en dispositivo | manual | nota manual | PENDIENTE_HUMANO |
| tooltip celda touch/teclado | REQUIRED_PRE_SUBMIT | detalle por celda accesible sin hover | `g1r_cell_detail.mjs` | `map/m6b-cell-detail.json` — 17/17 checks (hover, clic, tap, sonda teclado, small-N, limpiezas, edificio) | PASS |
| dependency/security | REQUIRED_PRE_SUBMIT | dependabot/audit evaluado, no ignorado por `low` | `npm audit` + análisis exposición | § Dependencias | DOCUMENTADO |
| CSP | REQUIRED_PRE_SUBMIT | hash-mode, sin violaciones | dep-smoke | evidencia G1 | PASS |
| privacy/no-trackers | REQUIRED_PRE_SUBMIT | sin analytics/cookies/beacon | inspección red (external = solo servicios de datos) | adjudication `net.external` | PASS |
| HTTPS | REQUIRED_PRE_SUBMIT | HTTPS + HSTS en host | dep-smoke | evidencia G1 | PASS |
| rollback/redeploy | REQUIRED_PRE_PUBLIC | rebuild del SHA + redeploy estático | git + `npm run build` | procedimiento git | DISPONIBLE |
| broken-link check | REQUIRED_PRE_PUBLIC | sin enlaces rotos internos/externos | crawler o revisión | — | PENDIENTE |
| backups/restore | N/A | estático + git; restore = redeploy SHA | — | — | N/A |
| CSRF/sesiones/backend | N/A | sin backend ni cuentas | arquitectura | — | N/A |
| consentimiento cookies | N/A | sin cookies propias ni trackers | arquitectura | — | N/A |
| RUM/observabilidad | POST_LAUNCH | sin beacon por decisión (privacidad); reevaluar en despliegue público | decisión | — | APLAZADO |
| Search Console | POST_LAUNCH | Domain Property, sitemap enviado, inspección URLs | consola | — | PENDIENTE |
| cross-browser real devices | POST_LAUNCH | Android/iOS real además del smoke | manual | — | PENDIENTE |

## Dependencias / alertas de seguridad

Registro del análisis (no ignorar `low` sin evaluar exposición):

| paquete | tipo | prod/dev | versión afectada | fix | exposición real | decisión |
|---|---|---|---|---|---|---|
| `cookie` (<0.7.0, GHSA-pxg6-pf52-xh8x) | transitiva vía `@sveltejs/kit` → `adapter-static` | build/dev | instalada <0.7.0 | no existe release de kit 2.x con el fix (kit 2.70.3 ya es la última) | **ninguna en producción**: el parseo de cookies ocurre en el runtime de servidor de kit; el producto es estático y no lo empaqueta | DOCUMENTADO — reevaluar cuando kit publique release con `cookie ≥0.7.0` |

## Notas de alcance

- Sin RUM/analytics/beacon por decisión: el producto no recoge telemetría.
- Las URLs compartidas `?year=&place=` siguen funcionando para reproducir una
  vista, pero canonicalizan a `/`: no existe universo indexable de resultados.
- Los smokes cross-browser son funcionales (compatibilidad), no de presupuesto:
  los perfiles PERF están preregistrados únicamente en Chromium.
