<#
.SYNOPSIS
  Ensayo de publicación y rollback en un repositorio Git TEMPORAL y
  desechable (origen local, rama gh-pages, worktree, artefacto sintético).

.DESCRIPTION
  Ejercita scripts/publish_pages.ps1 y scripts/rollback_pages.ps1 de punta a
  punta y con CONTROLES NEGATIVOS, dejando evidencia en
  evidence/red-team-2026/release-rehearsal/.

  Secuencia (en el repo temporal):
    A  artefacto inicial publicado en gh-pages
    K  commit de candidato (fuente del sello del build B)
    B  publicación del artefacto B (commit + push)
    C  rollback: commit con el ÁRBOL de A, padre de B (push sin force)
    N  controles negativos de ambos scripts

  LÍMITES declarados: es un ensayo contra un origen Git LOCAL. No verifica
  GitHub Pages, ni el build real, ni la URL pública. Los commits solo existen
  en el repositorio temporal (nunca en el repo del producto).

.EXAMPLE
  powershell -File scripts\release_rehearsal.ps1
#>
[CmdletBinding()]
param(
  # Directorio NUEVO que esta ejecución creará. Si existe —cualquier cosa que
  # contenga— se rechaza: el ensayo jamás borra rutas preexistentes. Vacío =
  # directorio único bajo el temp del sistema.
  [string]$Root = '',
  [string]$OutDir = '',
  # Solo valida -Root y sale (0 aceptable / 1 rechazado). Para comprobar la
  # guarda en sí, sin ejecutar el ensayo ni crear nada.
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$SCRIPTS = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO = Split-Path -Parent $SCRIPTS
if (-not $OutDir) { $OutDir = Join-Path $REPO 'evidence\red-team-2026\release-rehearsal' }

# Guarda de la ruta de trabajo del ensayo. REGLA de seguridad: este script
# no contiene ningún borrado de $Root — crea un directorio nuevo por
# ejecución y lo deja intacto al terminar (evidencia diagnosticable).
# Rechaza: rutas existentes, raíces de unidad, el repositorio del producto
# (igual, dentro o conteniéndolo), padres inexistentes y cualquier ancestro
# reparse point/junction (que escaparía del límite indicado).
function Resolve-RehearsalRoot([string]$cand) {
  if ([string]::IsNullOrWhiteSpace($cand)) { throw 'Root vacío' }
  $full = [System.IO.Path]::GetFullPath($cand).Replace('/', '\').TrimEnd('\')
  $rootOf = ([System.IO.Path]::GetPathRoot($full) -replace '/', '\').TrimEnd('\')
  if ($full -ieq $rootOf) { throw "Root es una raíz de unidad: $full" }
  if (Test-Path -LiteralPath $full) {
    throw "Root ya existe: $full — el ensayo solo crea directorios nuevos y nunca borra rutas preexistentes"
  }
  $repoN = $REPO.TrimEnd('\', '/')
  if ($full -ieq $repoN -or
      $full.StartsWith($repoN + '\', [System.StringComparison]::OrdinalIgnoreCase) -or
      $repoN.StartsWith($full + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Root coincide con, está dentro de o contiene el repositorio del producto ($repoN): $full"
  }
  $parent = Split-Path -Parent $full
  if (-not $parent -or -not (Test-Path -LiteralPath $parent -PathType Container)) {
    throw "el directorio padre de Root no existe: $parent"
  }
  $p = $full
  while (($p = Split-Path -Parent $p)) {
    if (-not (Test-Path -LiteralPath $p)) { continue }
    if ((Get-Item -LiteralPath $p -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
      throw "un ancestro de Root es un reparse point/junction ($p): el destino real escaparía del límite indicado"
    }
  }
  return $full
}

if ($ValidateOnly) {
  try { Write-Host "ROOT OK → $(Resolve-RehearsalRoot $Root)"; exit 0 }
  catch { Write-Host "ROOT RECHAZADO → $($_.Exception.Message)"; exit 1 }
}
if (-not $Root) {
  $Root = Join-Path ([System.IO.Path]::GetTempPath()) (
    'mjt-release-rehearsal-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmss') +
    '-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
}
try { $Root = Resolve-RehearsalRoot $Root }
catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
# sello de ESTA ejecución: todos los artefactos de evidencia llevan este
# sufijo — nunca se sobrescribe la evidencia de corridas anteriores
$runStamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmss')

$log = New-Object System.Collections.Generic.List[object]
$checks = New-Object System.Collections.Generic.List[object]
$script:failed = 0

function Assert([string]$name, [bool]$cond, [string]$detail = '') {
  $checks.Add([ordered]@{ check = $name; ok = [bool]$cond; detail = $detail })
  $tag = if ($cond) { 'ok  ' } else { 'FAIL' }
  if (-not $cond) { $script:failed++ }
  Write-Host ("[{0}] {1}{2}" -f $tag, $name, $(if ($detail) { " — $detail" } else { '' }))
}
function Exec([string]$label, [string]$exe, [string[]]$argz, [int[]]$ok = @(0)) {
  $cmdStr = "$exe $($argz -join ' ')"
  Write-Host ">> [$label] $cmdStr"
  $errFile = Join-Path $env:TEMP ("mjt-rehearsal-err-" + [guid]::NewGuid().ToString('N') + '.txt')
  # Windows PowerShell 5.1 convierte el stderr de un comando nativo en
  # ErrorRecord y con EAP=Stop lanza NativeCommandError: se relaja SOLO aquí
  # para poder leer el código de salida real y registrar la salida.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = (& $exe @argz 2>$errFile | Out-String)
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
  $errTxt = if (Test-Path $errFile) { (Get-Content $errFile -Raw) } else { '' }
  Remove-Item $errFile -ErrorAction SilentlyContinue
  if ($errTxt) { $out = $out + "`n" + $errTxt }
  $log.Add([ordered]@{ label = $label; cmd = $cmdStr; exit = $code; out = $out.TrimEnd() })
  if ($ok -notcontains $code) { throw "[$label] exit=$code`n$cmdStr`n$out" }
  return $out.TrimEnd()
}
function Sut([string]$label, [string]$scriptPath, [string[]]$argz, [int[]]$ok = @(0), [switch]$Raw) {
  $all = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $scriptPath) + $argz
  $errFile = Join-Path $env:TEMP ("mjt-rehearsal-sut-" + [guid]::NewGuid().ToString('N') + '.txt')
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $out = (& powershell.exe @all 2>$errFile | Out-String)
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
  $errTxt = if (Test-Path $errFile) { (Get-Content $errFile -Raw) } else { '' }
  Remove-Item $errFile -ErrorAction SilentlyContinue
  if ($errTxt) { $out = $out + "`n" + $errTxt }
  $entry = [ordered]@{ label = $label; cmd = "powershell -File $(Split-Path $scriptPath -Leaf) $($argz -join ' ')"; exit = $code; out = $out.TrimEnd() }
  $log.Add($entry)
  if (-not $Raw) {
    $passed = ($ok -contains $code)
    $checks.Add([ordered]@{ check = "$label/exit"; ok = $passed; detail = "exit=$code (esperado: $($ok -join ','))" })
    $tag = if ($passed) { 'ok  ' } else { 'FAIL' }
    if (-not $passed) { $script:failed++ }
    Write-Host ("[{0}] {1}/exit = {2}" -f $tag, $label, $code)
  }
  return $entry
}
function Sut-ExpectFail([string]$label, [string]$scriptPath, [string[]]$argz, [string]$reasonPattern, [string]$why) {
  # control negativo: debe salir distinto de 0 Y además por el MOTIVO esperado
  $entry = Sut $label $scriptPath $argz -Raw
  Assert "$label/exit_no_cero" ($entry.exit -ne 0) "exit=$($entry.exit); esperaba: $why"
  $first = ($entry.out -split "`n")[0]
  Assert "$label/motivo_es_el_esperado" ($entry.out -match $reasonPattern) "por /$reasonPattern/ → $first"
  return $entry
}

$meta = [ordered]@{
  utc         = (Get-Date).ToUniversalTime().ToString('o')
  script      = 'release_rehearsal.ps1'
  root        = $Root
  outdir      = $OutDir
  git_version = (Exec 'git-version' 'git' @('--version'))
  powershell  = $PSVersionTable.PSVersion.ToString()
  limits      = 'Ensayo contra origen Git LOCAL. No verifica GitHub Pages ni la URL pública. Commits solo en el repositorio temporal.'
}

Write-Host '== 0. repositorio temporal (desechable; directorio nuevo, nunca borrado) =='
# -Root ya está validado y NO existe: el ensayo solo lo CREA. No hay ningún
# Remove-Item sobre rutas dadas por el usuario.
New-Item -ItemType Directory -Path $Root -Force | Out-Null
$seed = Join-Path $Root 'seed'
$origin = Join-Path $Root 'origin.git'
$product = Join-Path $Root 'product'
$wt = Join-Path $Root 'pages-wt'
$buildB = Join-Path $Root 'buildB'
New-Item -ItemType Directory -Path $seed | Out-Null

Exec 'init-seed' 'git' @('-C', $seed, 'init', '-q', '-b', 'main')
Exec 'cfg-seed-name' 'git' @('-C', $seed, 'config', 'user.name', 'Rehearsal')
Exec 'cfg-seed-mail' 'git' @('-C', $seed, 'config', 'user.email', 'rehearsal@local')

# ── A. artefacto inicial en gh-pages (rama huérfana) ───────────────────────
# A0: candidato inicial en main (el sello del artefacto A apunta a él)
Set-Content -Path (Join-Path $seed 'README.md') -Value 'seed A0' -Encoding UTF8
Exec 'commit-A0' 'git' @('-C', $seed, 'add', '-A')
Exec 'commit-A0b' 'git' @('-C', $seed, 'commit', '-q', '-m', 'candidato A0')
$A0 = (Exec 'sha-A0' 'git' @('-C', $seed, 'rev-parse', 'HEAD')).Trim()

$stampA = @"
<!doctype html><html><head><meta name="mjt:build" content="$A0" />
<title>A</title></head><body>A-index</body></html>
"@
Exec 'checkout-gh' 'git' @('-C', $seed, 'checkout', '-q', '--orphan', 'gh-pages')
Get-ChildItem -LiteralPath $seed -Force | Where-Object { $_.Name -ne '.git' } | Remove-Item -Recurse -Force
Set-Content -Path (Join-Path $seed 'index.html') -Value $stampA -Encoding UTF8
Set-Content -Path (Join-Path $seed 'como-lo-sabemos.html') -Value '<html><body>A-how</body></html>' -Encoding UTF8
Set-Content -Path (Join-Path $seed '.nojekyll') -Value '' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'robots.txt') -Value 'User-agent: *' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'sitemap.xml') -Value '<urlset/>' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'site.webmanifest') -Value '{}' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'og-card.png') -Value 'PNG-A' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'favicon.svg') -Value '<svg/>' -Encoding UTF8
Set-Content -Path (Join-Path $seed 'engine-preload.js') -Value '//A' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $seed '_app') -Force | Out-Null
Set-Content -Path (Join-Path $seed '_app\old.js') -Value '//obsoleto A' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $seed 'data') -Force | Out-Null
Set-Content -Path (Join-Path $seed 'data\x.json') -Value '{"a":1}' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $seed 'fonts') -Force | Out-Null
Set-Content -Path (Join-Path $seed 'fonts\f.css') -Value '/*A*/' -Encoding UTF8
# archivo OBSOLETO que debe desaparecer tras publicar B
Set-Content -Path (Join-Path $seed 'legacy.txt') -Value 'obsoleto que debe irse' -Encoding UTF8

