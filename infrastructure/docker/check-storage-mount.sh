#!/bin/sh
set -eu
archive=/srv/nuc-archive
expected=e3a99255-e95b-4ae3-b80b-40fd1afe274a
test "$(findmnt -rn -M "$archive" -o UUID)" = "$expected" || { echo 'Expected archive is not mounted.' >&2; exit 1; }
case ",$(findmnt -rn -M "$archive" -o OPTIONS)," in *,rw,*) ;; *) echo 'Archive is not read-write.' >&2; exit 1;; esac
for path in "$archive/juanity" "$archive/juanity/object-storage" "$archive/juanity/object-storage/metadata" "$archive/juanity/object-storage/data" "$archive/juanity/object-storage/staging"; do
  test -d "$path" && test ! -L "$path" || { echo 'Required storage directory missing or symlinked.' >&2; exit 1; }
  test "$(stat -c %d "$path")" = "$(stat -c %d "$archive")" || { echo 'Storage directory is on a different filesystem.' >&2; exit 1; }
done
test "$(stat -c %d "$archive")" != "$(stat -c %d /)" || exit 1
test "$(df -Pk "$archive" | awk 'NR==2 {print $4}')" -ge 1048576 || { echo 'Archive has less than 1 GiB free.' >&2; exit 1; }
