#!/usr/bin/env bash
# Publica app/build en h1756-vps2 como release inmutable (ADR-029).
#
#   SITE_URL=https://masjovenquetu.eus bash scripts/deploy-vps.sh          # build + publicar
#   bash scripts/deploy-vps.sh --rollback <sha12>                           # volver a una release
#
# Requisitos: árbol limpio, PMTiles verificados en app/static/data/ (no están en git),
# alias SSH `h1756-vps2` (o VPS_HOST) con sudo. No toca nada fuera de /srv/h1756/masjoven.
set -euo pipefail

HOST="${VPS_HOST:-h1756-vps2}"
ROOT=/srv/h1756/masjoven
KEEP=4
REPO="$(cd "$(dirname "$0")/.." && pwd)"

remote() { ssh -o BatchMode=yes "$HOST" "$@"; }

switch_to() {
  local rel="$1"
  remote "sudo test -d $ROOT/releases/$rel" || { echo "no existe la release $rel" >&2; exit 1; }
  remote "cd $ROOT/releases && sudo ln -sfn $rel current.new && sudo mv -T current.new current"
  remote "cd $ROOT && sudo docker compose -f compose.yml up -d --remove-orphans"
  echo "current -> $rel"
}

if [[ "${1:-}" == "--rollback" ]]; then
  switch_to "${2:?indica la release (sha12)}"
  exit 0
fi

: "${SITE_URL:?define SITE_URL (dominio canónico, https, sin barra final)}"
cd "$REPO"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "árbol sucio: el sello mjt:build no describiría la release" >&2
  exit 1
fi
SHA="$(git rev-parse HEAD)"
REL="${SHA:0:12}"

pmtiles=$(find app/static/data -name '*.pmtiles' | wc -l)
if [[ ! -f app/static/data/cells.pmtiles || "$pmtiles" -lt 2 ]]; then
  echo "faltan PMTiles en app/static/data (ver docs/VPS_DEPLOYMENT.md)" >&2
  exit 1
fi

(cd app && SITE_URL="$SITE_URL" BASE_PATH='' npm run build)
grep -q "content=\"$SHA\"" app/build/index.html || { echo "sello mjt:build inesperado" >&2; exit 1; }
(cd app/build && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
echo "release $REL: $(wc -l < app/build/SHA256SUMS) ficheros, $pmtiles PMTiles"

remote "sudo install -d -m 755 $ROOT $ROOT/releases"
if remote "sudo test -d $ROOT/releases/$REL"; then
  echo "la release $REL ya existe en el servidor; se reutiliza"
else
  tar -C app/build -cf - . | remote "sudo rm -rf $ROOT/releases/$REL.tmp && sudo install -d $ROOT/releases/$REL.tmp && sudo tar -C $ROOT/releases/$REL.tmp -xf - --no-same-owner"
  remote "cd $ROOT/releases/$REL.tmp && sudo sha256sum -c --quiet SHA256SUMS && sudo chmod -R a+rX,go-w . && sudo mv $ROOT/releases/$REL.tmp $ROOT/releases/$REL"
fi
tar -C deploy -cf - Caddyfile -C vps compose.yml | remote "sudo tar -C $ROOT -xf - --no-same-owner && sudo chmod 644 $ROOT/Caddyfile $ROOT/compose.yml"
remote "cd $ROOT && sudo docker compose -f compose.yml config -q"
IMAGE="$(grep -m1 -oE 'caddy:[^[:space:]]+' deploy/vps/compose.yml)"
remote "sudo docker run --rm --network none -e MJT_DOMAIN=:8080 -e MJT_ROOT=/srv -v $ROOT/Caddyfile:/etc/caddy/Caddyfile:ro $IMAGE caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile" >/dev/null

prev="$(remote "readlink $ROOT/releases/current 2>/dev/null || true")"
switch_to "$REL"
[[ -n "$prev" && "$prev" != "$REL" ]] && echo "anterior: $prev  (rollback: bash scripts/deploy-vps.sh --rollback $prev)"

# Conserva las $KEEP releases más recientes, además de la actual y la anterior.
remote "cd $ROOT/releases && ls -1t | grep -E '^[0-9a-f]{12}\$' | grep -v -x -e '$REL' -e '${prev:-none}' | tail -n +$((KEEP + 1)) | xargs -r sudo rm -rf"
echo "siguiente paso: QA_BASE_URL=$SITE_URL EXPECTED_BUILD=$SHA node app/scripts/deploy-check.mjs --profile=vps"
