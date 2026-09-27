<#
.SYNOPSIS
  Restaura el árbol publicado de Pages mediante un COMMIT NUEVO (sin force
  push), conservando el historial de deploys.

.DESCRIPTION
  Procedimiento ejecutable de docs/remediation/red-team-2026/RELEASE.md §5.
  El `git push origin <sha-viejo>:gh-pages` habitual se rechaza como
  non-fast-forward tras un despliegue nuevo; aquí se crea un commit C cuyo
  ÁRBOL es exactamente el del deploy a restaurar, con como padre el tip
  actual del remoto → push fast-forward, historial intacto (A → B → C) y
  mensaje que identifica qué deploy revierte.

  Validaciones previas (todo ANTES de tocar referencias):
    - rutas explícitas; destino = worktree vinculado a ESTE repo, en la rama
      esperada, limpio y con HEAD igual al tip del remoto recién obtenido;
    - el commit a restaurar existe y es ancestro del tip actual;
    - identidad git configurada;
    - el remoto se vuelve a comprobar justo antes del push: si cambió, se
      aborta sin empujar nada.

  Nota de robustez: el stderr de git (p. ej. «From …» de `fetch`) NO debe
  convertirse en error de PowerShell: toda llamada nativa pasa por
  Invoke-Native, que relaja EAP y captura stderr a un fichero temporal.

.PARAMETER Push
  Sin él solo crea el commit de restauración. Con él hace el push
  (fast-forward) tras revalidar el remoto.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [Parameter(Mandatory = $true)][string]$WorktreeDir,
  [Parameter(Mandatory = $true)][string]$RestoreTo,
  [string]$Origin = 'origin',
  [string]$Branch = 'gh-pages',
  [string]$Message,
  [string]$ReportFile,
  [switch]$Push,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$report = [ordered]@{
  utc        = (Get-Date).ToUniversalTime().ToString('o')
  script     = 'rollback_pages.ps1'
  repo       = $null
  worktree   = $null
  restore_to = $RestoreTo
  branch     = $Branch
  origin     = $Origin
  push       = [bool]$Push
  whatif     = [bool]$WhatIf
  checks     = @()
  remote_tip = $null
  reverted   = $null
  commit     = $null
  tree       = $null
  files      = 0
  pushed     = $false
  error      = $null
}