Exec 'commit-A' 'git' @('-C', $seed, 'add', '-A')
Exec 'commit-Ab' 'git' @('-C', $seed, 'commit', '-q', '-m', "deploy: A from $A0")
$A = (Exec 'sha-A' 'git' @('-C', $seed, 'rev-parse', 'HEAD')).Trim()
$A_tree = (Exec 'tree-A' 'git' @('-C', $seed, 'rev-parse', 'HEAD^{tree}')).Trim()
# la HEAD del seed vuelve a main para que el clon reciba main como rama por defecto
Exec 'checkout-main-seed' 'git' @('-C', $seed, 'checkout', '-q', 'main')

# origen bare con ambas ramas
Exec 'clone-bare' 'git' @('clone', '-q', '--bare', $seed, $origin)

# ── producto: clone del origen + candidato K ───────────────────────────────
Exec 'clone-product' 'git' @('clone', '-q', $origin, $product)
Exec 'cfg-product-name' 'git' @('-C', $product, 'config', 'user.name', 'Rehearsal')
Exec 'cfg-product-mail' 'git' @('-C', $product, 'config', 'user.email', 'rehearsal@local')
Set-Content -Path (Join-Path $product 'README.md') -Value 'candidato K' -Encoding UTF8
Exec 'commit-K' 'git' @('-C', $product, 'add', '-A')
Exec 'commit-Kb' 'git' @('-C', $product, 'commit', '-q', '-m', 'candidato K')
$K = (Exec 'sha-K' 'git' @('-C', $product, 'rev-parse', 'HEAD')).Trim()
$meta.candidate_sha = $K
$meta.artifact_a = $A

