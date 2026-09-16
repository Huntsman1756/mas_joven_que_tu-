<#
.SYNOPSIS
  G0 — construye los PMTiles del vertical slice con tippecanoe 2.79.0 (Docker fijado).

.EXAMPLE
  powershell -File scripts/g0_build_tiles.ps1
#>
[CmdletBinding()]
param(
  [string]$InputDir = 'data/processed/g0',
  [string]$OutputDir = 'app/static/data'
)

$ErrorActionPreference = 'Stop'
$Image = 'mjt-tippecanoe:2.79.0'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogDir = Join-Path $Root 'evidence\g0\04-tiles'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root $OutputDir) | Out-Null

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker no disponible (ADR-003).' }
$mount = "${Root}:/data"

function Build-Layer {
  param([string]$Name, [string[]]$TippecanoeArgs, [string]$LogFile)
  Write-Host "tippecanoe -> $Name"
  $out = Join-Path $LogDir $LogFile
  $all = @('run','--rm','-v',$mount,$Image) + $TippecanoeArgs
  # Redirigimos stdout+stderr a fichero y comprobamos el codigo de salida real.
  & cmd /c "docker $($all -join ' ') > `"$out`" 2>&1"
  if ($LASTEXITCODE -ne 0) { throw "tippecanoe fallo para $Name (exit $LASTEXITCODE). Ver $out" }
  Get-Content $out -Tail 3 | ForEach-Object { Write-Host "    $_" }
}

Build-Layer 'buildings' @(
  '--force','-o', "/data/$OutputDir/buildings.pmtiles", 
  '-l', 'buildings',
  '-z16',
  '--drop-densest-as-needed',
  '--extend-zooms-if-still-dropping',
  '--maximum-tile-bytes', '500000',
  '--no-feature-limit',
  "/data/$InputDir/buildings_all.geojson"
) 'buildings.log'

Build-Layer 'municipalities' @(
  '--force','-o', "/data/$OutputDir/municipalities.pmtiles", 
  '-l', 'municipalities',
  '-Z0','-z9',
  "/data/$InputDir/municipalities.geojson"
) 'municipalities.log'

$rows = @()
Get-ChildItem (Join-Path $Root $OutputDir) -Filter *.pmtiles | ForEach-Object {
  $h = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
  $rows += [pscustomobject]@{ file = $_.Name; bytes = $_.Length; sha256 = $h }
}
$rows | Format-Table -AutoSize
$rows | ConvertTo-Json | Set-Content (Join-Path $LogDir 'tiles-hashes.json') -Encoding UTF8
Write-Host "PMTiles generados en $OutputDir" -ForegroundColor Green