function Step([string]$name, [bool]$ok, [string]$detail = '') {
  $report.checks += [ordered]@{ check = $name; ok = [bool]$ok; detail = $detail }
  $tag = if ($ok) { 'ok  ' } else { 'FAIL' }
  Write-Host ("[{0}] {1}{2}" -f $tag, $name, $(if ($detail) { " — $detail" } else { '' }))
}
function Save-Report {
  if ($ReportFile) {
    $dir = Split-Path -Parent $ReportFile
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    ($report | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $ReportFile -Encoding UTF8
  }
}
function Fail([string]$msg) {
  $report.error = $msg
  Write-Host "ERROR: $msg" -ForegroundColor Red
  Save-Report
  exit 1
}
function Invoke-Native {
  param([string]$GitIn, [string[]]$GitArgs)
  $errFile = [System.IO.Path]::GetTempFileName()
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($GitIn) { $out = (& git -C $GitIn @GitArgs 2>$errFile | Out-String) }
    else { $out = (& git @GitArgs 2>$errFile | Out-String) }
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
  $errTxt = if (Test-Path $errFile) { (Get-Content $errFile -Raw) } else { '' }
  Remove-Item $errFile -ErrorAction SilentlyContinue
  $all = if ($errTxt) { ($out + "`n" + $errTxt) } else { $out }
  # normaliza CRLF: los `-split "`n"` posteriores no deben dejar `\r`
  $all = $all -replace "`r`n", "`n"
  return [pscustomobject]@{ Code = $code; Out = $all.TrimEnd() }
}
function Invoke-Git {
  param([string]$GitIn, [string[]]$GitArgs)
  $r = Invoke-Native $GitIn $GitArgs
  if ($r.Code -ne 0) {
    Fail ("git {0} → exit {1}: {2}" -f ($GitArgs -join ' '), $r.Code, $r.Out)
  }
  return $r.Out
}
# id de blob de Git = SHA-1 de «blob <len>\0<contenido>» sobre los BYTES en
# disco: compara contenido sin decodificar texto ni normalizar EOL.
function Get-GitBlobId([string]$path) {
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $prefix = [System.Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
  $ms = New-Object System.IO.MemoryStream
  $ms.Write($prefix, 0, $prefix.Length)
  $ms.Write($bytes, 0, $bytes.Length)
  $ms.Position = 0
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  return ([BitConverter]::ToString($sha1.ComputeHash($ms)).Replace('-', '').ToLowerInvariant())
}

# ── 0. rutas explícitas ────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Repo) -or [string]::IsNullOrWhiteSpace($WorktreeDir) -or
    [string]::IsNullOrWhiteSpace($RestoreTo)) { Fail 'rutas/SHA vacíos: Repo, WorktreeDir y RestoreTo son obligatorios' }
try { $Repo = (Resolve-Path -LiteralPath $Repo).Path } catch { Fail "Repo no existe: $Repo" }
try { $WorktreeDir = (Resolve-Path -LiteralPath $WorktreeDir).Path } catch { Fail "WorktreeDir no existe: $WorktreeDir" }
$report.repo = $Repo; $report.worktree = $WorktreeDir

# ── 1. repo raíz válido ────────────────────────────────────────────────────
if (-not (Test-Path -LiteralPath (Join-Path $Repo '.git'))) { Fail "Repo sin .git: $Repo" }
$r = Invoke-Native $Repo @('rev-parse', '--show-toplevel')
$repoTopN = if ($r.Out) { [System.IO.Path]::GetFullPath(($r.Out -split "`n")[0]).TrimEnd('\', '/') } else { '' }
$repoN = $Repo.TrimEnd('\', '/')
if ($r.Code -ne 0 -or $repoTopN -ne $repoN) { Fail "Repo no es raíz de git ($repoTopN ≠ $repoN)" }
Step 'repo_es_raiz_git' $true $Repo

# ── 2. destino = worktree vinculado, rama correcta, nunca la raíz ──────────
if ($WorktreeDir -eq $Repo) { Fail 'WorktreeDir no puede ser la raíz del repositorio' }
$gitfilePath = Join-Path $WorktreeDir '.git'
if (-not (Test-Path -LiteralPath $gitfilePath)) { Fail "el destino no contiene gitfile (.git): $WorktreeDir" }
# el gitfile puede llevar el atributo HIDDEN (Git for Windows lo marca)
if ((Get-Item -LiteralPath $gitfilePath -Force).PSIsContainer) { Fail "el destino tiene .git como CARPETA (no es worktree): $WorktreeDir" }
$gitfileContent = (Get-Content -LiteralPath $gitfilePath -Raw).Trim()
if ($gitfileContent -notmatch '^gitdir:\s') { Fail "gitfile con formato inesperado: $gitfileContent" }
$wtGitDir = $gitfileContent -replace '^gitdir:\s*', ''
if (-not [System.IO.Path]::IsPathRooted($wtGitDir)) { $wtGitDir = Join-Path $WorktreeDir $wtGitDir }
$wtGitDir = [System.IO.Path]::GetFullPath($wtGitDir)
$mainGitDir = [System.IO.Path]::GetFullPath((Join-Path $Repo '.git'))
if (-not $wtGitDir.StartsWith($mainGitDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail "el worktree no pertenece a este repo (gitdir=$wtGitDir)"
}
$r = Invoke-Native $WorktreeDir @('rev-parse', '--show-toplevel')
if ([System.IO.Path]::GetFullPath(($r.Out -split "`n")[0]).TrimEnd('\', '/') -ne $WorktreeDir.TrimEnd('\', '/')) {
  Fail "el destino no es raíz de su worktree ($($r.Out) ≠ $WorktreeDir)"
}
$r = Invoke-Native $WorktreeDir @('rev-parse', '--abbrev-ref', 'HEAD')
$wtBranch = ($r.Out -split "`n")[0].Trim()
if ($r.Code -ne 0 -or $wtBranch -ne $Branch) { Fail "el worktree está en '$wtBranch' y se esperaba '$Branch'" }
Step 'destino_es_worktree_vinculado' $true "rama $wtBranch"

$r = Invoke-Native $WorktreeDir @('status', '--porcelain')
if ($r.Out.Trim()) { Fail "worktree con cambios sin commitear:`n$($r.Out)" }
Step 'worktree_limpio' $true

$r = Invoke-Native $Repo @('config', 'user.email')
if (-not $r.Out) { Fail 'git config user.email vacío: define la identidad antes de crear el commit de rollback' }

# ── 3. remoto y commit a restaurar ─────────────────────────────────────────
$r = Invoke-Native $Repo @('fetch', $Origin, $Branch)
if ($r.Code -ne 0) { Fail "git fetch $Origin $Branch falló: $($r.Out)" }
$r = Invoke-Native $Repo @('rev-parse', "$Origin/$Branch")
if ($r.Code -ne 0) { Fail "no existe $Origin/$Branch" }
$remoteTip = ($r.Out -split "`n")[0].Trim()
$report.remote_tip = $remoteTip
Step 'remoto_obtenido' $true $remoteTip

$r = Invoke-Native $Repo @('cat-file', '-e', "$RestoreTo^{commit}")
if ($r.Code -ne 0) { Fail "el commit a restaurar no existe: $RestoreTo" }
$r = Invoke-Native $Repo @('merge-base', '--is-ancestor', $RestoreTo, $remoteTip)
if ($r.Code -ne 0) { Fail "$RestoreTo no es ancestro del tip actual ($remoteTip): el artefacto no está en la línea de la rama" }
$r = Invoke-Native $Repo @('rev-parse', "$RestoreTo^{tree}")
$restoreTree = ($r.Out -split "`n")[0].Trim()
$r = Invoke-Native $Repo @('ls-tree', '-r', '--name-only', $RestoreTo)
$restoreFiles = @(($r.Out -split "`n") | Where-Object { $_ })
$report.tree = $restoreTree
$report.files = $restoreFiles.Count
Step 'restore_to_valido' $true "ancestro de $remoteTip · árbol $restoreTree · $($restoreFiles.Count) ficheros"

$r = Invoke-Native $WorktreeDir @('rev-parse', 'HEAD')
$wtHead = ($r.Out -split "`n")[0].Trim()
if ($wtHead -ne $remoteTip) { Fail "el worktree ($wtHead) no coincide con el remoto ($remoteTip): el remoto cambió o el worktree está desactualizado — no se continúa" }
Step 'worktree_sincronizado_con_remoto' $true $wtHead

# ── 4. commit-tree: árbol exacto, padre = tip actual (sin reescribir nada) ─
if (-not $Message) {
  $Message = "rollback: restaura árbol del deploy $RestoreTo — revierte $remoteTip (sin force push)"
}
if ($WhatIf) {
  Step 'whatif' $true "se crearía commit con árbol $restoreTree sobre $remoteTip y $(if ($Push) { 'push fast-forward' } else { 'sin push' })"
  Save-Report
  exit 0
}
$report.reverted = $remoteTip
$r = Invoke-Native $Repo @('commit-tree', $restoreTree, '-p', $remoteTip, '-m', $Message)
$newCommit = ($r.Out -split "`n")[0].Trim()
if ($r.Code -ne 0 -or $newCommit -notmatch '^[0-9a-f]{40}$') { Fail "commit-tree falló: $($r.Out)" }
$report.commit = $newCommit
Step 'commit_rollback_creado' $true "$newCommit (padre $remoteTip)"

$r = Invoke-Native $Repo @('rev-parse', "$newCommit^{tree}")
$checkTree = ($r.Out -split "`n")[0].Trim()
if ($checkTree -ne $restoreTree) { Fail "el árbol del commit no es el esperado ($checkTree ≠ $restoreTree)" }
Step 'arbol_identico_al_deploy_objetivo' $true $checkTree

# ── 5. mover la rama y sincronizar el worktree (un solo paso, sin ref externo)
Invoke-Git $WorktreeDir @('reset', '--hard', $newCommit) | Out-Null
$r = Invoke-Native $WorktreeDir @('rev-parse', 'HEAD')
$wtHead2 = ($r.Out -split "`n")[0].Trim()
if ($wtHead2 -ne $newCommit) { Fail "HEAD del worktree ($wtHead2) ≠ commit nuevo ($newCommit)" }
$r = Invoke-Native $WorktreeDir @('status', '--porcelain')
if ($r.Out.Trim()) { Fail "worktree no limpio tras restaurar:`n$($r.Out)" }
Step 'worktree_restaurado' $true "HEAD $newCommit, árbol limpio"

# verificación de bytes: el contenido del worktree es el del deploy objetivo
$r = Invoke-Native $WorktreeDir @('diff', '--quiet', $RestoreTo, 'HEAD')
if ($r.Code -ne 0) { Fail 'git diff RestoreTo HEAD no está vacío: los árboles no coinciden' }
Step 'arbol_HEAD_igual_a RestoreTo' $true
$indexPath = Join-Path $WorktreeDir 'index.html'
if (-not (Test-Path -LiteralPath $indexPath)) { Fail 'index.html no existe tras restaurar' }
# byte a byte REAL (sin decodificar ni normalizar EOL): el blob id del
# index.html del worktree debe ser el blob id del deploy objetivo.
$r = Invoke-Native $Repo @('rev-parse', "${RestoreTo}:index.html")
$wantBlob = ($r.Out -split "`n")[0].Trim()
if ($wantBlob -notmatch '^[0-9a-f]{40}$') { Fail "no se pudo leer index.html del deploy objetivo: $($r.Out)" }
$haveBlob = Get-GitBlobId $indexPath
if ($haveBlob -ne $wantBlob) {
  Fail "index.html difiere del deploy objetivo (blob $haveBlob ≠ $wantBlob)"
}
Step 'index_html_byte_a_byte' $true "blob $haveBlob == ${RestoreTo}:index.html (SHA-1 de blob ⇒ bytes idénticos)"
Step 'historial_conservado' $true "$remoteTip sigue siendo padre de $newCommit (el deploy revertido no se borra)"

# ── 6. push fast-forward con revalidación del remoto ───────────────────────
if ($Push) {
  $r = Invoke-Native $Repo @('fetch', $Origin, $Branch)
  if ($r.Code -ne 0) { Fail "fetch previo al push falló: $($r.Out)" }
  $r = Invoke-Native $Repo @('rev-parse', "$Origin/$Branch")
  $nowTip = ($r.Out -split "`n")[0].Trim()
  if ($nowTip -ne $remoteTip) { Fail "el remoto cambió durante la operación ($remoteTip → $nowTip): no se empuja nada" }
  Invoke-Git $WorktreeDir @('push', $Origin, "HEAD:$Branch") | Out-Null
  $report.pushed = $true
  Step 'push_sin_force' $true "$Origin/$Branch ← $newCommit (fast-forward sobre $remoteTip)"
} else {
  Step 'push' $true 'omitido (sin -Push): solo se materializa el commit de restauración'
}

Save-Report
Write-Host ("ROLLBACK OK — commit {0} tree {1} push={2}" -f $newCommit, $restoreTree, $report.pushed)
exit 0
