# FASE B — Candidato, publicación y rollback (RT-01 / RT-02)

> **Nada de este documento se ha ejecutado contra el repositorio real.**
> La FASE B autoriza desarrollo local: commitear, pushear, publicar o enviar
> mensajes exige autorización expresa posterior. Lo que sí se ha ensayado es
> el **procedimiento** en un repositorio temporal desechable — ver
> `evidence/red-team-2026/release-rehearsal/REHEARSAL.md` (PASS, 34 checks)
> y, tras el refuerzo byte a byte de FASE B.2,
> `release-rehearsal/REHEARSAL-B2.md` (PASS, 50 checks).
>
> El procedimiento es ejecutable y validado:
> `scripts/publish_pages.ps1` y `scripts/rollback_pages.ps1`.

## 1. Identidad del candidato

| Qué lo identifica | Dónde se ve |
|-------------------|-------------|
| Rama + commit | `g11-visual-renewal` — en esta fase **sin commitear**: el árbol contiene la remediación |
| Sello del build | `<meta name="mjt:build" content="<sha>">` en el `<head>` de `index.html` y `como-lo-sabemos.html` (escrito por `app/scripts/seo-static-head.mjs` en cada `npm run build`). Si el árbol tiene cambios sin commitear el sello es `"<sha>+dirty(n)"` — **ese build NO es publicable**: `dirty` significa que el SHA no describe el código que corrió |
| Artefacto | `app/build/` (convención de producción: **sin** `BASE_PATH`, rutas relativas `./…`, que es lo que sirve Pages hoy; verificado también con `BASE_PATH=/mas_joven_que_tu-`) |
| Datos | snapshot 2026 congelado en `app/static/data/` + 112 SHA-256 en `evidence/g0/02-recon/recon-bizkaia.json` |
| Verificación | `docs/remediation/red-team-2026/VERIFICATION.md` y `evidence/red-team-2026/` |
| Producción actual | `origin/gh-pages` = `df842fb` (deploy «from 1848c74») — **distinto** del candidato |

**Regla de atribución:** el mensaje del commit de `gh-pages` ya no es la
única evidencia: el meta `mjt:build` del HTML declara el SHA fuente. Un
deploy correcto se reconoce porque el HTML publicado lleva sello **sin**
`+dirty`.

## 2. Condiciones previas (checklist antes de publicar)

- [ ] `git status` limpio: los cambios de la remediación commiteados en
      `g11-visual-renewal` (mensaje siguiendo el estilo del repo).
- [ ] `powershell -File scripts\verify.ps1` → **TODO OK** sobre ese commit.
- [ ] `cd app; npm ci` + suites E2E (`CI_STUBS=1`) en verde — lista en
      `VERIFICATION.md` §2.
- [ ] Build final: `cd app; npm run build` → el meta `mjt:build` **sin** `+dirty`.
- [ ] `node app/scripts/rt_pages_prefix.mjs` → 14/14 sobre ese build
      (el script fija sus rutas desde `import.meta.url`: cwd irrelevante).
- [ ] **Huella registrada**: `node scripts/fingerprint_candidate.mjs` →
      `evidence/red-team-2026/fingerprint.json` con `publishable_stamp: true`
      (el `build_sha256` del JSON es el artefacto que se publica; el build de
      SvelteKit **no** es bit-a-bit reproducible, así que se publica ese
      artefacto, no un rebuild distinto).
- [ ] Push de la rama de desarrollo y **CI verde en GitHub Actions**
      (el último run rojo de la auditoría es histórico: `g18_now_follows`
      está adjudicado y corregido, pero hasta que corra un run nuevo la CI
      roja sigue siendo el último estado publicado).
- [ ] Gates humanos abiertos aceptados o cerrados: Safari iOS físico
      (MOB-05b), NVDA (NV-18/19) — §4. Si siguen abiertos, la publicación
      debe declarar esa limitación, nunca darlas por PASADAS.
- [ ] EU: revisión nativa pendiente (RT-10) — si no se ha hecho, publicar
      con EU seleccionable es una decisión explícita, no un PASS.
## 3. Publicación (procedimiento validado; no ejecutado en el remoto real)

