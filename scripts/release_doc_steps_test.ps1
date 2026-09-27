<#
.SYNOPSIS
  Ensayo de FASE B.3: ejecuta los BLOQUES ÍNTEGROS documentados en
  docs/remediation/red-team-2026/RELEASE.md (extrayéndolos del propio archivo
  en tiempo de ejecución) dentro de repositorios temporales con origen Git
  LOCAL, y demuestra con centinelas que un fallo detiene el procedimiento
  antes del siguiente paso.

  El artefacto es SINTÉTICO (no es el build del producto) y el smoke de
  producción se sustituye por un doble HTTP local explícito. Este ensayo
  prueba la MECÁNICA documentada (secuencia + stop-on-fail), no el producto
  ni GitHub Pages.

  Sustituciones declaradas (registradas en la evidencia):
    S1  literal del repo → ruta del producto temporal
    S2  npm ci / npm run build → doble (el artefacto sintético ya existe)
    S3  rt_pages_prefix.mjs → doble (su PASS real se verifica aparte)
    S4  fingerprint_candidate.mjs → mismo script real + --root/--build/--out
    S5  publish_pages.ps1 / rollback_pages.ps1 → scripts reales del repo
    S6  smoke_public.mjs → doble HTTP local sobre el worktree
    S7  marcadores $restore → SHA real del deploy A del escenario
    S8  -SourceSha $sha → SHA ajeno (SOLO en el caso negativo N3)
  Todo lo demás del texto de los bloques se ejecuta literalmente,
  incluidos todos los `if ($LASTEXITCODE -ne 0) { throw }`.

  Evidencia: evidence/red-team-2026/doc-steps-<utc>.json
#>
[CmdletBinding()]
param(
  # debe ser una ruta NUEVA; nunca se borra nada preexistente
  [string]$Root = ''
)
$ErrorActionPreference = 'Stop'
$Repo0 = Split-Path -Parent $PSScriptRoot
$Repo0 = (Resolve-Path -LiteralPath $Repo0).Path
$Utc = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')

if ($Root) {
  $full = [IO.Path]::GetFullPath($Root)
  if (Test-Path -LiteralPath $full) { throw "Root ya existe: $full — este ensayo solo crea directorios nuevos" }
  $root = $full
} else {
  $root = Join-Path $env:TEMP ("b3-doc-steps-" + $Utc + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
}
New-Item -ItemType Directory -Path $root | Out-Null

$checks = [ordered]@{}
$log = [System.Collections.Generic.List[string]]::new()
function ok([string]$n, $c, [string]$d = '') {
  $checks[$n] = @{ ok = [bool]$c; detalle = $d }
  $log.Add(($(if ($c) { 'ok  ' } else { 'FAIL' })) + " $n" + $(if ($d) { " — $d" }))
}
function GitX([string]$cwd, [string[]]$a) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { $o = & git -C $cwd @a 2>&1 | Out-String }
  finally { $ErrorActionPreference = $prev }
  @{ Code = $LASTEXITCODE; Out = $o.Trim() }
}
function ShaOf([string]$cwd, [string]$ref) { (GitX $cwd @('rev-parse', $ref)).Out.Trim() }
function Sha256([string]$s) {
  $h = [Security.Cryptography.SHA256]::Create()
  [BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes($s))).Replace('-', '').ToLower()
}

# ── extracción de los fences powershell del RELEASE.md vigente ────────
$relPath = Join-Path $Repo0 'docs\remediation\red-team-2026\RELEASE.md'
$md = [IO.File]::ReadAllText($relPath, [Text.Encoding]::UTF8)
$fences = @()
foreach ($m in [regex]::Matches($md, '(?ms)```powershell\s*\r?\n(.*?)```')) { $fences += $m.Groups[1].Value }
$fPub   = $fences | Where-Object { $_ -like '*publish_pages.ps1*' } | Select-Object -First 1
$fSmoke = $fences | Where-Object { $_ -like '*smoke_public.mjs*' } | Select-Object -First 1
$fRb    = $fences | Where-Object { $_ -like '*rollback_pages.ps1*' } | Select-Object -First 1
$fRbV   = $fences | Where-Object { $_ -like '*diff --quiet*' } | Select-Object -First 1
foreach ($p in 'fPub', 'fSmoke', 'fRb', 'fRbV') {
  ok "doc_fence_$p" ($null -ne (Get-Variable $p -ValueOnly)) 'bloque encontrado en RELEASE.md'
}
$fenceHash = @{}
foreach ($p in 'fPub', 'fSmoke', 'fRb', 'fRbV') {
  $v = Get-Variable $p -ValueOnly
  if ($null -ne $v) { $fenceHash[$p] = Sha256 $v }
}

