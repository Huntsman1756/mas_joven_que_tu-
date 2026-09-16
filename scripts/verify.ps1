<#
.SYNOPSIS
  Verificación local de la fase actual (G1): tipos, tests, build, artefactos.

.EXAMPLE
  powershell -File scripts/verify.ps1
#>
[CmdletBinding()]
param([switch]$Quick)

$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$fail = @()

function Step([string]$Name, [scriptblock]$Cmd) {
  Write-Host "`n== $Name" -ForegroundColor Cyan
  & $Cmd
  if ($LASTEXITCODE -ne 0) { $script:fail += $Name; Write-Host "  FALLO ($LASTEXITCODE)" -ForegroundColor Red }
  else { Write-Host "  OK" -ForegroundColor Green }
}

Push-Location (Join-Path $Root 'app')
Step 'svelte-check' { npm run --silent check }
Step 'eslint' { npx eslint . }
Step 'vitest (dominio + copy-lint)' { npm run --silent test }
Step 'vite build' { npm run --silent build }
Pop-Location

Push-Location $Root
Step 'pytest tests/data' { python -m pytest tests/data -q }
Pop-Location

# artefactos G1 mínimos
Push-Location $Root
Step 'artefactos G1 presentes' {
  $need = @(
    'app/static/data/municipalities.json',
    'app/static/data/catalog.json',
    'app/static/data/municipalities.pmtiles',
    'app/static/data/cells.pmtiles'
  )
  foreach ($f in $need) { if (-not (Test-Path $f)) { Write-Host "  falta $f"; $LASTEXITCODE = 1 } }
  $nB = (Get-ChildItem 'app/static/data/buildings' -Filter *.pmtiles -ErrorAction SilentlyContinue).Count
  $nM = (Get-ChildItem 'app/static/data/metrics' -Filter *.json -ErrorAction SilentlyContinue).Count
  Write-Host "  buildings pmtiles: $nB / 112 · metrics: $nM / 112"
  if ($nB -lt 112 -or $nM -lt 112) { $LASTEXITCODE = 1 }
}
Pop-Location

if (-not $Quick) {
  Push-Location (Join-Path $Root 'app')
  Step 'servidor estático + Range (206)' {
    $ok = $false
    $p = Start-Process node -ArgumentList 'scripts/static-server.mjs 4173 build' -PassThru -WindowStyle Hidden
    try {
      for ($i = 0; $i -lt 15 -and -not $ok; $i++) {
        Start-Sleep -Seconds 1
        $r = curl.exe -s -o NUL -D - -H 'Range: bytes=0-99' 'http://localhost:4173/data/cells.pmtiles'
        $ok = ($r -match '206') -and ($r -match 'Content-Range') -and ($r -match 'Accept-Ranges')
      }
    } finally {
      Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
      $LASTEXITCODE = 0
    }
    if (-not $ok) { Write-Host '  Range no soportado'; $LASTEXITCODE = 1 }
  }
  Pop-Location
}

Write-Host ''
if ($fail.Count) { Write-Host ("FALLOS: " + ($fail -join ', ')) -ForegroundColor Red; exit 1 }
Write-Host 'TODO OK' -ForegroundColor Green
