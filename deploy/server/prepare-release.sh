#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "$#" -ne 5 ]]; then
  echo "usage: $0 RELEASE_ID CONTEXT_ARCHIVE PYTHON_BASE_TAR NGINX_BASE_TAR API_ENV" >&2
  exit 2
fi

release_id=$1
context_archive=$(realpath "$2")
python_base=$(realpath "$3")
nginx_base=$(realpath "$4")
api_env=$(realpath "$5")

project=lianqianyan
port=18001
app_root=/opt/apps/lianqianyan
appctl=/opt/apps/.framework/appctl.py
work_root="/home/aiops/.local/lianqianyan-deploy/$release_id"

[[ "$(id -u)" == 1000 && "$(id -un)" == aiops ]]
[[ "$(hostname)" == iZ2vc47kmc8j8wtcbhfhclZ ]]
[[ "$release_id" =~ ^[0-9]{8}-[0-9a-f]{12}$ ]]
[[ -x "$appctl" && -f "$context_archive" && -f "$python_base" && -f "$nginx_base" && -f "$api_env" ]]
[[ "$(stat -c %a "$api_env")" == 600 ]]
[[ "$context_archive" == "$work_root/"* ]]
[[ "$python_base" == "$work_root/"* ]]
[[ "$nginx_base" == "$work_root/"* ]]
[[ "$api_env" == "$work_root/"* ]]

verify_checksum() {
  local file=$1
  local directory name
  directory=$(dirname "$file")
  name=$(basename "$file")
  [[ -f "$file.sha256" ]]
  (cd "$directory" && sha256sum -c "$name.sha256")
}

spatial_health() {
  local container=$1
  docker --context rootless inspect --format '{{.State.Health.Status}}' "$container"
}

[[ "$(spatial_health yilian-spatial-api-1)" == healthy ]]
[[ "$(spatial_health yilian-spatial-web-1)" == healthy ]]
verify_checksum "$context_archive"
verify_checksum "$python_base"
verify_checksum "$nginx_base"

build_root="$work_root/build"
stage_root="$work_root/stage"
[[ ! -e "$build_root" && ! -e "$stage_root" ]]
install -d -m 0700 "$build_root" "$stage_root"

python3 - "$context_archive" <<'PY'
import pathlib
import sys
import tarfile

archive = pathlib.Path(sys.argv[1])
required = {
    "release.json",
    "SHA256SUMS",
    "deploy/server/compose.yml",
    "deploy/server/Dockerfile.api",
    "deploy/server/Dockerfile.web",
    "dist/index.html",
    "apps/api/pyproject.toml",
    "apps/api/uv.lock",
}
seen: set[str] = set()
total = 0
with tarfile.open(archive, "r:gz") as handle:
    for member in handle.getmembers():
        name = member.name.removeprefix("./")
        path = pathlib.PurePosixPath(name)
        if not name or path.is_absolute() or ".." in path.parts:
            raise SystemExit(f"unsafe archive path: {member.name}")
        if member.issym() or member.islnk() or member.isdev():
            raise SystemExit(f"unsupported archive member: {member.name}")
        if member.isfile():
            total += member.size
            seen.add(name)
if total > 1_500_000_000:
    raise SystemExit("release context exceeds 1.5 GB")
missing = sorted(required - seen)
if missing:
    raise SystemExit(f"release context is missing: {missing}")
PY

tar -xzf "$context_archive" -C "$build_root"
(cd "$build_root" && sha256sum -c SHA256SUMS)

source_commit=$(python3 - "$build_root/release.json" "$release_id" <<'PY'
import json
import pathlib
import re
import sys

metadata = json.loads(pathlib.Path(sys.argv[1]).read_text())
release_id = sys.argv[2]
commit = metadata.get("source_commit", "")
if not re.fullmatch(r"[0-9a-f]{40}", commit):
    raise SystemExit("invalid source commit")
if release_id.split("-", 1)[1] != commit[:12]:
    raise SystemExit("release id does not match source commit")
if metadata.get("project") != "lianqianyan" or metadata.get("db_schema") != 1:
    raise SystemExit("unexpected release metadata")
print(commit)
PY
)
short_commit=${source_commit:0:12}
api_image="lianqianyan-api:1.4.0-$short_commit"
web_image="lianqianyan-web:1.4.0-$short_commit"

docker --context rootless load --input "$python_base"
docker --context rootless load --input "$nginx_base"
docker --context rootless image inspect python:3.12.12-slim-bookworm >/dev/null
docker --context rootless image inspect nginxinc/nginx-unprivileged:1.27.5-alpine3.21 >/dev/null

docker --context rootless build \
  --pull=false \
  --build-arg "SOURCE_COMMIT=$source_commit" \
  --file "$build_root/deploy/server/Dockerfile.api" \
  --tag "$api_image" \
  "$build_root"

docker --context rootless build \
  --pull=false \
  --build-arg "SOURCE_COMMIT=$source_commit" \
  --file "$build_root/deploy/server/Dockerfile.web" \
  --tag "$web_image" \
  "$build_root"

