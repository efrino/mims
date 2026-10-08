#!/usr/bin/env bash
# Deploy frontend build to server 67 (/home/armada/public_html/mims).
#
# Usage:
#   bash scripts/deploy-fe.sh             # pull, build, upload, swap
#   bash scripts/deploy-fe.sh --rollback  # swap mims <-> mims-backup back
#
# Flow: git pull origin main -> npm run build -> upload tar to staging dir
# (mims-new) -> verify -> rm mims-backup, mv mims mims-backup, mv mims-new mims.
# The live folder is only touched after the new build is fully on the server,
# so a failed upload/extract never breaks the running site.
set -euo pipefail

HOST="root@192.168.10.67"
REMOTE_DIR="/home/armada/public_html"
APP="mims"
URL="http://192.168.10.67/${APP}/"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10)

cd "$(dirname "$0")/.."

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

remote() { ssh "${SSH_OPTS[@]}" "$HOST" "$@"; }

if [[ "${1:-}" == "--rollback" ]]; then
  log "Rollback: swap ${APP} <-> ${APP}-backup"
  remote "set -e; cd '$REMOTE_DIR'
    [ -d '${APP}-backup' ] || { echo 'no ${APP}-backup to roll back to'; exit 1; }
    mv '${APP}' '${APP}-rollback-tmp'
    mv '${APP}-backup' '${APP}'
    mv '${APP}-rollback-tmp' '${APP}-backup'"
  log "Rollback done. Previous build is now ${APP}-backup."
  exit 0
fi

# 1. Preflight
log "Preflight"
branch=$(git rev-parse --abbrev-ref HEAD)
[[ "$branch" == "main" ]] || fail "Current branch is '$branch', switch to main first."
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Working tree not clean. Commit or stash first."
remote true || fail "Cannot SSH to $HOST. Run once: npm run ssh:setup"

# 2. Pull latest main (stop on conflict so it can be resolved manually)
log "git pull origin main"
if ! git pull --no-rebase origin main; then
  git diff --name-only --diff-filter=U | sed 's/^/  conflict: /'
  fail "Pull failed / merge conflict. Resolve, commit, then rerun this script."
fi
commit=$(git rev-parse --short HEAD)

# 3. Build
log "npm run build ($commit)"
npm run build
[[ -f dist/index.html ]] || fail "dist/index.html missing after build."

# 4. Upload as one tarball to a staging path (faster and atomic vs scp -r)
log "Upload to $HOST:$REMOTE_DIR/${APP}-new"
tarball="${APP}-${commit}.tar.gz"
tar -czf "$tarball" -C dist .
trap 'rm -f "$tarball"' EXIT
scp "${SSH_OPTS[@]}" "$tarball" "$HOST:$REMOTE_DIR/$tarball"

# 5. Extract, verify, then swap. Lock prevents two deploys at once.
log "Swap on server"
remote "set -e; cd '$REMOTE_DIR'
  mkdir '.${APP}-deploy.lock' 2>/dev/null || { echo 'another deploy is running'; exit 1; }
  trap 'rm -rf .${APP}-deploy.lock ${APP}-new $tarball' EXIT

  rm -rf '${APP}-new' && mkdir '${APP}-new'
  tar -xzf '$tarball' -C '${APP}-new'
  [ -f '${APP}-new/index.html' ] || { echo 'index.html missing in upload'; exit 1; }

  # Server-only files not produced by the build (SPA rewrite rules)
  if [ -f '${APP}/.htaccess' ] && [ ! -f '${APP}-new/.htaccess' ]; then
    cp -p '${APP}/.htaccess' '${APP}-new/.htaccess'
  fi
  chown -R --reference='${APP}' '${APP}-new'
  chmod --reference='${APP}' '${APP}-new'
  echo '$commit' > '${APP}-new/.deploy-version'

  rm -rf '${APP}-backup'
  mv '${APP}' '${APP}-backup'
  mv '${APP}-new' '${APP}' || { mv '${APP}-backup' '${APP}'; echo 'swap failed, restored'; exit 1; }"

# 6. Smoke test
log "Smoke test $URL"
code=$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)
[[ "$code" == "200" ]] || fail "HTTP $code from $URL. Run: bash scripts/deploy-fe.sh --rollback"

log "Deployed $commit to $URL (previous build kept in ${APP}-backup)"
