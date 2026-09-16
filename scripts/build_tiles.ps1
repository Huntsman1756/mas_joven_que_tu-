<#
.SYNOPSIS
  Genera los PMTiles de la app a partir de GeoJSON/GeoParquet intermedios,
  usando tippecanoe dentro de un contenedor con version fijada (ADR-003).

.DESCRIPTION
  No construye el pipeline de datos completo (eso es pipeline/fetch.py + qa_buildings.py).
  Asume que existe data/processed/tiles/ con las capas de entrada.

  Capas previstas:
    buildings.geojson      -> public/data/buildings.pmtiles      (zoom >= 15)
    cells.geojson          -> public/data/cells.pmtiles          (zoom 8..14)
    municipalities.geojson -> public/data/municipalities.pmtiles (zoom 5..9)

.EXAMPLE
  powershell -File scripts/build_tiles.ps1
  powershell -File scripts/build_tiles.ps1 -SkipBuildImage
#>
[CmdletBinding()]
param(
  [string]$InputDir  = 'data/processed/tiles',
  [string]$OutputDir = 'public/data',
  [switch]$SkipBuildImage
)

$ErrorActionPreference = 'Stop'
$TIPPECANOE_VERSION = '2.79.0'
$Image = "mjt-tippecanoe:$TIPPECANOE_VERSION"
$Dockerfile = 'pipeline/docker/tippecanoe.Dockerfile'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Invoke-Tippecanoe {
  param([string[]]$TippecanoeArgs)
  $mount = "${Root}:/data"
  & docker run --rm -v $mount $Image @TippecanoeArgs
  if ($LASTEXITCODE -ne 0) { throw "tippecanoe fallo con codigo $LASTEXITCODE" }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker no disponible. Ver scripts/preflight.ps1 -Phase tiles y ADR-003."
}

if (-not $SkipBuildImage) {
  Write-Host "Construyendo imagen $Image ..."
  & docker build -t $Image -f (Join-Path $Root $Dockerfile) (Join-Path $Root 'pipeline/docker')
  if ($LASTEXITCODE -ne 0) { throw "docker build fallo" }
}

& docker run --rm $Image --version
if ($LASTEXITCODE -ne 0) { throw "La imagen no responde a --version" }

$outAbs = Join-Path $Root $OutputDir
New-Item -ItemType Directory -Force -Path $outAbs | Out-Null

$layers = @(
  @{ In = 'buildings.geojson';      Out = 'buildings.pmtiles';      Args = @('-zg','--drop-densest-as-needed','--extend-zooms-if-still-dropping','-l','buildings') },
  @{ In = 'cells.geojson';          Out = 'cells.pmtiles';          Args = @('-Z8','-z14','-l','cells') },
  @{ In = 'municipalities.geojson'; Out = 'municipalities.pmtiles'; Args = @('-Z5','-z9','-l','municipalities') }
)

foreach ($l in $layers) {
  $inRel = "/data/$InputDir/$($l.In)"
  $outRel = "/data/$OutputDir/$($l.Out)"
  Write-Host ("tippecanoe: {0} -> {1}" -f $l.In, $l.Out)
  Invoke-Tippecanoe -TippecanoeArgs (@($l.Args) + @('-o', $outRel, $inRel))
}

Write-Host "PMTiles generados en $OutputDir" -ForegroundColor Green