# ── dobles explícitos (S2/S3/S6): registran su paso y simulan fallo con
#    DOBLE_FAIL_AT=<paso>; 'smoke' exige HTTP 200 + marca en el HTML ─────
$double = Join-Path $root 'doc-double.mjs'
$dobleCode = @'
const [step, url, want] = process.argv.slice(2);
if (process.env.DOBLE_FAIL_AT === step) {
  console.log(`DOBLE FAIL forzado en ${step}`);
  process.exit(1);
}
if (step === 'smoke') {
  let r;
  try { r = await fetch(url); } catch { console.log('DOBLE SMOKE FAIL sin respuesta'); process.exit(1); }
  const t = await r.text();
  const okRun = r.status === 200 && t.includes(want);
  console.log(`DOBLE SMOKE ${okRun ? 'OK' : 'FAIL'} status=${r.status}`);
  process.exit(okRun ? 0 : 1);
}
console.log(`DOBLE OK ${step}`);
'@
[IO.File]::WriteAllText($double, $dobleCode, (New-Object Text.UTF8Encoding($false)))

# ── adaptación: tabla de sustituciones declarada ──────────────────────
function Adapt([string]$code, [hashtable]$scn, [int]$smokePort = 4977, [string]$smokeWant = 'mjt:build') {
  $fpOut = Join-Path $scn.product 'evidence\red-team-2026\fingerprint.json'
  $code = $code.Replace('F:\_CONCURSOS\mas_joven_que_tu', $scn.product)                    # S1
  # OJO: anclar en el ';' — los throw del doc citan el comando en el mensaje
  # ('throw "npm ci → ..."') y una sustitución sin ancla corrompería la cadena
  $code = $code.Replace('npm run build;', "node `"$double`" npm-build;")                 # S2
  $code = $code.Replace('npm ci;', "node `"$double`" npm-ci;")                           # S2
  $code = $code.Replace("node (Join-Path `$repo 'app\scripts\rt_pages_prefix.mjs')",
                        "node `"$double`" prefix")                                       # S3
  $code = $code.Replace("(Join-Path `$repo 'scripts\fingerprint_candidate.mjs')",
                        "`"$(Join-Path $Repo0 'scripts\fingerprint_candidate.mjs')`" --root `"`$repo`" --build `"`$build`" --out `"$fpOut`"")  # S4
  $code = $code.Replace("(Join-Path `$repo 'scripts\publish_pages.ps1')",
                        "`"$(Join-Path $Repo0 'scripts\publish_pages.ps1')`"")           # S5
  $code = $code.Replace("(Join-Path `$repo 'scripts\rollback_pages.ps1')",
                        "`"$(Join-Path $Repo0 'scripts\rollback_pages.ps1')`"")          # S5
  $code = $code.Replace("node (Join-Path `$repo 'app\scripts\smoke_public.mjs')",
                        "node `"$double`" smoke `"http://127.0.0.1:$smokePort/index.html`" `"$smokeWant`"")  # S6
  if ($scn.A) {
    $code = $code.Replace('<SHA del deploy a restaurar>', $scn.A)                        # S7
    $code = $code.Replace('<SHA del deploy restaurado>', $scn.A)                         # S7
  }
  return $code
}

function Run-Frag([string]$name, [string]$code, [hashtable]$envX = @{}) {
  $f = Join-Path $root "$name.ps1"
  [IO.File]::WriteAllText($f, $code, (New-Object Text.UTF8Encoding($true)))
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $saveEnv = @{}
  foreach ($k in $envX.Keys) { $saveEnv[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $envX[$k]) }
  try { $o = & powershell -NoProfile -ExecutionPolicy Bypass -File $f 2>&1 | Out-String }
  finally {
    $ErrorActionPreference = $prev
    foreach ($k in $envX.Keys) { [Environment]::SetEnvironmentVariable($k, $saveEnv[$k]) }
  }
  @{ Code = $LASTEXITCODE; Out = $o.Trim(); File = $f }
}

