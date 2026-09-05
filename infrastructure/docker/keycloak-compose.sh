#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
test "$(findmnt -rn -M /srv/nuc-archive -o UUID)" = e3a99255-e95b-4ae3-b80b-40fd1afe274a || {
  echo 'Expected SAMMA archive filesystem is not mounted.' >&2; exit 1;
}
test -d /srv/nuc-archive/juanity/keycloak-postgres || exit 1
exec docker compose --env-file /etc/samma-dev/keycloak.env -f "$project_dir/infrastructure/docker/compose.keycloak.yml" "$@"
