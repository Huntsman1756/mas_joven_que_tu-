<#
.SYNOPSIS
  Preflight de herramientas por fase. Comprueba que el entorno puede ejecutar la
  fase solicitada ANTES de empezar y falla con un mensaje claro si no.

.DESCRIPTION
  Fases:
    p0 (default) — solo lo necesario para P0/documentos
    g0           — datos + tiles
    data         — DuckDB + ST_Read (SHP/GML)
    tiles        — Docker + imagen tippecanoe fijada (ADR-003)
    app          — Node/npm (G1)

  No instala nada. Devuelve codigo de salida 0 (PASS) o 1 (FAIL).

.EXAMPLE
  powershell -File scripts/preflight.ps1 -Phase g0
#>
[CmdletBinding()]
param(
  [ValidateSet('p0', 'g0', 'data', 'tiles', 'app')]
  [string]$Phase = 'p0'
)

$ErrorActionPreference = 'Continue'
$TIPPECANOE_VERSION = '2.79.0'   # debe coincidir con pipeline/docker/tippecanoe.Dockerfile

function Check-Cmd {
  param([string]$Name, [string]$Exe, [string[]]$Args = @(), [switch]$Optional, [string]$Hint = '')
  if (-not (Get-Command $Exe -ErrorAction SilentlyContinue)) {
    if ($Optional) {
      Write-Host ("  [WARN] {0,-24} opcional" -f $Name)
      if ($Hint) { Write-Host ("         -> {0}" -f $Hint) }
      return $false
    }
    Write-Host ("  [FAIL] {0,-24} no encontrado" -f $Name) -ForegroundColor Red
    if ($Hint) { Write-Host ("         -> {0}" -f $Hint) }
    $script:fail++
    return $false
  }
  $out = (& $Exe @Args 2>$null | Out-String)
  $lines = ($out -split "`n") | Where-Object { $_.Trim() -ne '' }
  if (-not $lines) {
    $out = (& $Exe @Args 2>&1 | Out-String)
    $lines = ($out -split "`n") | Where-Object { $_.Trim() -ne '' }
  }
  $first = if ($lines) { $lines[0].Trim() } else { '(sin salida)' }
  Write-Host ("  [OK]   {0,-24} {1}" -f $Name, $first)
  return $true
}

function Check-Py {
  param([string]$Name, [string]$Code, [switch]$Optional, [string]$Hint = '')
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host ("  [FAIL] {0,-24} python no encontrado" -f $Name) -ForegroundColor Red
    $script:fail++
    return $false
  }
  $global:LASTEXITCODE = 0
  $out = (python -c $Code 2>$null | Out-String)
  if ($LASTEXITCODE -ne 0) {
    $msg = (($out -split "`n") | Where-Object { $_.Trim() -ne '' } | Select-Object -First 1)
    if ($Optional) {
      Write-Host ("  [WARN] {0,-24} opcional" -f $Name)
    } else {
      Write-Host ("  [FAIL] {0,-24} {1}" -f $Name, $msg) -ForegroundColor Red
      $script:fail++
    }
    if ($Hint) { Write-Host ("         -> {0}" -f $Hint) }
    return $false
  }
  $first = ((($out -split "`n") | Where-Object { $_.Trim() -ne '' } | Select-Object -First 1)).Trim()
  Write-Host ("  [OK]   {0,-24} {1}" -f $Name, $first)
  return $true
}

function Run-Data {
  Write-Host "Datos (DuckDB Spatial):"
  $check = Join-Path $PSScriptRoot 'check_duckdb_spatial.py'
  if (Test-Path $check) {
    $global:LASTEXITCODE = 0
    $out = (python $check 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0) {
      Write-Host ("  [OK]   {0,-24} {1}" -f 'duckdb + ST_Read', (($out -split "`n")[0]))
    } else {
      Write-Host ("  [FAIL] {0,-24} {1}" -f 'duckdb + ST_Read', (($out -split "`n")[0])) -ForegroundColor Red
      Write-Host "         -> pip install -r pipeline/requirements.txt"
      $script:fail++
    }
  } else {
    Check-Py 'duckdb' 'import duckdb; print(duckdb.__version__)' -Hint 'pip install -r pipeline/requirements.txt'
  }
  Check-Py 'shapely' 'import shapely; print(shapely.__version__)' -Optional -Hint 'Solo para verificacion cruzada.'
  Write-Host "Opcional (no bloquea):"
  Check-Cmd 'ogr2ogr (GDAL CLI)' 'ogr2ogr' @('--version') -Optional -Hint 'Opcional: DuckDB ST_Read cubre SHP/GML (ADR-005).' | Out-Null
}

function Run-Tiles {
  Write-Host "Tiles (tippecanoe via Docker, ADR-003):"
  $dockerOk = Check-Cmd 'docker client' 'docker' @('-v') -Hint 'Instala Docker Desktop.'
  if (-not $dockerOk) { return }

  $global:LASTEXITCODE = 0
  $sv = (docker info 2>$null | Select-String -Pattern 'Server Version' | Select-Object -First 1)
  if ($LASTEXITCODE -eq 0 -and $sv) {
    Write-Host ("  [OK]   {0,-24} {1}" -f 'docker server', ($sv.ToString().Trim()))
  } else {
    Write-Host ("  [FAIL] {0,-24} motor no disponible" -f 'docker server') -ForegroundColor Red
    Write-Host "         -> Arranca el motor de Docker."
    $script:fail++
    return
  }

  $img = "mjt-tippecanoe:$TIPPECANOE_VERSION"
  $present = (docker images -q $img 2>$null | Out-String).Trim()
  if ($present) {
    Check-Cmd "imagen $img" 'docker' @('run','--rm',$img,'--version') | Out-Null
  } else {
    Write-Host ("  [FAIL] {0,-24} imagen no construida" -f "imagen $img") -ForegroundColor Red
    Write-Host ("         -> docker build -t {0} -f pipeline\docker\tippecanoe.Dockerfile pipeline\docker" -f $img)
    $script:fail++
  }
  Write-Host ("  [i]    Fallback: WSL2 Ubuntu + compilar tippecanoe {0} si no hubiera Docker." -f $TIPPECANOE_VERSION)
}

function Run-App {
  Write-Host "App:"
  Check-Cmd 'node' 'node' @('-v') -Hint 'Instala Node 20+.' | Out-Null
  Check-Cmd 'npm'  'npm'  @('-v') -Hint 'Viene con Node.'   | Out-Null
}

$script:fail = 0

Write-Host ""
Write-Host "PREFLIGHT - fase: $Phase" -ForegroundColor Cyan
Write-Host ("-" * 62)
Write-Host "Nucleo:"
Check-Cmd 'git'    'git'    @('--version') | Out-Null
Check-Py  'python' 'import sys; print(sys.version.split()[0])' | Out-Null

switch ($Phase) {
  'data'  { Run-Data }
  'tiles' { Run-Tiles }
  'app'   { Run-App }
  'p0'    { Write-Host "P0: solo requiere git y python." }
  'g0'    { Run-Data; Write-Host ""; Run-Tiles }
}

Write-Host ("-" * 62)
if ($script:fail -gt 0) {
  Write-Host ("RESULTADO: FAIL ({0} fallos)" -f $script:fail) -ForegroundColor Red
  exit 1
}
Write-Host "RESULTADO: PASS" -ForegroundColor Green
exit 0
