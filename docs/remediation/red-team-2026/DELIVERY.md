# FASE B / B.1 / B.2 — Resumen, pendientes y recomendación

## Revisión posterior: 28-09-2026

**Actualización posterior autorizada:** revisión subida y publicada, fuente
`2920278`, Pages `9e87d90`; registro definitivo en
`evidence/final-candidate-20260928/RELEASE.md`. El estado local descrito a
continuación corresponde al momento anterior a esa autorización.

La entrega local ES/EU y audiovisual posterior a la publicación se documenta en
`evidence/final-candidate-20260928/REVIEW.md` (ruta desde la raíz). Incluye
memoria PDF, resumen PDF y ZIP reproducibles con `scripts/build_submission_package.py`.
No confundir esta revisión sin commit/push/deploy con la publicación 4b1b0c8 / 21316b3.
La lista administrativa y humana vigente está en `docs/submission/FINAL-CHECKLIST.md`.

## Registro anterior

Fecha: **2026-09-27**. Alcance: auditoría `docs/red-team/` (FASE A) + revisión
posterior (FASE B.1) + cierre acotado de sus cuatro pendientes (FASE B.2).
El detalle finding-a-finding está en `MATRIX.md`; las pruebas en
`VERIFICATION.md`; el procedimiento de release en `RELEASE.md`.

**FASE B.2 (cuatro pendientes de la revisión de B.1):** ejecutor de
controles negativos restaurado y verificado con corrida nueva (4 fallos
detectados por su aserto + normal PASS + self-test anti-PASS-vacío);
publicación ahora **byte a byte** (id de blob índice/árbol ↔ artefacto,
huella `fingerprint.json` obligatoria, `autocrlf` neutralizado solo en la
llamada de staging, transformaciones restantes detectadas); el ensayo ya
**no borra** `-Root` (directorio nuevo único por ejecución + guarda
validada con fixtures); `RELEASE.md` coherente (invocación del smoke de
subpath verificada tal cual desde cwd ajeno; matriz de retests sin
equivalencias falsas). Ensayo completo: **50/50 PASS**
(`release-rehearsal/rehearsal-20260927T175238Z.json` y `REHEARSAL-B2.md`).

**FASE B.3 (tres ajustes residuales):** los informes del smoke quedan
ligados a su ejecución por `LAUNCH_RUN_ID` (el juez rechaza informes
ajenos, aunque sean recientes); `RELEASE.md` detiene el procedimiento ante
cualquier exit ≠0 de un comando nativo — demostrado con
`scripts/release_doc_steps_test.ps1`, que extrae los bloques íntegros del
documento y los ejecuta en repos temporales con origen local
(`doc-steps-20260927T195628Z.json`, 28/28; pasos de producto/producción con
dobles declarados — mecánica probada, no el producto ni GitHub Pages); y la
huella ya no afirma procedencia causal (identifica fuentes incluidas y
bytes del artefacto; la correspondencia depende del proceso registrado).

**Etapa editorial (2026-09-28):** subtítulo descriptivo («La edad de los
edificios de Bizkaia, comparada con la tuya»), acceso opcional «Ver un
ejemplo» al capítulo Mungia sin formulario, bloque «En síntesis» en los
cinco capítulos, sección «Comprueba un resultado» con CSV de casos
descargable, y paquete de evaluación en `docs/submission/` (guion de demo
incluido; grabación pendiente del congelado). Verificación:
`editorial_verify.mjs` 21/21 sobre el build con prefijo de Pages +
`rt_pages_prefix` 14/14 + journey Chromium PASS. La revisión detectó y se
corrigió una regresión: «Ver un ejemplo» repetido convertía el ancla del
capítulo en selección personal (resultado sin año); `closeStory` ahora
restaura el snapshot completo y vuelve a portada solo cuando no había
lugar personal. El nombre del producto se mantiene. Detalle en
`VERIFICATION.md` §12c.