La rama `gh-pages` contiene el sitio en la raíz (`.nojekyll`, `_app/`,
`index.html`, `como-lo-sabemos.html`, `data/`, `fonts/`, `og-card.png`…).
Cada deploy es un commit `deploy: <descripción> from <sha-fuente>`.

El procedimiento usa **rutas absolutas** (nunca un `cd` heredado de otro
bloque) y un **worktree dedicado**: el checkout del producto no se toca y la
metadata de Git del worktree (el gitfile `.git`, que Git for Windows marca
HIDDEN) **jamás se selecciona para borrar**.

En PowerShell 5.1 `$ErrorActionPreference='Stop'` **no** convierte los exit
codes de comandos nativos en excepciones: cada comando nativo se comprueba
con `if ($LASTEXITCODE -ne 0) { throw … }` inmediatamente después, para que
un fallo detenga el procedimiento antes del siguiente paso.

```powershell
# ── 0) rutas explícitas ──────────────────────────────────────────────
$repo = 'F:\_CONCURSOS\mas_joven_que_tu'
$build = Join-Path $repo 'app\build'
$wt    = Join-Path $repo '.tmp\pages-wt'

# ── 1) candidato: commit limpio + build fresco y sellado (sin +dirty) ─
$sha = git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw "git rev-parse → $LASTEXITCODE" }
$sha = $sha.Trim()
Push-Location (Join-Path $repo 'app')
try {
  npm ci;          if ($LASTEXITCODE -ne 0) { throw "npm ci → $LASTEXITCODE" }
  npm run build;   if ($LASTEXITCODE -ne 0) { throw "npm run build → $LASTEXITCODE" }
} finally { Pop-Location }
Select-String -Path (Join-Path $build 'index.html') -Pattern 'mjt:build'
#   ⇒ content="<sha>" SIN "+dirty" y SIN "unknown"; si no coincide con
#     $sha o lleva +dirty: STOP — no seguir a la publicación

# ── 2) verificación del artefacto FINAL (smoke bajo el subpath real) ──
# rt_pages_prefix.mjs resuelve build/ y evidence/ desde su propia ruta
# (import.meta.url): el cwd de esta consola es irrelevante — esta línea
# se ha ejecutado tal cual desde un cwd ajeno (VERIFICATION.md §B.2).
node (Join-Path $repo 'app\scripts\rt_pages_prefix.mjs')   # 14/14
if ($LASTEXITCODE -ne 0) { throw "rt_pages_prefix → $LASTEXITCODE" }

# ── 2b) huella del artefacto YA verificado ───────────────────────────
# Generarla DESPUÉS del build final y de su comprobación; NO reconstruir
# ni modificar el artefacto entre este punto y la publicación (el
# publicador rechaza cualquier divergencia con esta huella).
node (Join-Path $repo 'scripts\fingerprint_candidate.mjs')
if ($LASTEXITCODE -ne 0) { throw "fingerprint → $LASTEXITCODE" }
#   ⇒ evidence\red-team-2026\fingerprint.json con publishable_stamp: true;
#     publish_pages.ps1 RECHAZA el build si difiere de esta huella

# ── 3) worktree de gh-pages ──────────────────────────────────────────
git -C $repo fetch origin gh-pages
if ($LASTEXITCODE -ne 0) { throw "git fetch → $LASTEXITCODE" }
if (Test-Path -LiteralPath (Join-Path $wt '.git')) {
  # YA existe → inspeccionar y validar, nunca borrar ni resetear a ciegas.
  # publish_pages.ps1 volverá a exigir: rama gh-pages, limpio, HEAD == tip
  # del remoto. Si algo no cuadra: resolver a mano ANTES de seguir.
  git -C $wt rev-parse --abbrev-ref HEAD     # debe imprimir gh-pages
  if ($LASTEXITCODE -ne 0) { throw "worktree branch → $LASTEXITCODE" }
  git -C $wt status --porcelain            # debe imprimir NADA
  if ($LASTEXITCODE -ne 0) { throw "worktree status → $LASTEXITCODE" }
} else {
  git -C $repo worktree add -B gh-pages $wt origin/gh-pages
  if ($LASTEXITCODE -ne 0) { throw "git worktree add → $LASTEXITCODE" }
}

# ── 4) validación en seco: NO escribe nada, termina con el plan ──────
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\publish_pages.ps1') `
  -Repo $repo -BuildDir $build -WorktreeDir $wt -SourceSha $sha -WhatIf