# ── escenario temporal: origen local + producto + artefacto sintético ──
function New-Scenario([string]$name) {
  $base = Join-Path $root $name
  New-Item -ItemType Directory -Path $base | Out-Null
  $seed = Join-Path $base 'seed'; $origin = Join-Path $base 'origin.git'; $product = Join-Path $base 'product'
  New-Item -ItemType Directory -Path $seed | Out-Null
  [void](GitX $seed @('init', '-b', 'main'))
  [void](GitX $seed @('config', 'user.email', 'b3@local')); [void](GitX $seed @('config', 'user.name', 'b3'))
  Set-Content (Join-Path $seed 'P.txt') 'k0'
  [void](GitX $seed @('add', '.')); [void](GitX $seed @('commit', '-q', '-m', 'K0'))
  [void](GitX $seed @('checkout', '--orphan', 'gh-pages'))
  [void](GitX $seed @('rm', '-rf', '-q', '.'))
  [void](GitX $seed @('clean', '-fdxq'))
  Set-Content (Join-Path $seed 'index.html') "<html><meta name=""mjt:build"" content=""A""></html>"
  [void](GitX $seed @('add', '-A')); [void](GitX $seed @('commit', '-q', '-m', 'deploy A'))
  $A = ShaOf $seed 'gh-pages'
  [void](GitX $seed @('checkout', '-q', 'main'))
  git init --bare -q $origin 2>$null | Out-Null
  [void](GitX $seed @('remote', 'add', 'origin', $origin))
  [void](GitX $seed @('push', '-q', 'origin', 'main', 'gh-pages'))
  git clone -q $origin $product 2>$null | Out-Null
  [void](GitX $product @('config', 'user.email', 'b3@local')); [void](GitX $product @('config', 'user.name', 'b3'))
  Set-Content (Join-Path $product 'K.txt') 'candidato'
  [void](GitX $product @('add', '.')); [void](GitX $product @('commit', '-q', '-m', 'K'))
  $K = ShaOf $product 'HEAD'
  # artefacto sintético en la ruta del documento: $repo\app\build
  # (los pasos npm del bloque son dobles: el artefacto ya existe)
  $buildK = Join-Path $product 'app\build'
  foreach ($e in @('index.html', 'como-lo-sabemos.html', '.nojekyll', 'robots.txt', 'sitemap.xml',
                   'site.webmanifest', 'og-card.png', 'favicon.svg', 'engine-preload.js',
                   '_app\x.js', 'data\x.json', 'fonts\x.woff2')) {
    $f = Join-Path $buildK $e
    New-Item -ItemType Directory -Path (Split-Path $f) -Force | Out-Null
    if ($e -eq '.nojekyll') { [IO.File]::WriteAllBytes($f, @()) }
    elseif ($e -like '*.html') {
      [IO.File]::WriteAllBytes($f, [Text.Encoding]::UTF8.GetBytes("<html><meta name=""mjt:build"" content=""$K""></html>"))
    } else { [IO.File]::WriteAllBytes($f, [Text.Encoding]::UTF8.GetBytes("$e")) }
  }
  @{ base = $base; origin = $origin; product = $product; build = $buildK
     wt = (Join-Path $product '.tmp\pages-wt'); K = $K; A = $A }
}

function Serve-Worktree([string]$wt, [int]$port) {
  $p = Start-Process -PassThru -WindowStyle Hidden -FilePath node `
    -ArgumentList "`"$(Join-Path $Repo0 'app\scripts\static-server.mjs')`"", "$port", "`"$wt`""
  Start-Sleep -Milliseconds 900
  return $p
}

# ══ CASO P: recorrido positivo — bloques ÍNTEGROS del documento ═══════
$s = New-Scenario 'pos'
$frag = (Adapt $fPub $s) + "`nSet-Content -LiteralPath '$root\sent-pub.txt' -Value 'alcanzado'`n"
$rPub = Run-Frag 'frag-pub' $frag
ok 'pos_bloque_publicacion_exit0' ($rPub.Code -eq 0) "exit=$($rPub.Code)"
ok 'pos_bloque_publicacion_sentinela' (Test-Path "$root\sent-pub.txt") 'el bloque llegó al final'
ok 'pos_bloque_publicacion_push' ((ShaOf $s.origin 'refs/heads/gh-pages') -ne $s.A) 'origin gh-pages avanzó'
ok 'pos_bloque_publicacion_sello' ((GitX $s.wt @('show', 'HEAD:index.html')).Out -like "*$($s.K)*") 'index.html publicado con sello K'

# segundo paso por el MISMO bloque: el worktree ya existe → rama de
# inspección/validación (se cambia un byte del artefacto: re-publicar
# contenido idéntico debe fallar en «git commit», no se prueba aquí)
Set-Content (Join-Path $s.build 'cambio.txt') 'v2'
$frag2 = (Adapt $fPub $s) + "`nSet-Content -LiteralPath '$root\sent-pub2.txt' -Value 'alcanzado'`n"
$rPub2 = Run-Frag 'frag-pub2' $frag2
ok 'pos_wt_existente_exit0' ($rPub2.Code -eq 0) "exit=$($rPub2.Code) — bloque íntegro con worktree preexistente"

