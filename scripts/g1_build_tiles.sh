#!/usr/bin/env bash
# G1 — construye los PMTiles de toda Bizkaia con tippecanoe 2.79.0 (Docker, ADR-003).
# En Windows/MSYS es más fiable que PowerShell (conversión de rutas /data → C:/…).
# Uso:  bash scripts/g1_build_tiles.sh [cod1 cod2 ...]
set -euo pipefail
export MSYS_NO_PATHCONV=1

IMG=mjt-tippecanoe:2.79.0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# MSYS: ROOT es /f/_CONCURSOS/…; docker -v necesita la ruta Windows
MNT="$(cygpath -w "$ROOT" 2>/dev/null || echo "$ROOT"):/data"
LOG="$ROOT/evidence/g1/04-tiles"
GJ=data/processed/g1/geojson
OUT=app/static/data
mkdir -p "$LOG" "$ROOT/$OUT/buildings"

echo "== municipalities"
docker run --rm -v "$MNT" $IMG --force -o "/data/$OUT/municipalities.pmtiles" \
  -l municipalities -Z0 -z10 "/data/$GJ/municipalities.geojson" > "$LOG/municipalities.log" 2>&1

echo "== cells"
docker run --rm -v "$MNT" $IMG --force -o "/data/$OUT/cells.pmtiles" \
  -l cells -Z8 -z14 "/data/$GJ/cells.geojson" > "$LOG/cells.log" 2>&1

mapfile -t files < <(ls "$ROOT/$GJ/buildings"/*.geojson | sort)
if [ $# -gt 0 ]; then
  files=()
  for c in "$@"; do files+=("$ROOT/$GJ/buildings/$c.geojson"); done
fi
n=${#files[@]}
i=0
for f in "${files[@]}"; do
  cod=$(basename "$f" .geojson)
  i=$((i+1))
  echo "[$i/$n] buildings/$cod"
  docker run --rm -v "$MNT" $IMG --force -o "/data/$OUT/buildings/$cod.pmtiles" \
    -l buildings -Z13 -z16 --drop-densest-as-needed --extend-zooms-if-still-dropping \
    --maximum-tile-bytes 500000 --no-feature-limit \
    "/data/$GJ/buildings/$cod.geojson" > "$LOG/buildings-$cod.log" 2>&1
done

echo "== hashes"
{
  cd "$ROOT/$OUT"
  for f in municipalities.pmtiles cells.pmtiles buildings/*.pmtiles; do
    sha256sum "$f"
  done
} > "$LOG/tiles-sha256.txt"
echo "DONE: $n municipios"