[[ "$(docker --context rootless image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$api_image")" == "$source_commit" ]]
[[ "$(docker --context rootless image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$web_image")" == "$source_commit" ]]

image_archive="$work_root/lianqianyan-images-$release_id.tar.gz"
docker --context rootless save "$api_image" "$web_image" | gzip -n -6 > "$image_archive"
image_archive_sha256=$(sha256sum "$image_archive" | awk '{print $1}')
printf '%s  %s\n' "$image_archive_sha256" "$(basename "$image_archive")" > "$image_archive.sha256"
chmod 0600 "$image_archive" "$image_archive.sha256"

install -m 0600 "$build_root/deploy/server/compose.yml" "$stage_root/compose.yml"
install -d -m 0700 "$stage_root/deploy/server"
install -m 0700 "$build_root/deploy/server/backup.sh" "$stage_root/deploy/server/backup.sh"
install -m 0600 "$build_root/deploy/server/README.md" "$stage_root/deploy/server/README.md"
python3 - "$stage_root/release.json" "$source_commit" "$release_id" "$api_image" "$web_image" "$image_archive_sha256" <<'PY'
import json
import pathlib
import sys

path, commit, release_id, api_image, web_image, archive_hash = sys.argv[1:]
payload = {
    "source_commit": commit,
    "db_schema": 1,
    "release_id": release_id,
    "public_url": "https://8.156.67.132/lianqianyan/",
    "images": {
        "api": {"tag": api_image, "revision": commit},
        "web": {"tag": web_image, "revision": commit},
    },
    "offline_image_archive_sha256": archive_hash,
}
pathlib.Path(path).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
PY
(cd "$stage_root" && sha256sum \
  compose.yml \
  release.json \
  deploy/server/backup.sh \
  deploy/server/README.md \
  > SHA256SUMS)
chmod 0600 "$stage_root/release.json" "$stage_root/SHA256SUMS"

if [[ ! -d "$app_root" ]]; then
  python3 "$appctl" init "$project" --port "$port"
else
  python3 - "$app_root/project.json" /opt/apps/.framework/ports.json "$project" "$port" <<'PY'
import json
import pathlib
import sys

project_path, ports_path, project, port = sys.argv[1:]
metadata = json.loads(pathlib.Path(project_path).read_text())
ports = json.loads(pathlib.Path(ports_path).read_text())
if metadata.get("name") != project or int(ports.get(project, -1)) != int(port):
    raise SystemExit("existing project registration does not match")
PY
fi

install -d -m 0700 "$app_root/shared/secrets" "$app_root/shared/backups"
runtime_env="$app_root/shared/secrets/api.env"
if [[ -f "$runtime_env" ]]; then
  cmp --silent "$api_env" "$runtime_env" || {
    echo "Existing production environment differs; refusing implicit secret rotation." >&2
    exit 1
  }
else
  install -m 0600 "$api_env" "$runtime_env"
fi

deploy_env_tmp="$app_root/shared/.deploy.env.$release_id.tmp"
cat > "$deploy_env_tmp" <<EOF
LIANQIANYAN_API_IMAGE=$api_image
LIANQIANYAN_WEB_IMAGE=$web_image
LIANQIANYAN_SECRETS_ENV_FILE=$runtime_env
LIANQIANYAN_WEB_PORT=$port
EOF
chmod 0600 "$deploy_env_tmp"
mv -f "$deploy_env_tmp" "$app_root/shared/deploy.env"

docker --context rootless volume create lianqianyan_data >/dev/null
docker --context rootless run --rm \
  --user 0:0 \
  --entrypoint /bin/sh \
  --volume lianqianyan_data:/data \
  "$api_image" \
  -c 'chown 10001:10001 /data && chmod 0700 /data'

python3 "$appctl" stage "$project" "$release_id" "$stage_root" --kind directory
python3 "$appctl" deploy "$project" "$release_id" --mode loaded
python3 "$appctl" status "$project"

[[ "$(spatial_health yilian-spatial-api-1)" == healthy ]]
[[ "$(spatial_health yilian-spatial-web-1)" == healthy ]]
[[ "$(docker --context rootless inspect --format '{{.State.Health.Status}}' lianqianyan-api-1)" == healthy ]]
[[ "$(docker --context rootless inspect --format '{{.State.Health.Status}}' lianqianyan-web-1)" == healthy ]]

receipt="$app_root/logs/deployment-$release_id.json"
python3 - "$receipt" "$release_id" "$source_commit" "$api_image" "$web_image" "$image_archive_sha256" <<'PY'
import datetime
import json
import pathlib
import sys

path, release_id, commit, api_image, web_image, archive_hash = sys.argv[1:]
payload = {
    "status": "deployed",
    "release_id": release_id,
    "source_commit": commit,
    "api_image": api_image,
    "web_image": web_image,
    "offline_image_archive_sha256": archive_hash,
    "deployed_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
pathlib.Path(path).write_text(json.dumps(payload, indent=2) + "\n")
pathlib.Path(path).chmod(0o600)
PY

echo "LIANQIANYAN_RELEASE_DEPLOYED $release_id"
