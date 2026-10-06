#!/usr/bin/env bash
set -euo pipefail
umask 077

[[ "$(id -u)" == 1000 && "$(id -un)" == aiops ]]
[[ "$(hostname)" == iZ2vc47kmc8j8wtcbhfhclZ ]]

container=lianqianyan-api-1
backup_root=/opt/apps/lianqianyan/shared/backups
timestamp=$(date -u +%Y%m%d-%H%M%S)
container_tmp="/data/.backup-$timestamp.sqlite3"
target="$backup_root/education-$timestamp.sqlite3"

[[ "$(docker --context rootless inspect --format '{{.State.Health.Status}}' "$container")" == healthy ]]
install -d -m 0700 "$backup_root"
[[ ! -e "$target" && ! -e "$target.sha256" ]]

cleanup() {
  docker --context rootless exec "$container" rm -f "$container_tmp" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker --context rootless exec -i "$container" /app/.venv/bin/python - "$container_tmp" <<'PY'
import pathlib
import sqlite3
import sys

source_path = pathlib.Path("/data/education.db")
target_path = pathlib.Path(sys.argv[1])
if not source_path.is_file():
    raise SystemExit("production database is missing")
source = sqlite3.connect(source_path)
target = sqlite3.connect(target_path)
try:
    sqlite3.Connection.backup(source, target)
    result = target.execute("PRAGMA quick_check").fetchone()
    if result != ("ok",):
        raise SystemExit(f"backup quick_check failed: {result}")
finally:
    target.close()
    source.close()
target_path.chmod(0o600)
PY

docker --context rootless cp "$container:$container_tmp" "$target"
chmod 0600 "$target"

python3 - "$target" <<'PY'
import sqlite3
import sys

connection = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
try:
    result = connection.execute("PRAGMA quick_check").fetchone()
finally:
    connection.close()
if result != ("ok",):
    raise SystemExit(f"copied backup quick_check failed: {result}")
PY

sha256sum "$target" > "$target.sha256"
chmod 0600 "$target.sha256"
echo "LIANQIANYAN_BACKUP_COMPLETE $target"
