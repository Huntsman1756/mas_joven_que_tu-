# Ensayo de publicación y rollback (repo temporal desechable)

Fecha: **2026-09-27**. Herramientas: Windows PowerShell 5.1.26100.9444,
`git version 2.55.0.windows.3`. Evidencia: `rehearsal.json` (log completo de
cada comando + checks) y `rehearsal-run.log` (salida por consola) en esta
carpeta.

## Qué se ensayó y contra qué

| Elemento | Valor |
|----------|-------|
| Origen | Git **local** en `F:\Temp\runtime\opencode\mjt-release-rehearsal\origin.git` (bare, desechable) |
| Checkout de producto | `...\mjt-release-rehearsal\product` (clon del origen local) |
| Worktree | `...\mjt-release-rehearsal\pages-wt` (rama `gh-pages`, materializado con `git worktree add`) |
| Artefactos | Sintéticos: **A** (sitio inicial con `.nojekyll`, `_app`, `data`, `fonts`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `og-card.png`, `favicon.svg`, `engine-preload.js` + archivos obsoletos `legacy.txt` y `_app/old.js`) y **B** (artefacto candidato sellado con el SHA del commit `K`) |
| Secuencia | A publicado → publicación de B (commit + push) → rollback del árbol de A mediante commit C (push) → control negativo con remoto divergente (D) |
| SHAs del ensayo | `A0=ec18cf1…`, `A=9ab7cad9…` (árbol `14d0dc3e…`), `K=f298258a…`, `B=29b4f5df…`, `C=b2ddac62…` (árbol `14d0dc3e…` = árbol de A), `D=5e274496…` |

Resultado: **REHEARSAL PASS — 34 checks, 0 fallos** (`exit=0`).

## Qué demostró (checks seleccionados)

**Publicación (`scripts/publish_pages.ps1`):**

- `pub-neg-sello` → exit≠0 **y motivo** `/SHA candidato/` (build sellado con
  `K`, pedido con `A0`).
- `pub-neg-raiz` → exit≠0 **y motivo** `/raíz del repositorio/` (destino =
  checkout del producto).
- `pub-neg-build-vacio` → exit≠0 **y motivo** `/build incompleto/`.
- Tras los tres controles negativos: worktree **limpio y todavía en A** y
  **gitfile intacto** (nada se borró).
- `pub-B/exit = 0` con `-Push`: git sigue funcionando en el worktree
  (`git rev-parse HEAD` válido), el gitfile conserva `gitdir:` apuntando a
  `product\.git\worktrees\pages-wt`, los **bytes** de `index.html` son los
  de B con el sello de `K`, `.nojekyll` presente, **`legacy.txt` y
  `_app/old.js` desaparecieron**, `origin/gh-pages` == HEAD del worktree,
  **B ≠ A** y **A es ancestro de B** (push fast-forward), y el checkout del
  producto quedó **limpio y en `K`** (no se tocó).

**Rollback (`scripts/rollback_pages.ps1`):**

- `rb-C/exit = 0` con `-Push`.
- **C ≠ B** y **C ≠ A**: es un commit nuevo, no un retroceso de puntero.
- **árbol(C) == árbol(A)** (`14d0dc3e…` en ambos) y `index.html` byte a
  byte igual al de A.
- **B sigue en el historial** (mensaje de C lo declara: «restaura árbol del
  deploy A — revierte B (sin force push)»).
- **push fast-forward**: `merge-base --is-ancestor B C` → exit 0, sin
  `--force`.
- git del worktree operativo tras restaurar; checkout del producto intacto.

**Control negativo de rollback:**

- Se crea `D` en el origen y el worktree se devuelve a `C` (HEAD ≠ remoto).
- `rb-neg-desfasado` → exit≠0 **y motivo** `/no coincide con el remoto/`.
- El origen **no cambió** (`origin/gh-pages` sigue en `D`) y el historial
  quedó intacto: el fallo no empuja ni reescribe nada.

## Límites (no son PASS de GitHub Pages)

1. **Origen local**: no se ha hecho `push` a GitHub ni se ha tocado
   `origin/gh-pages` del repositorio del producto. La publicación real en
   GitHub Pages queda **por verificar** en el momento autorizado.
2. **Artefacto sintético**: valida procedimiento (rutas, gitfile, sello,
   obsoletos, historial), no el contenido del sitio real.
3. **No hay red**: no se probó `smoke_public.mjs` contra la URL pública.
4. El repo temporal es **desechable** y está fuera del repositorio del
   producto (`F:\Temp\runtime\opencode\mjt-release-rehearsal`). Los commits
   de este ensayo **solo existen allí**.
5. GitHub Pages reconstruye en cada push (≈24 s observados históricamente):
   esa fase (build remoto + CDN) no forma parte de este ensayo.

## Defectos encontrados y corregidos por el ensayo (por qué importa)

El ensayo no solo valida el procedimiento: cazó tres defectos reales en los
propios scripts antes de tocar nada real:

1. **Comparación de rutas con formato mixto**: `git rev-parse --show-toplevel`
   devuelve `F:/…` y `Resolve-Path` devuelve `F:\…` → todos los SUTs fallaban
   en la primera validación. Corregido con normalización `GetFullPath`.
2. **`Get-Item` sin `-Force` sobre el gitfile**: Git for Windows marca
   `.git` como **HIDDEN**; `Get-Item` lo devuelve «no encontrado» y el
   script habría abortado (o, peor, un `Test-Path`+`Get-Item` inconsistente
   podría interpretarse mal). Corregido con `-Force`.
3. **stderr de git como error de PowerShell**: con `$ErrorActionPreference
   = 'Stop'`, la línea informativa `From …` de `git fetch` (stderr) lanzaba
   `NativeCommandError` y abortaba. Corregido con `Invoke-Native` (EAP
   relajado solo en la llamada + stderr a fichero temporal + código de
   salida real).
4. Bonus: `Out-String` entrega CRLF → los `-split "`n"` dejaban `\r` y la
   comparación índice↔build daba falsos negativos. Normalizado en origen.

Defectos 1–4 afectaban también al uso **real** del procedimiento: sin este
ensayo habrían aparecido el día de la publicación.
