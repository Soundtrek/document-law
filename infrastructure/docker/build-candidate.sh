#!/bin/sh
# Run from an isolated worktree. Never mounts the live Next cache or secrets.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
if [ "$project_dir" = /opt/Juanita-Labour-Law ]; then
  echo 'Build in an isolated worktree; the canonical checkout serves the live app.' >&2
  exit 1
fi
for path in "$project_dir/node_modules" "$project_dir/apps/web/.next"; do
  if [ -L "$path" ]; then
    echo 'Candidate dependencies and build output must not be symlinks.' >&2
    exit 1
  fi
done
: "${SAMMA_NODE_IMAGE:?Supply the approved pinned Node image}"
case "$SAMMA_NODE_IMAGE" in *@sha256:*) ;; *) echo 'Use a digest-pinned Node image.' >&2; exit 1 ;; esac
exec node "$project_dir/scripts/with-build-metadata.mjs" docker run --rm --init \
  --user "$(id -u):$(id -g)" --memory=2g --memory-swap=2g --cpus=0.5 --pids-limit=256 \
  --mount "type=bind,source=$project_dir,target=/app" --workdir /app \
  -e SAMMA_BUILD_BRANCH -e SAMMA_BUILD_SHA -e SAMMA_BUILD_CHANNEL -e SAMMA_SHOW_BUILD_OVERLAY \
  -e NODE_OPTIONS=--max-old-space-size=1536 -e NEXT_TELEMETRY_DISABLED=1 \
  -e npm_config_cache=/tmp/npm-cache \
  -e DATABASE_URL=postgresql://synthetic:synthetic@localhost:5432/synthetic \
  -e SAMMA_BASE_URL=https://samma-candidate.invalid \
  -e SAMMA_OIDC_ISSUER=https://identity-candidate.invalid/realms/samma \
  -e SAMMA_OIDC_CLIENT_ID=samma-candidate \
  -e SAMMA_OIDC_CLIENT_SECRET=synthetic-build-placeholder \
  -e AUTH_SECRET=synthetic-build-placeholder-not-a-runtime-secret \
  -e SAMMA_DEV_IDENTITY_ENABLED=false \
  "$SAMMA_NODE_IMAGE" sh -c 'npm ci && npm run build'