# ── worktree de gh-pages (como en el procedimiento real) ───────────────────
Exec 'worktree-add' 'git' @('-C', $product, 'worktree', 'add', '-q', '-B', 'gh-pages', $wt, 'origin/gh-pages')

# ── build B sintético, sellado con K ───────────────────────────────────────
New-Item -ItemType Directory -Path $buildB -Force | Out-Null
$stampB = "<!doctype html><html><head><meta name=`"mjt:build`" content=`"$K`" />
<title>B</title></head><body>B-index</body></html>"
Set-Content -Path (Join-Path $buildB 'index.html') -Value $stampB -Encoding UTF8
Set-Content -Path (Join-Path $buildB 'como-lo-sabemos.html') -Value "<html><head><meta name=`"mjt:build`" content=`"$K`" /></head><body>B-how</body></html>" -Encoding UTF8
Set-Content -Path (Join-Path $buildB '.nojekyll') -Value '' -Encoding UTF8
Set-Content -Path (Join-Path $buildB 'robots.txt') -Value 'User-agent: *' -Encoding UTF8
Set-Content -Path (Join-Path $buildB 'sitemap.xml') -Value '<urlset/>' -Encoding UTF8
Set-Content -Path (Join-Path $buildB 'site.webmanifest') -Value '{}' -Encoding UTF8
# recurso BINARIO real (D): bytes que la decodificación de texto corrompería
# (NUL, 0xFF, CR/LF sueltos) — demuestra que la verificación no depende de
# leer los ficheros como texto.
[byte[]]$pngB = @(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0xFF,0xD8,0x0D,0x42,0x0A,0x00,0xFE)
[System.IO.File]::WriteAllBytes((Join-Path $buildB 'og-card.png'), $pngB)
Set-Content -Path (Join-Path $buildB 'favicon.svg') -Value '<svg/>' -Encoding UTF8
Set-Content -Path (Join-Path $buildB 'engine-preload.js') -Value '//B' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $buildB '_app') -Force | Out-Null
Set-Content -Path (Join-Path $buildB '_app\new.js') -Value '//nuevo B' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $buildB 'data') -Force | Out-Null
Set-Content -Path (Join-Path $buildB 'data\x.json') -Value '{"b":2}' -Encoding UTF8
New-Item -ItemType Directory -Path (Join-Path $buildB 'fonts') -Force | Out-Null
Set-Content -Path (Join-Path $buildB 'fonts\f.css') -Value '/*B*/' -Encoding UTF8