**PUBLICACIÓN REAL EJECUTADA (2026-09-27):** candidato `4b1b0c8`
publicado en GitHub Pages — commit `21316b3` sobre `gh-pages` (deploy
anterior `df842fb` intacto en el historial). `smoke_public.mjs` 7/7 contra
la URL real; `mjt:build` sin `+dirty` en ambas páginas publicadas; og:title
con el subtítulo vigente. Push de `g11-visual-renewal` + CI remoto verde
(run 36354590504). Incidencias resueltas en el camino: push protection
bloqueó un token `pk.` de tercero en evidencia del benchmark (redactado);
dos fallos de E2E en CI (aserto de denominadores tras el cambio de copy —
actualizado a la redacción vigente; carrera «Cargando» en g12 — wait
añadido). Evidencia: `evidence/red-team-2026/release/publish-20260927-2224.json`.
Los gates humanos (MOB-05b, NV-18/19, Safari/Firefox reales, EU nativo,
zoom real) siguen abiertos y no se declaran superados; la publicación no
es la presentación al concurso (trámite administrativo aparte).

## 1. Qué ha cambiado (resumen)

**Producto / interfaz**

1. **Fotos aéreas con estado inicial explícito** (RT-03): «La imagen aún no
   está activada…» + «Ver la campaña de {year}»; 0 peticiones de ortofoto
   hasta activar; 8 rutas de entrada verificadas.
2. **Verdad en la cifra** (RT-04): `fmtPctEdge` (`<0,1 %` / `>99,9 %`), sin
   «exacta», sin línea de cifra con denominador 0 **y** —*B.1*— estado
   explícito cuando `c02 = 0`: titular, recuento, resumen accesible,
   histograma, comparación de dos años, cálculo y chip de celda dejan de
   afirmar una conclusión que los datos no permiten (los ceros verdaderos con
   denominador positivo se conservan).
3. **Unidad en el contraste** (RT-05) y **hallazgo visible** (RT-06) con el
   universo real (celda 500 m, 70 edificios de Mungia).
4. **Compartir transparente** (RT-11) y **leyenda honesta** (RT-19).
5. **Hero responsive** (RT-12): −79 % de bytes (1.309.435 → 272.473).
6. **Motor con estado de error + recarga** (RT-16) y **población sin
   duplicar / singulares** (RT-18).
7. **Claim social coherente** (RT-21) y **tarjeta OG** regenerada.

**Datos, pipeline y CI**

8. **Validación de frontera profunda con motivo** (RT-20, *reabierto en B.1*):
   filas `dist`/`cum`, constantes, orden y coherencias C-01…C-06; barrido de
   catálogo + 112 municipios + 112 métricas (todos validan); **botón
   «Reintentar cargar los datos»** junto al fallo (recuperable en el sitio).
9. **Fallback de `AbortSignal.timeout`** (RT-15), **`cookie@0.7.2`** sin
   downgrade (RT-14), **uploads de CI acotados** (RT-17), **TLS honesto** con
   4 tests (RT-22).
10. **RT-13, *reabierto en B.1***: aserto de pausa **más** aserto en vivo
    coherente (`g18_now_follows_live`, 44 checks) con control negativo.

**Procedimiento de release (nuevos en B.1, P0)**

11. `scripts/publish_pages.ps1` y `scripts/rollback_pages.ps1`: validación
    total antes de tocar nada, gitfile preservado (`-Force` por atributo
    HIDDEN), rutas absolutas, exit codes, `-WhatIf` y reports; rollback por
    **commit C** (árbol del deploy objetivo, padre = tip) → push
    fast-forward **sin force** y con mensaje que indica qué deploy revierte.
    Ensayo en repo temporal desechable: **34/34** con 4 controles negativos
    (`release-rehearsal/REHEARSAL.md`); **B.2**: byte a byte real (blobs),
    huella exigible y 7 controles negativos — **50/50**
    (`release-rehearsal/REHEARSAL-B2.md`).
12. **Smoke de lanzamiento que puede fallar**: semántica estricta
    (intención/URL/petición/respuesta/cobertura/contenido + lugar esperado),
    `exit≠0` ante fallo obligatorio, cierre garantizado, un JSON POR corrida
    con procedencia, y **4 controles negativos locales** que lo demuestran.