# smoke post-publicación (fence §3 completo; doble HTTP sobre el worktree)
$srv = Serve-Worktree $s.wt 4977
$frag = (Adapt $fSmoke $s 4977 'mjt:build') + "`nSet-Content -LiteralPath '$root\sent-smoke.txt' -Value 'alcanzado'`n"
$rSmoke = Run-Frag 'frag-smoke' $frag
Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
ok 'pos_smoke_post' ($rSmoke.Code -eq 0 -and (Test-Path "$root\sent-smoke.txt")) "exit=$($rSmoke.Code) — doble HTTP local, NO GitHub Pages"

# rollback documentado (fence §5 íntegro) + verificación (fence §5b íntegro)
$frag = (Adapt $fRb $s) + "`nSet-Content -LiteralPath '$root\sent-rb.txt' -Value 'alcanzado'`n"
$rRb = Run-Frag 'frag-rb' $frag
ok 'pos_bloque_rollback_exit0' ($rRb.Code -eq 0) "exit=$($rRb.Code)"
ok 'pos_rollback_arbol' ((ShaOf $s.origin 'gh-pages^{tree}') -eq (ShaOf $s.origin "$($s.A)^{tree}")) 'árbol publicado == árbol de A'

$srv = Serve-Worktree $s.wt 4978
$frag = (Adapt $fRbV $s 4978 'content="A"') + "`nSet-Content -LiteralPath '$root\sent-rbv.txt' -Value 'alcanzado'`n"
$rRbV = Run-Frag 'frag-rbv' $frag
Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
ok 'pos_verify_rollback' ($rRbV.Code -eq 0 -and (Test-Path "$root\sent-rbv.txt")) "exit=$($rRbV.Code) — diff --quiet + doble local del smoke"

# ══ CASO N1: fallo en la etapa «build» del MISMO bloque (doble falla) ══
$n1 = New-Scenario 'neg-build'
$frag = (Adapt $fPub $n1) + "`nSet-Content -LiteralPath '$root\sent-n1.txt' -Value 'alcanzado'`n"
$rn1 = Run-Frag 'frag-n1' $frag @{ DOBLE_FAIL_AT = 'npm-build' }
ok 'neg_build_exit_no0' ($rn1.Code -ne 0) "exit=$($rn1.Code)"
ok 'neg_build_paso' ($rn1.Out -like '*DOBLE FAIL forzado en npm-build*') 'la salida registra el paso exacto que falló'
ok 'neg_build_detuvo' (-not (Test-Path "$root\sent-n1.txt")) 'centinela de fin NO escrito — el throw del bloque detuvo el resto'
ok 'neg_build_sin_fetch' ((GitX $n1.product @('rev-parse', '--verify', 'refs/heads/gh-pages')).Code -ne 0) 'la rama local gh-pages nunca se creó (fetch/worktree no se ejecutaron)'

# ══ CASO N2: fallo en preparación git (fetch) del MISMO bloque ════════
$n2 = New-Scenario 'neg-fetch'
[void](GitX $n2.product @('remote', 'set-url', 'origin', (Join-Path $n2.base 'NO-EXISTE.git')))
$frag = (Adapt $fPub $n2) + "`nSet-Content -LiteralPath '$root\sent-n2.txt' -Value 'alcanzado'`n"
$rn2 = Run-Frag 'frag-n2' $frag
ok 'neg_fetch_exit_no0' ($rn2.Code -ne 0) "exit=$($rn2.Code)"
ok 'neg_fetch_paso' ($rn2.Out -like '*git fetch*') 'el throw procede del paso git fetch del bloque'
ok 'neg_fetch_detuvo' (-not (Test-Path "$root\sent-n2.txt")) 'centinela de fin NO escrito'
ok 'neg_fetch_sin_worktree' (-not (Test-Path $n2.wt)) 'git worktree add nunca se ejecutó'

