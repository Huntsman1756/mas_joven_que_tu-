<#
.SYNOPSIS
  G1 — construye los PMTiles de toda Bizkaia con tippecanoe 2.79.0 (Docker fijado, ADR-003).

.DESCRIPTION
  Genera:
    app/static/data/municipalities.pmtiles        (z0-10, límites + agregados)
    app/static/data/cells.pmtiles                 (z8-14, celdas 500 m)
    app/static/data/buildings/<cod>.pmtiles       (z13-16, uno por municipio)

  Requiere que pipeline/g1_buildings.py haya generado data/processed/g1/geojson/.

.EXAMPLE
  powershell -File scripts/g1_build_tiles.ps1
  powershell -File scripts/g1_build_tiles.ps1 -Only '020','054'
#>
[CmdletBinding()]
param(
  [string]$InputDir = 'data/processed/g1/geojson',
  [string]$OutputDir = 'app/static/data',
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'
$Image = 'mjt-tippecanoe:2.79.0'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogDir = Join-Path $Root 'evidence\g1\04-tiles'
$GjDir = Join-Path $Root $InputDir
$OutDir = Join-Path $Root $OutputDir
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir 'buildings') | Out-Null

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker no disponible (ADR-003).' }
$mount = "${Root}:/data"

function Build-Layer {
  param([string]$Name, [string[]]$TippecanoeArgs, [string]$LogFile)
  $out = Join-Path $LogDir $LogFile
  & docker run --rm -v $mount $Image @TippecanoeArgs *> $out
  if ($LASTEXITCODE -ne 0) { throw "tippecanoe fallo para $Name (exit $LASTEXITCODE). Ver $out" }
}

Build-Layer 'municipalities' @(
  '--force','-o', "/data/$OutputDir/municipalities.pmtiles",
  '-l', 'municipalities',
  '-Z0','-z10',
  "/data/$InputDir/municipalities.geojson"
) 'municipalities.log'

Build-Layer 'cells' @(
  '--force','-o', "/data/$OutputDir/cells.pmtiles",
  '-l', 'cells',
  '-Z8','-z14',
  "/data/$InputDir/cells.geojson"
) 'cells.log'

$buildInputs = Get-ChildItem (Join-Path $GjDir 'buildings') -Filter *.geojson | Sort-Object Name
if ($Only.Count -gt 0) {
  $buildInputs = $buildInputs | Where-Object { $Only -contains $_.BaseName }
}
$total = $buildInputs.Count
$i = 0
foreach ($f in $buildInputs) {
  $i++
  $cod = $f.BaseName
  Write-Host "[$i/$total] buildings/$cod"
  Build-Layer "buildings/$cod" @(
    '--force','-o', "/data/$OutputDir/buildings/$cod.pmtiles",
    '-l', 'buildings',
    '-Z13','-z16',
    '--drop-densest-as-needed',
    '--extend-zooms-if-still-dropping',
    '--maximum-tile-bytes', '500000',
    '--no-feature-limit',
    "/data/$InputDir/buildings/$cod.geojson"
  ) "buildings-$cod.log"
}

$rows = @()
Get-ChildItem $OutDir -Filter *.pmtiles | ForEach-Object {
  $rows += [pscustomobject]@{ file = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower() }
}
Get-ChildItem (Join-Path $OutDir 'buildings') -Filter *.pmtiles | ForEach-Object {
  $rows += [pscustomobject]@{ file = "buildings/$($_.Name)"; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower() }
}
$rows | ConvertTo-Json | Set-Content (Join-Path $LogDir 'tiles-hashes.json') -Encoding UTF8
Write-Host ("PMTiles generados: {0} ficheros" -f $rows.Count) -ForegroundColor Green