13. **Nombres y asertos honestos**: `--csszoom400` (declara que NO es zoom
    de navegador), `--reflow` con dimensiones y auditoría de scroll fuera del
    mapa, `--textspacing` con aserto de aplicación observable; capturas
    revisadas visualmente.

**Documentación**

14. README, memoria y `docs/submission/*` contra el producto real (RT-07/08/09);
    `PRODUCT.md` y `UX_COPY.md` al día con cada cambio de copy; lista de revisión
    EU ampliada a **21 claves** de B/B.1 (paridad **531/531**).

## 2. Decisiones de NO cambio (y por qué)

| No se hizo | Razón |
|------------|-------|
| Activar automáticamente una campaña al entrar en Fotos | rompería el opt-in de red (`net_no_ortho_on_switch`); se eligió el estado inicial con acción (la otra alternativa autorizada) |
| Reintentos en bucle del motor (RT-16) | el *module map* cachea el fallo del especificador (verificado): el reintento en sesión no emite petición; la recuperación real es recargar |
| `npm audit fix` automático | proponía downgrade pre-1.0; se usó un override acotado a `cookie` |
| Instalar Maestro/SDK/emulador nuevo o crear una segunda suite web | la mención de Maestro no autoriza descargas; el emulador disponible falla (ANR) y no cierra gates físicos |
| Zoom real del navegador (1.4.4) como PASS | la herramienta no expone el nivel de zoom; se declara PENDIENTE en vez de sustituirlo por CSS zoom |
| Reescribir `g4_scene_stories.mjs` para ponerlo en verde | sus fallos son preexistentes (era G8/MOB) y su cobertura está en `g8_viewer`/`g2b_views` |
| Regenerar el pipeline de datos completo | no hace falta para verificar y mezclaría un corte nuevo con el snapshot publicado |
| Borrar `zoom-400.png` (artefacto antiguo mal nombrado) | es evidencia histórica; el sustituto correcto es `csszoom-400.png` |
| Tocar contratos, denominadores, clasificación de años, fuentes, paleta/tipografía, stack, MOB-R2 | `DO_NOT_TOUCH.md`; ninguna regresión demostrada |
| Reportaje largo / segundo producto / nuevos datasets / IA / backend / sexto modo | fuera de alcance y contraproducente para la categoría |
| Commit / push / deploy / presentación | requieren autorización expresa |
| Reescribir `docs/red-team/` ni historial Git | registro fechado |
| Nuevo ADR | ninguna decisión cambia la arquitectura (estados de UI, sello de build, fallbacks) |

## 3. Pendientes

> **Siguiente etapa (fuera de alcance de esta tarea):** el registro
> `NEXT_EDITORIAL_DELIVERY.md` (añadido por el usuario durante la ronda)
> recoge las recomendaciones de presentación editorial —entrada «Ver un
> ejemplo», conclusiones de capítulos, vídeo de 60–90 s con subtítulos,
> paquete de evaluación compacto, «Comprueba este resultado», valoración de
> imágenes y posible renombra— **para retomar cuando se cierre esta ronda**.
> No se ha modificado la implementación por esas propuestas ni se han
> decidido vídeo/imágenes/renombre.

**Técnicos (locales, sin dependencia externa)**

- Ninguno bloqueante. Quedan explícitos como PENDIENTE: zoom real de
  navegador (1.4.4) y espaciado nativo (la simulación por inyección no los
  sustituye).

**Humanos / dispositivos**

| # | Qué | Cómo |
|---|-----|------|
| 1 | MOB-05b — iPhone Safari físico | `RELEASE.md` §4 + protocolo de `evidence/mobile-physical/MOB-R2.md` sobre el SHA final |
| 2 | NV-18 / NV-19 — NVDA real | `RELEASE.md` §4 + `docs/ACCESSIBILITY.md` |
| 3 | Safari macOS / Firefox instalados | navegador real del usuario sobre la URL candidata (`RELEASE.md` §4); `BROWSER=webkit\|firefox` usa los binarios de Playwright —cribado, no acredita el navegador real |
| 4 | **NATIVE_EU_REVIEW** (21 claves B/B.1 + 24 heredadas + corpus) | `EU_NATIVE_REVIEW.md` |
| 5 | Revisión visual de capturas nuevas (`rt04b-*`, `textspacing`, `csszoom`, `reflow-320`) | lectura directa en `evidence/` |