if ($LASTEXITCODE -ne 0) { throw "publish -WhatIf → $LASTEXITCODE" }

# ── 5) publicación: commit + push con revalidación del remoto ────────
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\publish_pages.ps1') `
  -Repo $repo -BuildDir $build -WorktreeDir $wt -SourceSha $sha -Push `
  -ReportFile (Join-Path $repo "evidence\red-team-2026\release\publish-$(Get-Date -Format yyyyMMdd-HHmm).json")
if ($LASTEXITCODE -ne 0) { throw "publish → $LASTEXITCODE" }
```

Qué valida **antes** de borrar o copiar una sola cosa (y con qué falla):

| Validación | Si falla |
|------------|----------|
| `$Repo` es raíz de git (rutas normalizadas: git devuelve `F:/…`, `Resolve-Path` devuelve `F:\…`) | sale 1, nada tocado |
| `$WorktreeDir` ≠ raíz del repo; contiene **gitfile** (no carpeta `.git`); `gitdir:` apunta a *este* repo; es raíz de su worktree; rama == `gh-pages` | sale 1, nada tocado |
| worktree **limpio** y HEAD == `origin/gh-pages` recién obtenido | sale 1, nada tocado |
| build completo (12 entradas: `index.html`, `como-lo-sabemos.html`, `.nojekyll`, `_app`, `data`, `fonts`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `og-card.png`, `favicon.svg`, `engine-preload.js`) | sale 1 |
| `<meta name="mjt:build">` en **ambas** páginas == `-SourceSha`, sin `+dirty` ni `unknown` | sale 1 |
| `-SourceSha` existe como commit | sale 1 |
| **huella del artefacto**: `fingerprint.json` (o `-FingerprintFile`) existe y `build.sha256`/`files`/`build_stamp` corresponden **a este build** — un fichero alterado tras fijar la huella hace rechazar la publicación (la huella nunca se recalcula para aceptar el cambio) | sale 1, sin tocar nada |
| (limpieza) cada entrada borrada está estrictamente dentro del worktree; **`.git` se preserva**; tras copiar, gitfile sigue ahí | sale 1 |
| `.nojekyll` llegó al destino; `git rev-parse HEAD` sigue vivo | sale 1 |
| índice == inventario del build **ruta a ruta** (sin extras ni faltantes); ninguna entrada toca `.git` | sale 1 |
| índice == build **byte a byte**: el id de blob (`ls-files -s`) de cada fichero == SHA-1 de «blob <len>\0<bytes>» del fichero en disco; el `git add` corre con `-c core.autocrlf=false -c core.safecrlf=false` **solo en esa llamada** y cualquier transformación restante (`.gitattributes` `text=`/`eol=`, filtros clean) se detecta y aborta — nombres iguales **no** bastan | sale 1, sin commit ni push |
| commit creado; `HEAD:index.html` sellado con el candidato; worktree limpio; **árbol de `HEAD` == bytes del artefacto** blob a blob (`ls-tree -r`) | sale 1 |
| con `-Push`: el remoto **no ha cambiado** desde el inicio → push fast-forward | sale 1 sin empujar |

`-ReportFile` escribe un JSON con los checks, el commit, el árbol, el nº de
ficheros y los bytes. Todo comando `git` se evalúa por **código de salida**
(la salida informativa de `git fetch` va a un fichero temporal; el stderr
nunca se convierte en error de PowerShell).

**Verificación post-publicación (obligatoria):**

```powershell
$repo = 'F:\_CONCURSOS\mas_joven_que_tu'
# smoke público real (sin stubs, contra la URL de Pages); el script no usa
# el cwd, así que se invoca por ruta absoluta
node (Join-Path $repo 'app\scripts\smoke_public.mjs')
if ($LASTEXITCODE -ne 0) { throw "smoke_public → $LASTEXITCODE → rollback (§5)" }
```