# huella del artefacto B: contrato del publicador (los bytes huellados son
# los que se publican). Mismo script que para el candidato real.
$fpB = Join-Path $Root 'fingerprint-B.json'
Exec 'fingerprint-B' 'node' @((Join-Path $SCRIPTS 'fingerprint_candidate.mjs'), '--root', $product, '--build', $buildB, '--out', $fpB)

# ══ CONTROLES NEGATIVOS de publicación (deben fallar y no tocar nada) ═════
Write-Host '== N. controles negativos de publicación =='
$emptyDir = Join-Path $Root 'empty-build'
New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null

# N1: build sellado con K pero se pide publicar con el SHA antiguo A0
Sut-ExpectFail 'pub-neg-sello' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildB, '-WorktreeDir', $wt, '-SourceSha', $A0) `
  'SHA candidato' 'el sello del build no coincide con el SHA pedido' | Out-Null

# N2: el destino es la raíz del repositorio (prohibido)
Sut-ExpectFail 'pub-neg-raiz' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildB, '-WorktreeDir', $product, '-SourceSha', $K) `
  'raíz del repositorio' 'operar sobre la raíz del repo' | Out-Null

# N3: build vacío/incompleto
Sut-ExpectFail 'pub-neg-build-vacio' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $emptyDir, '-WorktreeDir', $wt, '-SourceSha', $K) `
  'build incompleto' 'build sin index.html ni .nojekyll' | Out-Null

$wtBeforeNeg = (Exec 'wt-antes-neg' 'git' @('-C', $wt, 'status', '--porcelain') | Out-String).Trim()
$wtHeadBefore = (Exec 'wt-head-antes-neg' 'git' @('-C', $wt, 'rev-parse', 'HEAD')).Trim()
Assert 'pub-neg_sin_cambios' ($wtBeforeNeg -eq '' -and $wtHeadBefore -eq $A) "status='$wtBeforeNeg' head=$wtHeadBefore (esperado limpio y en A)"
$gitfileOk = Test-Path -LiteralPath (Join-Path $wt '.git')
Assert 'pub-neg_gitfile_intacto' $gitfileOk

# ══ PUBLICACIÓN real (local) de B ═════════════════════════════════════════
Write-Host '== P. publicación de B (commit + push al origen local) =='
Sut 'pub-B' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildB, '-WorktreeDir', $wt, '-SourceSha', $K, '-Push',
    '-FingerprintFile', $fpB,
    '-ReportFile', (Join-Path $OutDir "publish-B-$runStamp.json")) | Out-Null
# el report de la publicación acredita los bytes (no solo las rutas)
$pubReport = Get-Content -LiteralPath (Join-Path $OutDir "publish-B-$runStamp.json") -Raw | ConvertFrom-Json
foreach ($req in @('huella_corresponde_al_build', 'bytes_indice_igual_build', 'arbol_publicado_igual_build')) {
  $c = @($pubReport.checks | Where-Object { $_.check -eq $req })
  Assert "pub_reporte_$req" ($c.Count -eq 1 -and $c[0].ok) "check '$req' ausente o en fallo en publish-B.json"
}
# verificación independiente del BINARIO (D): el blob publicado es el fichero
# byte a byte — vía `hash-object --no-filters` (id de blob sobre bytes crudos,
# sin decodificación) contra el blob del commit.
$blobWt  = (Exec 'pub-blobid-ogcard' 'git' @('-C', $wt, 'rev-parse', 'HEAD:og-card.png')).Trim()
$blobRaw = (Exec 'pub-hashobj-ogcard' 'git' @('-C', $wt, 'hash-object', '--no-filters', (Join-Path $buildB 'og-card.png'))).Trim()
Assert 'pub_binario_byte_a_byte' ($blobWt -eq $blobRaw) "blob publicado=$blobWt bytes=$blobRaw"
$blobLen = (Exec 'pub-bloblen-ogcard' 'git' @('-C', $wt, 'cat-file', '-s', 'HEAD:og-card.png')).Trim()
Assert 'pub_binario_longitud' ([int]$blobLen -eq $pngB.Length) "blob=$blobLen B fichero=$($pngB.Length) B"

# verificaciones de la publicación
$gitStillWorks = (Exec 'wt-git' 'git' @('-C', $wt, 'rev-parse', '--verify', 'HEAD')).Trim()
Assert 'pub_git_sigue_funcionando' ($gitStillWorks -match '^[0-9a-f]{40}$') $gitStillWorks
$gitfile = Get-Content -LiteralPath (Join-Path $wt '.git') -Raw
Assert 'pub_gitfile_es_gitdir' ($gitfile -match '^gitdir:') $gitfile.Trim()
$idx = Get-Content -LiteralPath (Join-Path $wt 'index.html') -Raw
Assert 'pub_bytes_son_los_de_B' ($idx -like '*B-index*') ($idx -replace '\s+', ' ').Substring(0, [Math]::Min(120, $idx.Length))
Assert 'pub_sello_del_candidato' ($idx -like "*content=`"$K`"*") "K=$K"
Assert 'pub_nojekyll' (Test-Path -LiteralPath (Join-Path $wt '.nojekyll'))
Assert 'pub_obsoleto_fuera' (-not (Test-Path -LiteralPath (Join-Path $wt 'legacy.txt'))) 'legacy.txt debe desaparecer'
Assert 'pub_obsoleto_fuera_2' (-not (Test-Path -LiteralPath (Join-Path $wt '_app\old.js'))) '_app/old.js debe desaparecer'
$originTipB = (Exec 'origin-B' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
$wtHeadB = (Exec 'wt-B' 'git' @('-C', $wt, 'rev-parse', 'HEAD')).Trim()
Assert 'pub_origin_igual_wt' ($originTipB -eq $wtHeadB) "origin=$originTipB wt=$wtHeadB"
$productStatus = (Exec 'producto-status' 'git' @('-C', $product, 'status', '--porcelain') | Out-String).Trim()
$productHead = (Exec 'producto-head' 'git' @('-C', $product, 'rev-parse', 'HEAD')).Trim()
Assert 'pub_checkout_producto_intacto' ($productStatus -eq '' -and $productHead -eq $K) "status='$productStatus' head=$productHead"
# los asserts de «pasó» no pueden ser vacíos: B debe ser un commit NUEVO
# distinto de A y su hijo (por eso el push es fast-forward y A sigue debajo)
Assert 'pub_B_distinto_de_A' ($originTipB -ne $A) "A=$A B=$originTipB"
& git -C $origin merge-base --is-ancestor $A $originTipB 2>&1 | Out-Null
$ancB = $LASTEXITCODE
$log.Add([ordered]@{ label = 'pub-B_desciende-de-A'; cmd = 'git merge-base --is-ancestor A B'; exit = $ancB; out = '' })
Assert 'pub_B_desciende_de_A' ($ancB -eq 0) "A debe ser ancestro de B (exit=$ancB)"

# ══ N4. alteración del artefacto DESPUÉS de fijar la huella → rechazo ═════
Write-Host '== N4. artefacto alterado tras fijar la huella (debe rechazarse sin tocar nada) =='
$robotsPath = Join-Path $buildB 'robots.txt'
$robotsBytes = [System.IO.File]::ReadAllBytes($robotsPath)
$robotsBytes[0] = $robotsBytes[0] -bxor 0xFF          # un byte: 'U' → 0xAA
[System.IO.File]::WriteAllBytes($robotsPath, $robotsBytes)
Sut-ExpectFail 'pub-neg-huella-rota' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildB, '-WorktreeDir', $wt, '-SourceSha', $K, '-Push',
    '-FingerprintFile', $fpB) `
  'huella' 'el build ya no es el artefacto huellado' | Out-Null
$wtAfterN4 = (Exec 'n4-wt-status' 'git' @('-C', $wt, 'status', '--porcelain') | Out-String).Trim()
$wtHeadN4  = (Exec 'n4-wt-head' 'git' @('-C', $wt, 'rev-parse', 'HEAD')).Trim()
$originN4  = (Exec 'n4-origin' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
Assert 'n4_sin_push_ni_commit' ($wtAfterN4 -eq '' -and $wtHeadN4 -eq $originTipB -and $originN4 -eq $originTipB) `
  "status='$wtAfterN4' wt=$wtHeadN4 origin=$originN4 (esperado: limpio en B)"