**Administrativos**

| # | Qué |
|---|-----|
| 6 | Solicitud en el modelo oficial, representación y declaraciones (Bases 2/5/6/7) — canal oficial; sin datos personales en el repo |
| 7 | Revalidar publicación BOB y correcciones antes de cerrar (`CONTEST_2026_CONTRACT.md`) |
| 8 | Decisión sobre EU al publicar (borrador declarado o desactivado) |

**Autorización (no ejecutados por diseño)**

| # | Qué |
|---|-----|
| 9 | **Commit** de la remediación (mientras exista `+dirty` el build no es publicable) |
| 10 | **Push + CI remoto** (el último run sigue siendo el fallo de `54e3519`) |
| 11 | **Publicación** (`RELEASE.md` §3) y verificación con `smoke_public.mjs` |
| 12 | Rollback real si el smoke post-publicación falla (`RELEASE.md` §5) |
| 13 | Presentación de la candidatura |

## 4. Riesgos residuales

1. Gates físicos abiertos (Safari iOS, NVDA): usabilidad/accesibilidad sin
   certificar en esos entornos.
2. EU sin revisión nativa: paridad ≠ calidad lingüística.
3. CI remota sin ejecutar sobre este código: el primer push puede revelar
   diferencias de entorno (se prevé verde: el fallo `g18_now_follows` está
   adjudicado y corregido; `g14_eu_qa` ya no depende del selector obsoleto).
4. Servicios externos en runtime (ortofotos, cartografía, NORA): el fallo se
   declara en pantalla, pero la demo puede quedar sin imagen.
5. Snapshot vs fuente viva: sin `data/raw/` conservado, reproducir exige
   re-descargar (declarado en memoria §5).
6. El build no es bit-a-bit reproducible (SvelteKit estampa cada corrida);
   se publica el artefacto huellado, no «cualquier rebuild igual».
7. Hosting sin previews sociales por query (no se prometen).

## 5. Recomendación GO / NO-GO por paso

| Paso | Recomendación | Condición |
|------|---------------|-----------|
| **1. Commit** | **GO** (recomendación, no autorización) | `verify.ps1` TODO OK (hecho), huella nueva con sello **limpio** tras el commit, mensaje en el estilo del repo; nada de `docs/red-team/` reescrito |
| **2. Push + CI remoto** | **GO** tras el commit | esperar el run completo; si falla, adjudicar con la misma disciplina (no mover umbrales). No empujar con la CI roja conocida sin leer el nuevo run |
| **3. Publicación** | **GO condicionado** | checklist de `RELEASE.md` §2 completo (sello sin `+dirty`, `verify.ps1`, suites, `rt_pages_prefix` 14/14, fingerprint registrado **y exigido por el publicador**), gates físicos aceptados **con su limitación declarada**, y procedimiento ensayado (**50/50** en B.2, incl. byte a byte, CRLF y post-huella). Publicar con `publish_pages.ps1 -WhatIf` primero y guardar el report en `evidence/red-team-2026/release/` |
| **4. Presentación de candidatura** | **NO-GO todavía** | requiere: trámite administrativo (paso 6), revalidación BOB (7), decisión de EU (8) y —si se quiere sin límites— cierre de MOB-05b/NV-18/19 (1–2). Publicar sin esos gates es aceptable **solo** declarándolos abiertos |

En resumen: **el trabajo local está completo**; lo que falta no es código
sino autorización (9–13), hardware/lectores (1–4) y trámite (6–8). No se
garantiza ganar el concurso; se garantiza que lo entregable está probado,
documentado y es evaluable.
