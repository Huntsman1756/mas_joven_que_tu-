<#
.SYNOPSIS
  Publica un build validado en la rama de Pages mediante un worktree dedicado,
  sin tocar el checkout de trabajo y sin tocar nunca la metadata de Git.

.DESCRIPTION
  Procedimiento ejecutable de docs/remediation/red-team-2026/RELEASE.md §3.
  Reglas:
    - todas las rutas son explícitas (no hay `cd` implícito: todo `git -C`);
    - TODA validación ocurre ANTES de borrar o copiar nada;
    - el `.git` del worktree (gitfile, atributo HIDDEN en Git for Windows)
      jamás se selecciona ni se borra;
    - el destino debe ser un worktree vinculado a ESTE repo, con HEAD igual al
      tip del remoto y en la rama esperada;
    - el build debe estar completo, sellado con el SHA candidato exacto
      (sin `+dirty`, sin `unknown`) y corresponder a la huella registrada
      (`fingerprint.json`: los bytes huellados son los que se publican);
    - tras copiar se comprueba que el índice queda igual al contenido del
      build fichero a fichero **y byte a byte** (id de blob SHA-1 del índice
      == SHA-1 de «blob <len>\0<bytes>» del fichero: si Git transforma algo al
      indexar — autocrlf, `text=`/`eol=` en .gitattributes, filtros clean —
      el id difiere y la publicación se rechaza);
    - el staging se ejecuta con `-c core.autocrlf=false -c core.safecrlf=false`
      SOLO en esa llamada (no se toca la config del usuario): los bytes del
      árbol publicado son los del artefacto verificado;
    - tras el commit se vuelve a comprobar el ÁRBOL resultante contra el
      build (blob a blob);
    - cada `git` se comprueba por código de salida: el script falla alto.

  Nota de robustez: el stderr de git (p. ej. «From …» de `fetch`) NO debe
  convertirse en error de PowerShell: toda llamada nativa pasa por
  Invoke-Native, que relaja EAP y captura stderr a un fichero temporal.

.PARAMETER Push
  Sin él solo prepara el commit. Con él, tras revalidar que el remoto no ha
  cambiado desde el inicio, hace el push (fast-forward).

.EXAMPLE
  powershell -File scripts\publish_pages.ps1 -Repo <repo> -BuildDir <build> `
    -WorktreeDir <worktree> -SourceSha <sha> -WhatIf
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [Parameter(Mandatory = $true)][string]$BuildDir,
  [Parameter(Mandatory = $true)][string]$WorktreeDir,
  [Parameter(Mandatory = $true)][string]$SourceSha,
  [string]$Origin = 'origin',
  [string]$Branch = 'gh-pages',
  [string]$Message,
  [string]$ReportFile,
  [string]$FingerprintFile,
  [switch]$Push,
  [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$report = [ordered]@{
  utc        = (Get-Date).ToUniversalTime().ToString('o')
  script     = 'publish_pages.ps1'
  repo       = $null
  build      = $null
  worktree   = $null
  source_sha = $SourceSha
  branch     = $Branch
  origin     = $Origin
  push       = [bool]$Push
  whatif     = [bool]$WhatIf
  checks     = @()
  build_files = 0
  staged_files = 0
  staged_bytes = 0
  fingerprint = $null
  build_sha256 = $null
  commit     = $null
  tree       = $null
  pushed     = $false
  error      = $null
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

# misma huella agregada que scripts/fingerprint_candidate.mjs (treeHash):
# rutas relativas ordenadas por unidades UTF-16 con separador '\', cada
# línea «rel('/')\0sha256hex», unidas con '\n', SHA-256 UTF-8 del conjunto.
function Get-TreeSha256([string]$dir) {
  $base = $dir.TrimEnd('\', '/')
  $skip = @('node_modules', '.svelte-kit', '__pycache__')
  $rels = @(
    Get-ChildItem -LiteralPath $base -Recurse -File -Force |
      Where-Object {
        $parts = $_.FullName.Substring($base.Length + 1) -split '[\\/]'
        -not (@($parts | Where-Object { $skip -contains $_ }).Count)
      } |
      ForEach-Object { $_.FullName.Substring($base.Length + 1) }
  )
  [Array]::Sort($rels, [System.StringComparer]::Ordinal)
  $lines = foreach ($rel in $rels) {
    $h = (Get-FileHash -LiteralPath (Join-Path $base $rel) -Algorithm SHA256).Hash.ToLowerInvariant()
    "{0}`0{1}" -f ($rel -replace '\\', '/'), $h
  }
  $utf8 = [System.Text.Encoding]::UTF8
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $digest = [BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($lines -join "`n"))).Replace('-', '').ToLowerInvariant()
  return @{ sha256 = $digest; files = $rels.Count }
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
# Llamada nativa segura: stderr a fichero temporal y EAP relajado solo aquí
# (Windows PowerShell 5.1 convierte el stderr nativo en ErrorRecord y con
# EAP=Stop lanza NativeCommandError aunque se redirija con 2>&1).
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
  # Out-String entrega líneas con CRLF: sin normalizar, los `-split "`n"`
  # dejan un `\r` final y la comparación índice↔build da falsos negativos
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