Comprobar además a mano: el HTML publicado muestra
`<meta name="mjt:build" content="<sha>">` **sin `+dirty`**, `og:title` con el subtítulo vigente
(«La edad de los edificios de Bizkaia, comparada con la tuya») y que entrar en Fotos aéreas muestra
el estado inicial con la acción.

Si el smoke falla → §5 (rollback).

## 4. Matriz de retests pendientes (RT-02) — jamás marcar PASS sin evidencia

| Gate | Qué probar | Cómo | Dónde registrar |
|------|-----------|------|-----------------|
| **MOB-05b** | iPhone Safari físico: primer viewport de «Antes/ahora», chip de campañas, sheet, teclado | Seguir el protocolo de `evidence/mobile-physical/MOB-R2.md` (candidato congelado `9a1a782`; el candidato FASE B añade cambios de copy/panel — repetir sobre el SHA final) con `app/scripts/_mob_r1_shots.mjs` desde un dispositivo real | `evidence/mobile-physical/MOB-R2.md` (nueva sección de retest) |
| **NV-18** | NVDA (Firefox o Chrome): elección de año y lugar, timeline, ficha de edificio | Smoke de `docs/ACCESSIBILITY.md`: navegar, anuncios de live region, estado del slider | `docs/ACCESSIBILITY.md` + nueva captura/nota en `evidence/` |
| **NV-19** | NVDA: estados vacíos, error de métricas, error de ortofoto y su reintento | Provocar con el modo offline del lector o con `CI_STUBS` en local | ídem |
| Safari macOS | Primer viewport, modos, Fotos aéreas (opt-in → imagen real), cambio de lugar, back/forward | **Safari.app real** en un Mac: servir el candidato (`cd app; npm run serve` → URL local) o usar la URL de Pages tras publicar; registrar versión de Safari/macOS y capturas. `BROWSER=webkit node scripts/g2b_views.mjs` ejecuta el WebKit **portado por Playwright**: acredita ese motor/binario, **no** Safari real — puede correrse como cribado adicional pero no cierra el gate. Sin acceso a un Mac → PENDIENTE | nueva nota en `VERIFICATION.md` |
| Firefox real | Ídem | **Firefox instalado del usuario**: abrir la URL local/publicada y repetir el recorrido clave (o `BROWSER=firefox` apuntando al binario real con `channel`, si la suite lo permite). `BROWSER=firefox` ejecuta el **binario de Playwright** (Firefox 155 de desarrollo), no automáticamente el Firefox del usuario. Sin acceso → PENDIENTE | ídem |

Registro mínimo exigible a cada retest: fecha, SHA/URL evaluado, dispositivo o
lector con versión, resultado PASS/FAIL con captura. **No se acepta «probado
en emulación» como sustituto.**

## 5. Rollback (procedimiento validado; no ejecutado en el remoto real)

**Por qué NO vale `git push origin <sha-viejo>:gh-pages`:** después de un
despliegue nuevo, ese push es un movimiento **hacia atrás** de la rama →
GitHub lo rechaza como *non-fast-forward*. Forzar (`--force`) borraría el
deploy intermedio del historial (la memoria de qué recibió el jurado) y
arriesga perder trabajo si otro deploy ocurrió en paralelo.

El procedimiento correcto crea un **commit C** con:

- el **árbol exacto** del deploy a restaurar (bytes idénticos),
- como **padre** el tip actual del remoto (por eso el push es
  fast-forward y no hace falta `--force`),
- un mensaje que **identifica qué deploy revierte**.

```powershell
$repo = 'F:\_CONCURSOS\mas_joven_que_tu'
$wt   = Join-Path $repo '.tmp\pages-wt'

# ── 1) identificar el deploy a recuperar (los mensajes llevan el sha fuente)
git -C $repo fetch origin gh-pages
if ($LASTEXITCODE -ne 0) { throw "git fetch → $LASTEXITCODE" }
git -C $repo log --oneline -8 origin/gh-pages
if ($LASTEXITCODE -ne 0) { throw "git log → $LASTEXITCODE" }
$restore = '<SHA del deploy a restaurar>'     # p. ej. df842fb…

# ── 2) validación en seco: NO crea commit ni toca referencias ────────
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\rollback_pages.ps1') `
  -Repo $repo -WorktreeDir $wt -RestoreTo $restore -WhatIf
