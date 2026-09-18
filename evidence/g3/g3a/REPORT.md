# G3-A — MI EDIFICIO + DOS AÑOS · reporte de gate

Fecha: 2026-09-18 · Gate preregistrado: `docs/gates/G3-A.md` · Scope: solo
dirección exacta (MI EDIFICIO) + segundo ancla temporal (DOS AÑOS). Sin
planeamiento, sin mapa 1925, sin historias públicas, sin rutas nuevas.

---

## A. Estado remoto

`git ls-remote origin refs/heads/g3-discovery` — verificado antes de
implementar (instrucción operativa del brief).

## B. Gate SHA

`docs/gates/G3-A.md` preregistrado antes de implementación (contratos
congelados §1–§11). Sin cambios de criterio tras ver resultados.

## C. Corpus de validación congelado

`evidence/g3/g3a/address-corpus.json` — 28 casos estratificados
(bilbao-denso ×5, gran-bilbao ×6, medio ×6, rural ×3, bilingüe ×2,
portal-letra ×1, portal-bis ×1, sin-resultado ×4). Congelado antes de
implementar; **no se optimizó tras ver fallos**.

Erratas detectadas en la columna `mun_cod` del corpus (metadato, no el input):
Karrantza 49→**22**, Morga 68→**66**, Durango 34→**27**, Elantxobe 77→**31**,
Abanto 1→**2**. El runner resuelve el código desde el catálogo canónico por
nombre (como la app) y registra `corpus_mun_cod` vs `resolved_cod` por caso.
El corpus no se modificó.

## D. Resultados de resolución de identidad

`evidence/g3/g3a/corpus-results.json` (runner `app/scripts/g3a_corpus.mjs`:
cadena NORA real con el dominio compilado de `address.ts` + PIP Catastro sobre
los mismos `.pmtiles` que sirve la app, mismo ray-cast y regla fail-closed que
`MapView.resolveIdentityPoint`).

| Métrica | Valor |
|---|---|
| Casos | 28 |
| RESOLVED (calle+portal+edificio) | 14 |
| Identidad EXACT | 12 |
| Identidad MULTIPLE | 0 |
| Identidad NORA_ONLY | 2 |
| NO_STREETS | 10 |
| NO_PORTALS | 2 |
| OUT_OF_SCOPE | 1 (c20 Donostia, correcto) |
| ERROR | 0 |
| Auto-colapsos MULTIPLE→EXACT | 0 |

Clasificación de los NO_STREETS inesperados: naming NORA (204 legítimo:
«alameda de recalde», «gallarta», «zelai haundi», «korujo», inventada —
c23–c26 eran no-match esperados ✓) y pares calle↔municipio erróneos del corpus
(Bidebarrieta existe en Bilbao/Getxo/Bermeo, no en Barakaldo; Mariana Pineda
en Sestao, no Santurtzi; Itsasbide en Gorliz, no Mungia; «bermeo» es calle de
Mungia, no Elantxobe). La app muestra OUT_OF_SCOPE / «no consta» — comportamiento
fail-closed correcto.

## E. Matriz de discrepancia NORA/Catastro

| Acuerdo | n | Casos |
|---|---|---|
| BOTH_EQUAL | 8 | c01 1972, c02 1971, c03 1946, c05 1960, c09 2018, c12 1900, c19 1972, c22 1949 |
| BOTH_DIFFER | **4** | c13 Kurutziaga/Durango NORA 1979 · Cat **1900**; c15 San Lorenzo/Balmaseda 1960·1968; c16 Concha/Karrantza 1910·1941; c18 Morga 2000·1999 |
| NORA_ONLY | 2 | c06 Portugalete 1976, c14 Foru/Gernika 1987 (sin polígono Catastro en el punto) |
| CATASTRO_ONLY | 0 | — |
| BOTH_UNKNOWN | 0 | — |

Cuatro discrepancias reales entre dos fuentes oficiales — exactamente el caso
que justifica mostrar ambos años sin ganador. La UI los presenta con el copy
«Son dos fuentes oficiales distintas; mostramos ambas sin corregir una con la
otra.»

## F. MI EDIFICIO — implementación