$robotsBytes[0] = $robotsBytes[0] -bxor 0xFF          # restaurar el fixture
[System.IO.File]::WriteAllBytes($robotsPath, $robotsBytes)

# ══ CRLF. core.autocrlf=true: los bytes del artefacto se preservan ════════
Write-Host '== CRLF. publicación con core.autocrlf=true (bytes exactos o rechazo) =='
$buildC = Join-Path $Root 'buildC'
Copy-Item -LiteralPath $buildB -Destination $buildC -Recurse
# index.html con finales CRLF reales: si Git normalizara al indexar, el blob
# sería más corto que el fichero — el contraejemplo de la revisión.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$crlfIndex = "<!doctype html>`r`n<html><head>`r`n<meta name=`"mjt:build`" content=`"$K`" />`r`n<title>C</title></head><body>C-index</body></html>`r`n"
[System.IO.File]::WriteAllText((Join-Path $buildC 'index.html'), $crlfIndex, $utf8NoBom)
$fpC = Join-Path $Root 'fingerprint-C.json'
Exec 'fingerprint-C' 'node' @((Join-Path $SCRIPTS 'fingerprint_candidate.mjs'), '--root', $product, '--build', $buildC, '--out', $fpC)
Exec 'cfg-autocrlf-true' 'git' @('-C', $product, 'config', 'core.autocrlf', 'true')
$autocrlfSeen = (Exec 'cfg-autocrlf-check' 'git' @('-C', $product, 'config', 'core.autocrlf')).Trim()
Assert 'crlf_autocrlf_activo' ($autocrlfSeen -eq 'true') "autocrlf=$autocrlfSeen (contraejemplo real)"
Sut 'pub-C-crlf' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildC, '-WorktreeDir', $wt, '-SourceSha', $K, '-Push',
    '-FingerprintFile', $fpC,
    '-ReportFile', (Join-Path $OutDir "publish-C-crlf-$runStamp.json")) | Out-Null