# ══ CASO N3: -WhatIf del MISMO bloque falla (S8: SourceSha ajeno) ══════
$n3 = New-Scenario 'neg-whatif'
$fN3 = (Adapt $fPub $n3).Replace('-SourceSha $sha', "-SourceSha '$($n3.A)'")   # S8
$frag = $fN3 + "`nSet-Content -LiteralPath '$root\sent-n3.txt' -Value 'alcanzado'`n"
$rn3 = Run-Frag 'frag-n3' $frag
ok 'neg_whatif_exit_no0' ($rn3.Code -ne 0) "exit=$($rn3.Code)"
ok 'neg_whatif_paso' ($rn3.Out -like '*WhatIf*' -or $rn3.Out -like '*-WhatIf*') 'el throw procede del paso -WhatIf'
ok 'neg_whatif_detuvo' (-not (Test-Path "$root\sent-n3.txt")) 'centinela de fin NO escrito'
ok 'neg_whatif_sin_push' ((ShaOf $n3.origin 'refs/heads/gh-pages') -eq $n3.A) 'origin gh-pages intacto (publish -Push no se ejecutó)'

# ══ CASO N4: smoke post-publicación del DOCUMENTO contra puerto muerto ═
# mismo fence §3, mismo throw del documento, doble apuntando a un puerto
# donde no escucha nadie
$frag = (Adapt $fSmoke $s 4999 'mjt:build') + "`nSet-Content -LiteralPath '$root\sent-n4.txt' -Value 'alcanzado'`n"
$rn4 = Run-Frag 'frag-n4' $frag
ok 'neg_smoke_exit_no0' ($rn4.Code -ne 0) "exit=$($rn4.Code) — puerto muerto"
ok 'neg_smoke_paso' ($rn4.Out -like '*DOBLE SMOKE FAIL*' -or $rn4.Out -like '*smoke_public*') 'el throw procede del paso smoke del bloque §3'
ok 'neg_smoke_detuvo' (-not (Test-Path "$root\sent-n4.txt")) 'centinela de fin NO escrito'

# ── evidencia ─────────────────────────────────────────────────────────
$bad = @($checks.GetEnumerator() | Where-Object { -not $_.Value.ok } | ForEach-Object Name)
$evDir = Join-Path $Repo0 'evidence\red-team-2026'
New-Item -ItemType Directory -Path $evDir -Force | Out-Null
$out = [ordered]@{
  utc = (Get-Date).ToUniversalTime().ToString('o')
  what = 'B.3: ejecución de los bloques ÍNTEGROS de RELEASE.md (extraídos del propio archivo) en repos temporales con origen Git local. Mecánica del procedimiento (secuencia + stop-on-fail); NO verifica el producto ni GitHub Pages.'
  fences_sha256 = $fenceHash
  sustituciones = @(
    'S1 literal del repo → producto temporal'
    'S2 npm ci / npm run build → doble (artefacto sintético preexistente)'
    'S3 rt_pages_prefix.mjs → doble (PASS real verificado aparte: pages-prefix.json)'
    'S4 fingerprint_candidate.mjs → script real + --root/--build/--out'
    'S5 publish/rollback_pages.ps1 → scripts reales del repo'
    'S6 smoke_public.mjs → doble HTTP local sobre el worktree (static-server.mjs)'
    'S7 $restore → SHA real del deploy A del escenario'
    'S8 -SourceSha → SHA ajeno (solo caso N3)'
  )
  literalmente_ejecutado = @(
    'git rev-parse HEAD', 'Push-Location/try/finally', 'Select-String mjt:build',
    'git fetch', 'rama if/else del worktree (add + inspección)', 'publish -WhatIf',
    'publish -Push', 'rollback -WhatIf', 'rollback -Push', 'git rev-parse',
    'git diff --quiet', 'git log', 'todos los if ($LASTEXITCODE -ne 0) throw'
  )
  dobles = @('npm ci', 'npm run build', 'rt_pages_prefix.mjs', 'smoke_public.mjs (HTTP local)')
  no_ejecutado = @(
    'npm ci / npm run build reales (producto real, cubierto por verify.ps1/build)',
    'rt_pages_prefix.mjs real (14/14 verificado en pages-prefix.json)',
    'smoke_public.mjs real (exige producción — GitHub Pages pendiente)'
  )
  checks = $checks
  pass = ($bad.Count -eq 0)
  root = $root
  nota = 'El artefacto es sintético y los repos son temporales con origen local. Un PASS aquí no acredita GitHub Pages ni el producto.'
}
$fp2 = Join-Path $evDir "doc-steps-$Utc.json"
[IO.File]::WriteAllText($fp2, ($out | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))
$log | ForEach-Object { Write-Host $_ }
Write-Host ''
if ($bad.Count) { Write-Host "DOC-STEPS FAIL: $($bad -join ', ')"; exit 1 }
Write-Host "DOC-STEPS PASS - $($checks.Count) checks — $fp2"