- `app/src/lib/domain/address.ts` — cadena NORA `calles → calle/{id}/portales
  → portal/{id}/edificios`, desambiguación local por `localidad[0].entidad
  .municipio` (R1: `descMunicipio` nunca como filtro), matching exacto de
  portal en cliente con variantes visibles (R2), 204 = sin resultados (R3),
  caché de sesión en memoria (R5), `yearAgreement` con 5 estados.
- `app/src/lib/components/AddressSearch.svelte` — affordance post-RESULT
  («¿Quieres bajar hasta tu calle?»), combobox/listbox con
  `aria-expanded`/`aria-activedescendant`, ArrowDown/Escape, variantes de
  portal siempre mostradas, ficha con año Catastro + año NORA + acuerdo +
  procedencia. El texto de la dirección vive solo en el componente.
- `app/src/lib/map/MapView.svelte` — `resolveIdentityPoint`: fuente PMTiles
  municipal demand-driven, salto al punto del portal, `querySourceFeatures` +
  point-in-polygon (Polygon/MultiPolygon), dedup por id → `EXACT`/`MULTIPLE`/
  `NORA_ONLY`; `restorePendingBuilding` para `building=` (fail-closed, el id
  se conserva en `pendingBuildingId` hasta resolver para no borrar el param).

## G. DOS AÑOS — implementación

- `twoYearPartition(m, a, b)` en `metrics.ts`: mismo universo
  `CURRENT_BUILDING_STOCK`, buckets `≤ earlier` / `earlier–later` / `> later`
  / no-VALID, denominadores separados conteo (`c02`) y huella (`c06`).
- `CompareYear.svelte` + marcadores `OTRO AÑO` en `DecadeDistribution` y
  `Timeline` + leyenda de comparación + fill de edificios a 3 estados
  temporales + hatch no-VALID (sin quinto color, modelo visual §6).
- Partición real observada (Bilbao 1960/1987): 6.442 + 4.935 + 2.361 = **13.738**
  = c02 exacto · sin año utilizable: 12. Cero peticiones de red al activar
  (partición sobre métricas ya cargadas — GA12).

## H. Contrato URL/estado

- `compare=<año>` serializado/restaurado independiente de `year` (GA6: T1
  invariante — verificado en los 3 motores).
- `building=<id catastral>`: se conserva durante el restore en vuelo
  (`pendingBuildingId` serializado como fallback) y restaura
  `selectedBuilding` end-to-end — verificado `building_restored: true` en los
  3 motores. Falla cerrado si el id no existe.
- La dirección nunca entra en la URL ni en storage (`url_no_address: true`).
- Back/forward y reload reproducen place/year/compare/view/building/play/ortho.

## I. Matriz de accesibilidad

| Check | Resultado |
|---|---|
| combobox role + `aria-expanded` (cerrado/abierto) | ✓ `combobox`, `false`→`true` |
| `aria-activedescendant` tras ArrowDown | ✓ `addr-st-1`/`addr-st-0` |
| Escape cierra el listbox | ✓ `aria-expanded` → `false` |
| Multiopción (69 calles «San» Bilbao) | ✓ listbox navegable |
| Variantes de portal (11 en Gran Vía) | ✓ todas visibles, elección manual |
| axe-core sobre el flujo | **0 violaciones** |
| Journey por teclado (combobox → portal → resultado) | ✓ (cubierto por composición: inputs/botones nativos + Escape/Arrow/Enter verificados) |
| NVDA físico | PENDIENTE_HUMANO (pre-submit, no bloquea gate) |

## J. Matriz de rendimiento

Presupuesto §9: calle/portales/edificios ≤800 ms p95 · identidad ≤500 ms tras
tiles.

| Medida | Valor |
|---|---|
| Cadena completa corpus (calle→portal→edificio→identidad) | p50 **183 ms** · p95 **356 ms** · máx 420 ms |
| Peticiones al activar `compare_year` | **0** (partición sobre métricas cargadas) |
| Peticiones por frame | ninguna (syncUrl solo en eventos discretos) |
| Precarga de catálogos calle/portal | ninguna (demand-driven + caché sesión) |

## K. Matriz de regresión G1/G2

