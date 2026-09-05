#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
archive_uuid=e3a99255-e95b-4ae3-b80b-40fd1afe274a
test "$(findmnt -rn -M /srv/nuc-archive -o UUID)" = "$archive_uuid" || {
  echo 'Refusing SAMMA operation: expected archive filesystem is not mounted.' >&2
  exit 1
}
for directory in postgres node_modules next-cache npm-cache; do
  test -d "/srv/nuc-archive/juanity/$directory" || {
    echo "Missing SAMMA directory: $directory" >&2
    exit 1
  }
done
exec docker compose --env-file "$project_dir/.env.nuc" -f "$project_dir/infrastructure/docker/compose.nuc.yml" "$@"
