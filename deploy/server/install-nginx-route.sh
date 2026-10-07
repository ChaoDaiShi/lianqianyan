#!/usr/bin/env bash
set -euo pipefail
umask 077

release_id=${1:-}
[[ "$(id -u)" == 0 ]]
[[ "$(hostname)" == iZ2vc47kmc8j8wtcbhfhclZ ]]
[[ "$release_id" =~ ^[0-9]{8}-[0-9a-f]{12}$ ]]

site=/etc/nginx/sites-available/yilian-spatial
state="/home/aiops/.local/lianqianyan-deploy/$release_id"
backup="/var/lib/yilian-ops/yilian-spatial-before-lianqianyan-$release_id.conf"
changed=0

[[ -f "$site" && ! -L "$site" && "$(stat -c %U:%G:%a "$site")" == root:root:600 ]]
[[ -d "$state" && "$(stat -c %U "$state")" == aiops ]]
[[ "$(curl -fsS --max-time 10 http://127.0.0.1:18001/healthz)" == ok ]]
curl -fsS --max-time 10 http://127.0.0.1:18001/api/health \
  | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok"'

wait_for_public_health() {
  local attempt response
  for attempt in $(seq 1 30); do
    response=$(curl -fsS --connect-timeout 1 --max-time 2 \
      https://8.156.67.132/lianqianyan/healthz 2>/dev/null || true)
    if [[ "$response" == ok ]]; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

route_state=$(python3 - "$site" <<'PY'
import pathlib
import sys

text = pathlib.Path(sys.argv[1]).read_text()
old_proxy = "proxy_pass http://127.0.0.1:17800;"
route = '''    location = /lianqianyan {
        return 308 /lianqianyan/;
    }
    location ^~ /lianqianyan/ {
        proxy_pass http://127.0.0.1:18001/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
'''
if text.count(old_proxy) != 1:
    raise SystemExit("existing root proxy is missing or ambiguous")
if "location ^~ /lianqianyan/" not in text:
    print("absent")
elif text.count(route) == 1:
    print("present")
else:
    raise SystemExit("existing lianqianyan route differs from the reviewed route")
PY
)

rollback_site() {
  if [[ "$changed" == 1 && -f "$backup" ]]; then
    cp -a "$backup" "$site"
    nginx -t
    systemctl reload nginx
  fi
}
trap rollback_site ERR

if [[ "$route_state" == present ]]; then
  nginx -t
else
  [[ "$route_state" == absent ]]
  install -d -m 0755 /var/lib/yilian-ops
  if [[ -e "$backup" ]]; then
    [[ -f "$backup" && ! -L "$backup" ]]
    [[ "$(stat -c %U:%G:%a "$backup")" == root:root:600 ]]
    cmp -s "$backup" "$site"
  else
    cp -a "$site" "$backup"
  fi
  changed=1

  python3 - "$site" <<'PY'
import os
import pathlib
import tempfile
import sys

site = pathlib.Path(sys.argv[1])
text = site.read_text()
old_proxy = "proxy_pass http://127.0.0.1:17800;"
if text.count(old_proxy) != 1:
    raise SystemExit("existing root proxy is missing or ambiguous")

route = '''    location = /lianqianyan {
        return 308 /lianqianyan/;
    }
    location ^~ /lianqianyan/ {
        proxy_pass http://127.0.0.1:18001/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
'''

anchor = '''    add_header X-Content-Type-Options nosniff always;
    location / {
        proxy_pass http://127.0.0.1:17800;'''
replacement = '''    add_header X-Content-Type-Options nosniff always;
''' + route + '''    location / {
        proxy_pass http://127.0.0.1:17800;'''
if text.count(anchor) != 1:
    raise SystemExit("HTTPS root location anchor is missing or ambiguous")
updated = text.replace(anchor, replacement, 1)

descriptor, temporary_name = tempfile.mkstemp(
    prefix=".yilian-spatial.", suffix=".tmp", dir=site.parent
)
try:
    with os.fdopen(descriptor, "w") as output:
        output.write(updated)
        output.flush()
        os.fsync(output.fileno())
    os.chmod(temporary_name, 0o600)
    os.replace(temporary_name, site)
finally:
    pathlib.Path(temporary_name).unlink(missing_ok=True)
PY
  nginx -t
  systemctl reload nginx
fi
wait_for_public_health
curl -fsS --max-time 15 https://8.156.67.132/ >/dev/null

changed=0
trap - ERR
receipt="$state/root-nginx-route.done.json"
python3 - "$receipt" "$release_id" "$backup" <<'PY'
import datetime
import json
import pathlib
import sys

path, release_id, backup = sys.argv[1:]
payload = {
    "status": "installed",
    "release_id": release_id,
    "backup": backup,
    "installed_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
}
receipt = pathlib.Path(path)
receipt.write_text(json.dumps(payload, indent=2) + "\n")
receipt.chmod(0o600)
PY
chown aiops:aiops "$receipt"

echo "LIANQIANYAN_NGINX_ROUTE_INSTALLED $release_id"