if ($LASTEXITCODE -ne 0) { throw "rollback -WhatIf → $LASTEXITCODE" }

# ── 3) restauración: commit C + push fast-forward ────────────────────
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\rollback_pages.ps1') `
  -Repo $repo -WorktreeDir $wt -RestoreTo $restore -Push `
  -ReportFile (Join-Path $repo "evidence\red-team-2026\release\rollback-$(Get-Date -Format yyyyMMdd-HHmm).json")
if ($LASTEXITCODE -ne 0) { throw "rollback → $LASTEXITCODE" }
```

Qué valida y con qué falla **sin empujar nada**:

| Validación | Si falla |
|------------|----------|
| mismas garantías de ruta/worktree/rama/limpieza que la publicación (§3) | sale 1 |
| `git fetch` del remoto + `HEAD del worktree == origin/<branch>` recién obtenido (el remoto cambió o el worktree está desactualizado) | sale 1, sin crear commit |
| `-RestoreTo` existe **y es ancestro** del tip actual | sale 1 |
| `commit-tree` con el árbol de `-RestoreTo` y padre = tip → árbol idéntico verificado | sale 1 |
| `reset --hard` al commit nuevo: worktree limpio; `git diff <restoreTo> HEAD` vacío; `index.html` del worktree con **el mismo id de blob** que `${restore}:index.html` (SHA-1 de blob ⇒ bytes idénticos, sin decodificar texto ni normalizar EOL) | sale 1 |
| con `-Push`: re-fetch y **el remoto no ha cambiado** desde el inicio → push fast-forward | sale 1 sin empujar |

**Verificación tras el rollback:**

```powershell
$repo    = 'F:\_CONCURSOS\mas_joven_que_tu'
$restore = '<SHA del deploy restaurado>'   # el mismo que usó el rollback

git -C $repo fetch origin gh-pages
if ($LASTEXITCODE -ne 0) { throw "git fetch → $LASTEXITCODE" }
git -C $repo rev-parse origin/gh-pages        # = commit C
if ($LASTEXITCODE -ne 0) { throw "rev-parse → $LASTEXITCODE" }
git -C $repo diff --quiet $restore origin/gh-pages   # árbol restaurado == objetivo
if ($LASTEXITCODE -ne 0) { throw "el árbol publicado difiere del objetivo → $LASTEXITCODE" }
git -C $repo log --oneline -5 origin/gh-pages  # A … B … C: B sigue presente
if ($LASTEXITCODE -ne 0) { throw "git log → $LASTEXITCODE" }
node (Join-Path $repo 'app\scripts\smoke_public.mjs')
if ($LASTEXITCODE -ne 0) { throw "smoke_public → $LASTEXITCODE" }
```

Comprobar que el HTML publicado lleva el sello del deploy restaurado (el
sello viejo es correcto: es el artefacto que se restaura).

**Ensayo local vs verificación en Pages:** todo lo anterior se ensayó de
punta a punta (A → publicación de B → restauración de A como C, más el
control negativo de remoto divergente) contra un origen Git **local** —
`evidence/red-team-2026/release-rehearsal/REHEARSAL.md` (34 checks PASS) y,
con la verificación byte a byte de FASE B.2, `REHEARSAL-B2.md`
(50 checks PASS).
**Queda por verificar en GitHub Pages** (push real, build remoto, URL
pública) en cuanto haya autorización: mientras tanto, «rollback ensayado en
local», **no** «rollback en producción verificado».

Guardas operativas:

- Jamás `push --force` a `gh-pages` (el historial de deploys es la memoria
  de qué recibió el jurado; el propio procedimiento no lo necesita).
- No borrar evidencia de `evidence/` para «aligerar» el repo (RT-17 se
  resuelve acotando uploads futuros, nunca reescribiendo historia).
- Los reports (`publish-*.json`, `rollback-*.json`) se guardan en
  `evidence/red-team-2026/release/` para dejar constancia de cada operación
  autorizada.