$idxFileLen = (Get-Item -LiteralPath (Join-Path $buildC 'index.html')).Length
$idxBlobLen = (Exec 'crlf-bloblen' 'git' @('-C', $wt, 'cat-file', '-s', 'HEAD:index.html')).Trim()
Assert 'crlf_blob_conserva_crlf' ([int]$idxBlobLen -eq $idxFileLen) `
  "blob=$idxBlobLen fichero=$idxFileLen (si Git hubiera normalizado CRLF→LF el blob sería menor)"
$idxBlobId = (Exec 'crlf-blobid' 'git' @('-C', $wt, 'rev-parse', 'HEAD:index.html')).Trim()
$idxRawId  = (Exec 'crlf-rawid' 'git' @('-C', $wt, 'hash-object', '--no-filters', (Join-Path $buildC 'index.html'))).Trim()
Assert 'crlf_blobid_igual_bytes' ($idxBlobId -eq $idxRawId) "blob=$idxBlobId bytes=$idxRawId"
Exec 'cfg-autocrlf-false' 'git' @('-C', $product, 'config', 'core.autocrlf', 'false')
$wtTipC = (Exec 'tip-tras-crlf' 'git' @('-C', $wt, 'rev-parse', 'HEAD')).Trim()

# ══ N5. transformación por .gitattributes (text=) → rechazo byte a byte ═══
Write-Host '== N5. .gitattributes «text» en el artefacto (debe detectarse y rechazarse) =='
$buildD = Join-Path $Root 'buildD'
Copy-Item -LiteralPath $buildC -Destination $buildD -Recurse
[System.IO.File]::WriteAllText((Join-Path $buildD '.gitattributes'), "*.txt text`n", $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $buildD 'notas.txt'), "linea1`r`nlinea2`r`n", $utf8NoBom)
$fpD = Join-Path $Root 'fingerprint-D.json'
Exec 'fingerprint-D' 'node' @((Join-Path $SCRIPTS 'fingerprint_candidate.mjs'), '--root', $product, '--build', $buildD, '--out', $fpD)
Sut-ExpectFail 'pub-neg-transformacion' (Join-Path $SCRIPTS 'publish_pages.ps1') `
  @('-Repo', $product, '-BuildDir', $buildD, '-WorktreeDir', $wt, '-SourceSha', $K, '-Push',
    '-FingerprintFile', $fpD) `
  'transform|bytes' 'Git normalizaría CRLF→LF vía «text»: los blobs no son los bytes del artefacto' | Out-Null
