#!/usr/bin/env bash
# Weekly data refresh and deploy. Runs from a systemd user timer on the build
# machine, which has no git and no root: the code comes from the main-branch
# tarball, Node from a nodejs.org tarball in ~/.local/node, and the deploy token from ~/.config/cloudflare/edit.token.
#   refresh.sh [workdir]   (default ~/chikoja-refresh)
set -euo pipefail
WORK="${1:-$HOME/chikoja-refresh}"; mkdir -p "$WORK/state"
export PATH="$HOME/.local/node/bin:$PATH"
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

log "fetching code"
rm -rf "$WORK/src"; mkdir -p "$WORK/src"
curl -fsSL https://github.com/chikojahq/chikoja/archive/refs/heads/main.tar.gz | tar -xz -C "$WORK/src" --strip-components=1
cd "$WORK/src"
npm ci --omit=optional --no-audit --no-fund >/dev/null

log "fetching the OSM extract (only if newer)"
PBF="$WORK/state/iran-latest.osm.pbf"
curl -fsSL -A "chikoja-build (+https://chikoja.ir)" -o "$PBF" -z "$PBF" https://download.geofabrik.de/asia/iran-latest.osm.pbf
[ -s "$PBF" ] || { log "no extract"; exit 1; }

log "building data"
node --max-old-space-size=6144 scripts/extract.mjs "$PBF"
node scripts/build-data.mjs
node --test tests/data.test.mjs >/dev/null

log "sanity gate"
LAST_GOOD="$WORK/state/last-good-counts.json"
[ -s "$LAST_GOOD" ] || cp data/last-good-counts.json "$LAST_GOOD"
LAST_GOOD="$LAST_GOOD" node scripts/gate.mjs

log "building site and packs"
node scripts/build-site.mjs
node scripts/build-packs.mjs
n=$(find dist -type f | wc -l); [ "$n" -gt 1000 ] && [ "$n" -lt 20000 ] || { log "dist has $n files"; exit 1; }

log "deploying"
CLOUDFLARE_API_TOKEN="$(cat "$HOME/.config/cloudflare/edit.token")" npx wrangler deploy 2>&1 | grep -E 'Deployed|Version ID|ERROR' || true
sleep 20
curl -fsS "https://chikoja.ir/%D9%85%D8%B4%D9%87%D8%AF/" | grep -q "data-date\" content=\"$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("data/build/cities.json")).built)')" \
  && LAST_GOOD="$LAST_GOOD" node scripts/gate.mjs --update && log "live and recorded" || { log "live check failed: data date not on the site"; exit 1; }
