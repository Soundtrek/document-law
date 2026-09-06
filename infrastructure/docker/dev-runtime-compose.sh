#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd -P)
"$project_dir/infrastructure/docker/check-storage-mount.sh"
# Operator-owned 0600 values; never print expanded Compose configuration.
config=/etc/samma-dev/dev-runtime.env
test "$(stat -c '%a:%u' "$config")" = "600:$(id -u)" || exit 1
set -a
. "$config"
set +a
: "${SAMMA_DEV_RELEASE_DIR:?Missing release directory}"
: "${SAMMA_DEPLOYED_SHA:?Missing exact dev SHA}"
test "$SAMMA_DEV_RELEASE_DIR" != /opt/Juanita-Labour-Law || exit 1
test "$(git -C "$SAMMA_DEV_RELEASE_DIR" symbolic-ref --short HEAD)" = dev || exit 1
test "$(git -C "$SAMMA_DEV_RELEASE_DIR" rev-parse HEAD)" = "$SAMMA_DEPLOYED_SHA" || exit 1
test -z "$(git -C "$SAMMA_DEV_RELEASE_DIR" status --porcelain)" || exit 1
for path in node_modules apps/web/.next; do
  test -d "$SAMMA_DEV_RELEASE_DIR/$path" && test ! -L "$SAMMA_DEV_RELEASE_DIR/$path" || exit 1
done
test -f "$SAMMA_DEV_RELEASE_DIR/apps/web/.next/BUILD_ID" || exit 1
exec docker compose --env-file "$config" -f "$project_dir/infrastructure/docker/compose.dev-runtime.yml" "$@"