$originN5 = (Exec 'n5-origin' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
Assert 'n5_sin_push' ($originN5 -eq $wtTipC) "origin=$originN5 (esperado $wtTipC): el rechazo no creó commit ni empujó"
# estado local diagnosticable → se deja limpio para el resto del ensayo
Exec 'n5-wt-reset' 'git' @('-C', $wt, 'reset', '--hard', '-q')
Exec 'n5-wt-clean' 'git' @('-C', $wt, 'clean', '-fdq')
$wtAfterN5 = (Exec 'n5-wt-status' 'git' @('-C', $wt, 'status', '--porcelain') | Out-String).Trim()
Assert 'n5_worktree_recuperado' ($wtAfterN5 -eq '') "status='$wtAfterN5'"

# ══ ROLLBACK: C = árbol de A sobre el tip actual (sin force) ══════════════
Write-Host '== R. rollback A→B→C =='
Sut 'rb-C' (Join-Path $SCRIPTS 'rollback_pages.ps1') `
  @('-Repo', $product, '-WorktreeDir', $wt, '-RestoreTo', $A, '-Push',
    '-ReportFile', (Join-Path $OutDir "rollback-C-$runStamp.json")) | Out-Null

$C = (Exec 'origin-C' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
$Ctree = (Exec 'tree-C' 'git' @('-C', $origin, 'rev-parse', 'gh-pages^{tree}')).Trim()
Assert 'rb_C_distinto_de_B' ($C -ne $wtHeadB) "B=$wtHeadB C=$C"
Assert 'rb_C_distinto_de_A' ($C -ne $A) "C debe ser un commit nuevo, no un retroceso de puntero"
Assert 'rb_arbol_C_es_arbol_A' ($Ctree -eq $A_tree) "C=$Ctree A=$A_tree"
$idxC = Get-Content -LiteralPath (Join-Path $wt 'index.html') -Raw
Assert 'rb_bytes_index_igual_A' ($idxC -like '*A-index*') ($idxC -replace '\s+', ' ').Substring(0, [Math]::Min(120, $idxC.Length))
$rbLog = (Exec 'rb-historial' 'git' @('-C', $origin, 'log', '--format=%H %s', '-5', 'gh-pages'))
Assert 'rb_B_en_historial' ($rbLog -match [regex]::Escape($wtHeadB)) ($rbLog -replace "`n", ' | ')
Assert 'rb_C_en_historial' ($rbLog -match [regex]::Escape($C)) 'C debe ser el tip'
& git -C $origin merge-base --is-ancestor $wtHeadB $C 2>&1 | Out-Null
$ffCode = $LASTEXITCODE
$log.Add([ordered]@{ label = 'rb-ff'; cmd = "git -C origin merge-base --is-ancestor B C"; exit = $ffCode; out = '' })
Assert 'rb_push_fue_fast_forward' ($ffCode -eq 0) "B es ancestro de C ⇒ push sin force (exit=$ffCode)"
$gitWtAfter = (Exec 'rb-git' 'git' @('-C', $wt, 'rev-parse', '--verify', 'HEAD')).Trim()
Assert 'rb_git_wt_funciona' ($gitWtAfter -eq $C) $gitWtAfter
$productStatus2 = (Exec 'rb-producto-status' 'git' @('-C', $product, 'status', '--porcelain') | Out-String).Trim()
Assert 'rb_checkout_producto_intacto' ($productStatus2 -eq '') "status='$productStatus2'"

# ══ CONTROL NEGATIVO de rollback: el remoto cambió inesperadamente ════════
Write-Host '== N2. control negativo de rollback (worktree desfasado del remoto) =='
# se crea un deploy D en el origen y el worktree se devuelve a C → desfase
Set-Content -Path (Join-Path $wt 'index.html') -Value "<html><body>D</body></html>" -Encoding UTF8
Exec 'rb-neg-commit-D' 'git' @('-C', $wt, 'add', '-A')
Exec 'rb-neg-commit-Db' 'git' @('-C', $wt, 'commit', '-q', '-m', 'deploy: D (divergente)')
Exec 'rb-neg-push-D' 'git' @('-C', $wt, 'push', '-q', 'origin', 'HEAD:gh-pages')
Exec 'rb-neg-reset' 'git' @('-C', $wt, 'reset', '-q', '--hard', $C)
$originTipD = (Exec 'rb-neg-origin' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
Sut-ExpectFail 'rb-neg-desfasado' (Join-Path $SCRIPTS 'rollback_pages.ps1') `
  @('-Repo', $product, '-WorktreeDir', $wt, '-RestoreTo', $A) `
  'no coincide con el remoto' 'worktree con HEAD distinto del tip del remoto' | Out-Null
$originStillD = (Exec 'rb-neg-origin-sigue' 'git' @('-C', $origin, 'rev-parse', 'gh-pages')).Trim()
Assert 'rb-neg_origen_sin_cambios' ($originStillD -eq $originTipD) "origin=$originStillD (esperado $originTipD)"
$refsAfter = (Exec 'rb-neg-log' 'git' @('-C', $origin, 'log', '--format=%H %s', '-3', 'gh-pages'))
Assert 'rb-neg_historial_no_alterado' ($refsAfter -match [regex]::Escape($originTipD)) ($refsAfter -replace "`n", ' | ')

# ══ evidencia ═════════════════════════════════════════════════════════════
$report = [ordered]@{
  meta    = $meta
  shas    = [ordered]@{ A0 = $A0; A = $A; A_tree = $A_tree; K = $K; B = $wtHeadB; B2_crlf = $wtTipC; C = $C; D = $originTipD }
  checks  = $checks
  failed  = $script:failed
  log     = $log
}
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
# fichero PROPIO por ejecución: nunca sobrescribe la evidencia de corridas
# anteriores (rehearsal.json y rehearsal-<utc>.json coexisten)
$jsonPath = Join-Path $OutDir "rehearsal-$runStamp.json"
($report | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $jsonPath -Encoding UTF8

Write-Host ''
Write-Host ("REHEARSAL {0} — {1} checks, {2} fallos" -f $(if ($script:failed -eq 0) { 'PASS' } else { 'FAIL' }), $checks.Count, $script:failed)
Write-Host "evidencia: $jsonPath"
Write-Host "repo temporal (desechable): $Root"
if ($script:failed -gt 0) { exit 1 }
exit 0