# ── 0. normalización y guardas de ruta ─────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Repo) -or [string]::IsNullOrWhiteSpace($BuildDir) -or
    [string]::IsNullOrWhiteSpace($WorktreeDir) -or [string]::IsNullOrWhiteSpace($SourceSha)) {
  Fail 'rutas/SHA vacíos: se requiere Repo, BuildDir, WorktreeDir y SourceSha explícitos'
}
try { $Repo = (Resolve-Path -LiteralPath $Repo).Path } catch { Fail "Repo no existe: $Repo" }
try { $BuildDir = (Resolve-Path -LiteralPath $BuildDir).Path } catch { Fail "BuildDir no existe: $BuildDir" }
try { $WorktreeDir = (Resolve-Path -LiteralPath $WorktreeDir).Path } catch { Fail "WorktreeDir no existe: $WorktreeDir (materialízalo antes: git worktree add)" }
$report.repo = $Repo; $report.build = $BuildDir; $report.worktree = $WorktreeDir

# ── 1. el repo debe ser una raíz de git válida ─────────────────────────────
if (-not (Test-Path -LiteralPath (Join-Path $Repo '.git'))) { Fail "Repo sin .git: $Repo" }
$r = Invoke-Native $Repo @('rev-parse', '--show-toplevel')
if ($r.Code -ne 0 -or -not $r.Out) { Fail "git rev-parse falló en Repo: $Repo" }
# git en Windows devuelve rutas con '/': se normalizan los dos lados
$repoTopN = [System.IO.Path]::GetFullPath($r.Out.Split("`n")[0]).TrimEnd('\', '/')
$repoN = $Repo.TrimEnd('\', '/')
if ($repoTopN -ne $repoN) { Fail "Repo no es la raíz del worktree ($repoTopN ≠ $repoN)" }
Step 'repo_es_raiz_git' $true $Repo

# ── 2. el destino es un worktree vinculado a ESTE repo (nunca la raíz) ─────
if ($WorktreeDir -eq $Repo) { Fail 'WorktreeDir no puede ser la raíz del repositorio' }
$gitfilePath = Join-Path $WorktreeDir '.git'
if (-not (Test-Path -LiteralPath $gitfilePath)) { Fail "el destino no contiene gitfile (.git): $WorktreeDir" }
# el gitfile puede llevar el atributo HIDDEN (Git for Windows lo marca):
# Test-Path/Get-Content lo ven, pero Get-Item necesita -Force
if ((Get-Item -LiteralPath $gitfilePath -Force).PSIsContainer) {
  Fail "el destino tiene .git como CARPETA: no es un worktree (¿repo normal o copia?): $WorktreeDir"
}
$gitfileContent = (Get-Content -LiteralPath $gitfilePath -Raw).Trim()
if ($gitfileContent -notmatch '^gitdir:\s') { Fail "gitfile con formato inesperado: $gitfileContent" }
$wtGitDir = $gitfileContent -replace '^gitdir:\s*', ''
if (-not [System.IO.Path]::IsPathRooted($wtGitDir)) { $wtGitDir = Join-Path $WorktreeDir $wtGitDir }
$wtGitDir = [System.IO.Path]::GetFullPath($wtGitDir)
$mainGitDir = [System.IO.Path]::GetFullPath((Join-Path $Repo '.git'))
if (-not $wtGitDir.StartsWith($mainGitDir, [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail "el worktree no pertenece a este repo (gitdir=$wtGitDir fuera de $mainGitDir)"
}
$r = Invoke-Native $WorktreeDir @('rev-parse', '--show-toplevel')
if ($r.Code -ne 0 -or [System.IO.Path]::GetFullPath($r.Out.Split("`n")[0]).TrimEnd('\', '/') -ne $WorktreeDir.TrimEnd('\', '/')) {
  Fail "el destino no es la raíz de su worktree ($($r.Out) ≠ $WorktreeDir)"
}
$r = Invoke-Native $WorktreeDir @('rev-parse', '--abbrev-ref', 'HEAD')
$wtBranch = $r.Out.Split("`n")[0].Trim()
if ($r.Code -ne 0 -or $wtBranch -ne $Branch) { Fail "el worktree está en '$wtBranch' y se esperaba '$Branch'" }
Step 'destino_es_worktree_vinculado' $true "gitdir → $wtGitDir; rama $wtBranch"

# estado limpio y sincronizado con el remoto ANTES de tocar nada
$r = Invoke-Native $WorktreeDir @('status', '--porcelain')
if ($r.Out.Trim()) { Fail "el worktree tiene cambios sin commitear (no se publica sobre un estado desconocido):`n$($r.Out)" }
Step 'worktree_limpio' $true
$r = Invoke-Native $Repo @('fetch', $Origin, $Branch)
if ($r.Code -ne 0) { Fail "git fetch $Origin $Branch falló: $($r.Out)" }
$r = Invoke-Native $Repo @('rev-parse', "$Origin/$Branch")
if ($r.Code -ne 0) { Fail "no existe $Origin/$Branch" }
$remoteTip = $r.Out.Split("`n")[0].Trim()
$r = Invoke-Native $WorktreeDir @('rev-parse', 'HEAD')
$wtHead = $r.Out.Split("`n")[0].Trim()
if ($wtHead -ne $remoteTip) { Fail "el worktree ($wtHead) no está en el tip del remoto ($remoteTip): re-materializa con 'git worktree add'" }
$report.remote_tip = $remoteTip
Step 'worktree_en_tip_remoto' $true $remoteTip

# ── 3. el build está completo y sellado con el SHA candidato ───────────────
$required = @('index.html', 'como-lo-sabemos.html', '.nojekyll', '_app', 'data', 'fonts',
  'robots.txt', 'sitemap.xml', 'site.webmanifest', 'og-card.png', 'favicon.svg', 'engine-preload.js')
$missing = @($required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $BuildDir $_)) })
if ($missing.Count) { Fail "build incompleto, faltan: $($missing -join ', ')" }
Step 'build_completo' $true "$($required.Count) entradas requeridas presentes"

foreach ($page in @('index.html', 'como-lo-sabemos.html')) {
  $html = Get-Content -LiteralPath (Join-Path $BuildDir $page) -Raw
  $m = [regex]::Match($html, 'name="mjt:build"\s+content="([^"]+)"')
  if (-not $m.Success) { Fail "$page sin <meta name=`"mjt:build`">" }
  $stamp = $m.Groups[1].Value
  if ($stamp -ne $SourceSha) { Fail "$page sellado con '$stamp' ≠ SHA candidato '$SourceSha'" }
  if ($stamp -match '\+dirty' -or $stamp -eq 'unknown') {
    Fail "$page con sello no publicable ('$stamp'): reconstruye desde un árbol limpio"
  }
}
Step 'sello_mjt_build' $true "$SourceSha (sin +dirty/unknown) en index.html y como-lo-sabemos.html"

$r = Invoke-Native $Repo @('cat-file', '-e', "$SourceSha^{commit}")
if ($r.Code -ne 0) { Fail "el SHA candidato no existe en el repo: $SourceSha" }
Step 'source_sha_existe' $true $SourceSha

# inventario del build (ficheros relativos, separador /)
$buildFiles = Get-ChildItem -LiteralPath $BuildDir -Recurse -File -Force |
  ForEach-Object { $_.FullName.Substring($BuildDir.Length + 1).Replace('\', '/') } | Sort-Object
$report.build_files = $buildFiles.Count
if ($buildFiles.Count -lt 10) { Fail "el build solo tiene $($buildFiles.Count) ficheros: ¿build vacío?" }
Step 'build_con_archivos' $true "$($buildFiles.Count) ficheros"

# ── 3b. huella: los bytes registrados son los bytes que se publican ───────
# Contrato: el árbol Git publicado debe contener EXACTAMENTE los bytes del
# artefacto huellado en la verificación (salvo una transformación explícita
# anterior a fijar la huella). fingerprint.json ausente, de otro build o de
# otro sello → rechazo; NUNCA se actualiza la huella para aceptar el cambio.
$buildHash = Get-TreeSha256 $BuildDir
$report.build_sha256 = $buildHash.sha256
if (-not $FingerprintFile) { $FingerprintFile = Join-Path $Repo 'evidence\red-team-2026\fingerprint.json' }
$report.fingerprint = $FingerprintFile
if (-not (Test-Path -LiteralPath $FingerprintFile)) {
  Fail "huella del artefacto ausente: $FingerprintFile — ejecuta scripts/fingerprint_candidate.mjs tras el último build verificado"
}
try { $fp = Get-Content -LiteralPath $FingerprintFile -Raw | ConvertFrom-Json }
catch { Fail "fingerprint.json ilegible: $($_.Exception.Message)" }
if (-not $fp.build -or -not $fp.build.sha256) { Fail "fingerprint sin sección build.sha256: $FingerprintFile" }
if ($fp.build.sha256 -ne $buildHash.sha256 -or [int]$fp.build.files -ne $buildHash.files) {
  Fail ("la huella no corresponde a ESTE build — fingerprint: {0} ficheros, sha256 {1}; build actual: {2} ficheros, sha256 {3}. " +
        "Un archivo cambiado tras fijar la huella invalida el artefacto verificado: vuelve a verificar y rehuella, no se publica.") -f
    $fp.build.files, $fp.build.sha256, $buildHash.files, $buildHash.sha256
}
if ($fp.build_stamp -ne $SourceSha) { Fail "la huella es de un build con sello '$($fp.build_stamp)' ≠ candidato '$SourceSha'" }
if ($fp.publishable_stamp -ne $true) { Fail "publishable_stamp ≠ true en la huella (sello '$($fp.build_stamp)')" }
Step 'huella_corresponde_al_build' $true "$($buildHash.files) ficheros, sha256 $($buildHash.sha256.Substring(0,16))…, sello $($fp.build_stamp)"

# ── 4. plan (WhatIf termina aquí) ──────────────────────────────────────────
if ($WhatIf) {
  Step 'whatif' $true "se validarían y sustituirían los contenidos de $WorktreeDir por $($buildFiles.Count) ficheros; commit en '$Branch' y $(if ($Push) { 'push' } else { 'sin push' })"
  Save-Report
  exit 0
}

# ── 5. limpiar TODO menos el gitfile, con validación por entrada ───────────
$wtPrefix = $WorktreeDir.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$entries = @(Get-ChildItem -LiteralPath $WorktreeDir -Force)
$preserved = 0; $removed = 0
foreach ($e in $entries) {
  if ($e.Name -eq '.git') { $preserved++; continue }
  $full = $e.FullName
  if ([string]::IsNullOrWhiteSpace($full)) { Fail 'entrada con ruta vacía: aborto' }
  $full = [System.IO.Path]::GetFullPath($full)
  if (-not $full.StartsWith($wtPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail "entrada fuera del worktree: $full"
  }
  if ($full -eq $WorktreeDir) { Fail 'intento de borrar la propia raíz del worktree: aborto' }
  Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction Stop
  $removed++
}
if ($preserved -ne 1) { Fail "se esperaba exactamente 1 gitfile preservado, hubo $preserved" }
if (-not (Test-Path -LiteralPath $gitfilePath)) { Fail 'el gitfile desapareció tras la limpieza: aborto' }
Step 'limpieza_preserva_gitfile' $true "gitfile intacto; $removed entradas eliminadas"

# ── 6. copiar el build (incluye .nojekyll) ─────────────────────────────────
foreach ($e in @(Get-ChildItem -LiteralPath $BuildDir -Force)) {
  Copy-Item -LiteralPath $e.FullName -Destination $WorktreeDir -Recurse -Force -ErrorAction Stop
}
if (-not (Test-Path -LiteralPath (Join-Path $WorktreeDir '.nojekyll'))) { Fail '.nojekyll no llegó al destino: Pages lo necesita' }
Step 'nojekyll_presente' $true

# git sigue vivo después de la sustitución
$r = Invoke-Native $WorktreeDir @('rev-parse', '--verify', 'HEAD')
if ($r.Code -ne 0 -or $r.Out.Split("`n")[0].Trim() -ne $remoteTip) { Fail "git quedó dañado tras copiar: $($r.Out)" }
Step 'git_integro_tras_copia' $true $remoteTip

# ── 7. staging preservando bytes + verificación índice == build ───────────
# `-c` en ESTA llamada (nunca en la config del usuario): autocrlf/safecrlf
# no pueden rescribir los bytes al indexar. Si otra transformación sobrevive
# (atributo text=/eol= del propio árbol, filtro clean), la comparación de
# blobs siguiente la detecta y aborta.
Invoke-Git $WorktreeDir @('-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', 'add', '-A') | Out-Null
$r = Invoke-Native $WorktreeDir @('ls-files')
$staged = @($r.Out -split "`n" | Where-Object { $_ } | ForEach-Object { $_.Replace('\', '/') } | Sort-Object)
$report.staged_files = $staged.Count
$stagedSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
foreach ($f in $staged) { [void]$stagedSet.Add($f) }
$buildSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
foreach ($f in $buildFiles) { [void]$buildSet.Add($f) }
$onlyBuild = @($buildFiles | Where-Object { -not $stagedSet.Contains($_) })
$onlyIndex = @($staged | Where-Object { -not $buildSet.Contains($_) })
if ($onlyBuild.Count -or $onlyIndex.Count) {
  Fail ("índice ≠ build | faltan: {0} | sobran: {1}" -f (($onlyBuild | Select-Object -First 10) -join ', '), (($onlyIndex | Select-Object -First 10) -join ', '))
}
$report.staged_bytes = (Get-ChildItem -LiteralPath $BuildDir -Recurse -File -Force | Measure-Object Length -Sum).Sum
Step 'rutas_indice_igual_build' $true "$($staged.Count) rutas indexadas == inventario del build (sin extras ni faltantes)"

# byte a byte: el blob indexado debe ser EXACTAMENTE el fichero del build.
# El id de blob es SHA-1 de «blob <len>\0<contenido>»: si Git transformó
# algo al indexar (autocrlf, atributo text=/eol=, filtro clean) el id difiere
# del calculado sobre los bytes en disco → se rechaza; no se publica «casi»
# el artefacto verificado.
$r = Invoke-Native $WorktreeDir @('ls-files', '-s', '-z')
if ($r.Code -ne 0) { Fail "git ls-files -s falló: $($r.Out)" }
$stagedBlobs = @{}
foreach ($e in ($r.Out -split "`0" | Where-Object { $_ })) {
  if ($e -match '^\d{6} ([0-9a-f]{40}) \d\t(.*)$') { $stagedBlobs[$Matches[2]] = $Matches[1] }
}
$sep = [System.IO.Path]::DirectorySeparatorChar
$byteMismatch = @()
$expectedBlobs = @{}
foreach ($f in $buildFiles) {
  $expectedBlobs[$f] = Get-GitBlobId (Join-Path $BuildDir ($f -replace '/', $sep))
}
foreach ($f in $buildFiles) {
  if (-not $stagedBlobs.ContainsKey($f)) { $byteMismatch += "$f (ausente del índice)" }
  elseif ($stagedBlobs[$f] -ne $expectedBlobs[$f]) { $byteMismatch += "$f (blob $($stagedBlobs[$f].Substring(0,12))… ≠ bytes $($expectedBlobs[$f].Substring(0,12))…)" }
}
if ($byteMismatch.Count) {
  Fail ("el índice NO contiene los bytes del artefacto verificado — Git transformó contenido al indexar " +
        "(revisa core.autocrlf/eol, .gitattributes del worktree y filtros clean); no se publica:`n" +
        (($byteMismatch | Select-Object -First 10) -join "`n"))
}
Step 'bytes_indice_igual_build' $true "$($buildFiles.Count) blobs del índice == bytes del build (SHA-1 de blob)"

$r = Invoke-Native $WorktreeDir @('status', '--porcelain')
$stagedDirtyGit = @(($r.Out -split "`n") | Where-Object { $_ -match '\.git$' })
if ($stagedDirtyGit.Count) { Fail "el índice toca metadata de git: $($stagedDirtyGit -join '; ')" }
Step 'git_metadata_intacta' $true 'ninguna entrada toca .git'

# ── 8. commit ──────────────────────────────────────────────────────────────
if (-not $Message) { $Message = "deploy: publicación desde $SourceSha" }
$identity = (Invoke-Native $Repo @('config', 'user.email')).Out
if (-not $identity) { Fail 'git config user.email vacío: define la identidad antes de publicar' }
Invoke-Git $WorktreeDir @('commit', '-m', $Message) | Out-Null
$r = Invoke-Native $WorktreeDir @('rev-parse', 'HEAD')
$commit = $r.Out.Split("`n")[0].Trim()
$r = Invoke-Native $WorktreeDir @('rev-parse', 'HEAD^{tree}')
$tree = $r.Out.Split("`n")[0].Trim()
$report.commit = $commit; $report.tree = $tree
Step 'commit_creado' $true "$commit ($($staged.Count) ficheros)"

$r = Invoke-Native $WorktreeDir @('status', '--porcelain')
if ($r.Out.Trim()) { Fail "worktree no limpio tras commit:`n$($r.Out)" }
$r = Invoke-Native $WorktreeDir @('show', 'HEAD:index.html')
if ($r.Out -notmatch [regex]::Escape("content=`"$SourceSha`"")) { Fail 'HEAD:index.html no lleva el sello del candidato' }
Step 'commit_verificado' $true "tree $tree; HEAD:index.html sellado con el candidato"

# el ÁRBOL del commit publicado contiene los bytes del artefacto, blob a blob
$r = Invoke-Native $WorktreeDir @('ls-tree', '-r', '-z', 'HEAD')
if ($r.Code -ne 0) { Fail "git ls-tree falló: $($r.Out)" }
$treeBlobs = @{}
foreach ($e in ($r.Out -split "`0" | Where-Object { $_ })) {
  # formato por defecto con -z: «<mode> blob <sha>\t<path>»
  if ($e -match '^\d{6} blob ([0-9a-f]{40})\t(.*)$') { $treeBlobs[$Matches[2]] = $Matches[1] }
}
$treeMismatch = @($buildFiles | Where-Object { -not $treeBlobs.ContainsKey($_) -or $treeBlobs[$_] -ne $expectedBlobs[$_] })
$treeExtra = @($treeBlobs.Keys | Where-Object { -not $buildSet.Contains($_) })
if ($treeMismatch.Count -or $treeExtra.Count -or $treeBlobs.Count -ne $buildFiles.Count) {
  Fail ("el árbol publicado NO coincide byte a byte con el artefacto | difieren: {0} | extras: {1}" -f
    (($treeMismatch | Select-Object -First 10) -join ', '), (($treeExtra | Select-Object -First 10) -join ', '))
}
Step 'arbol_publicado_igual_build' $true "tree $tree contiene exactamente los $($buildFiles.Count) blobs del artefacto"

# ── 9. push (opcional) con revalidación del remoto ─────────────────────────
if ($Push) {
  $r = Invoke-Native $Repo @('fetch', $Origin, $Branch)
  if ($r.Code -ne 0) { Fail "fetch previo al push falló: $($r.Out)" }
  $r = Invoke-Native $Repo @('rev-parse', "$Origin/$Branch")
  $nowTip = $r.Out.Split("`n")[0].Trim()
  if ($nowTip -ne $remoteTip) { Fail "el remoto cambió durante la operación ($remoteTip → $nowTip): no se empuja nada" }
  Invoke-Git $WorktreeDir @('push', $Origin, "HEAD:$Branch") | Out-Null
  $report.pushed = $true
  Step 'push' $true "$Origin/$Branch ← $commit"
} else {
  Step 'push' $true 'omitido (sin -Push): solo se materializa el commit'
}

Save-Report
Write-Host ("PUBLISH OK — commit {0} tree {1} push={2}" -f $commit, $tree, $report.pushed)
exit 0