| Suite | Resultado |
|---|---|
| G2-A Play (`g2a_play.mjs`) | **20/20 PASS** (T1 invariante, T2 progression, T3 scrub/restart, T4 building filter, T5 cell contract, T6 reduced motion, T7 end state, F1–F3, A2/A3, S3 deeplink, URL-no-frame, kbd, mobile) |
| G2-B vistas (`g2b_views.mjs`) | **todos PASS** (s1/s2/s3, rules, net-no-ortho, f4 provenance/nav, axe ×5, c1 denominadores, c2 copy, a320, reduced-motion) |
| G1 smoke 3 motores | implícito en `g3a_flow.mjs`: RESULT renderiza idéntico en Chromium/Firefox/WebKit antes del flujo de dirección |
| `npm run check` | 0 errores, 0 warnings |
| `npm run lint` | limpio |
| `npm run format:check` | limpio |
| `npm run test` | **93/93** (dominio address/metrics/url + copylint + static-server) |

## L. Screenshots

`evidence/g3/g3a/browser/`:
- `g3a-address-{chromium,firefox,webkit}.png` — ficha MI EDIFICIO resuelta
- `g3a-compare-{chromium,firefox,webkit}.png` — partición DOS AÑOS
- `g3a-mobile-320.png` — viewport 320 px, sin overflow

## M. Veredicto G3-A

| # | Condición | Estado |
|---|---|---|
| GA1 | Identidad fail-closed (0 auto-colapsos) | ✅ PASS (EXACT 12, MULTIPLE 0, NORA_ONLY 2) |
| GA2 | Ambigüedad visible (calles+portales) | ✅ PASS (69 opciones calle, 11 variantes portal) |
| GA3 | Independencia Catastro/NORA | ✅ PASS (BOTH_DIFFER ×4 reales, ambos años mostrados) |
| GA4 | Cero persistencia de dirección | ✅ PASS (`url_no_address`, estado solo sesión) |
| GA5 | Partición correcta + denominadores | ✅ PASS (suma = c02 exacto, footprint separado) |
| GA6 | Invariante `selected_year` | ✅ PASS (`year_invariant` ×3 motores) |
| GA7 | Deep link `compare=` + `building=` | ✅ PASS (`compare_restored` + `building_restored` ×3) |
| GA8 | a11y combobox + axe | ✅ PASS (0 violaciones; NVDA = humano pre-submit) |
| GA9 | 320 px sin overflow, touch ≥44 | ✅ PASS (`hscroll: false`, inputs ≥44) |
| GA10 | Chromium + Firefox + WebKit | ✅ PASS (3/3, 0 errores consola) |
| GA11 | No-regresión G1/G2 | ✅ PASS (G2-A 20/20, G2-B all, smoke G1 en flow) |
| GA12 | Rendimiento §9 | ✅ PASS (p95 356 ms ≪ 800 ms; 0 req en compare) |
| GA13 | Copy semantics | ✅ PASS (copylint + literales prohibidos revisados) |

**G3-A: PASS.** Dos bugs reales encontrados y corregidos en esta verificación:
bucle de efectos Svelte (`untrack` en el puente identidad — causa del
`effect_update_depth_exceeded` y del `replaceState` de WebKit) y opciones
stale del combobox al teclear una nueva búsqueda (`streets=[]` en `oninput`,
causa del fallo Firefox). Más un overflow 320 px por `box-sizing` y el borrado
prematuro de `building=` durante el restore.

## N. Trabajo G3 restante (fuera de este gate)

- **G3-B**: planeamiento («¿Y qué está previsto?», sección editorial + WFS
  solo donde la geometría aporte) + contexto de actividad económica en las 5
  historias seleccionadas (denominador del % de solape congelado antes de
  publicar).
- **G3-C**: mapa histórico 1923–25 como superficie separada
  (`MAPA HISTÓRICO`, nunca como campaña de FOTO).
- **G3-D**: deltas entre snapshots Catastro cuando exista la segunda captura
  (`APARECE_EN_SNAPSHOT`/`DESAPARECE`/`CAMBIA_*`).
- Pendiente humano pre-submit: NVDA + móvil físico (launch-quality, no gate).
