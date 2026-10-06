import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function deploymentFile(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../deploy/server/${name}`, import.meta.url)),
    'utf8',
  );
}

describe('server deployment contract', () => {
  it('builds the API from locked dependencies and runs one non-root worker', () => {
    const dockerfile = deploymentFile('Dockerfile.api');

    expect(dockerfile).toContain(
      'FROM python:3.12.12-slim-bookworm@sha256:2986c55feb36e6cae00fa1fefb454283e4b33f35e75ff8bdd123b134130be301',
    );
    expect(dockerfile).toContain('ARG UV_VERSION=0.11.32');
    expect(dockerfile).toContain('"uv==${UV_VERSION}"');
    expect(dockerfile).toContain('apps/api/uv.lock');
    expect(dockerfile).toContain('uv sync --frozen --no-dev');
    expect(dockerfile).toContain('USER 10001:10001');
    expect(dockerfile).toContain('"--workers", "1"');
    expect(dockerfile).toContain('http://127.0.0.1:8000/api/health');
    expect(dockerfile).not.toMatch(/:latest\b/);
  });

  it('serves the prefixed SPA through an unprivileged web image', () => {
    const dockerfile = deploymentFile('Dockerfile.web');

    expect(dockerfile).toContain(
      'FROM nginxinc/nginx-unprivileged:1.27.5-alpine3.21@sha256:28d91bdce70ad09025ea901458fdd149259d8e05982ade79d4ef2c0d9470eb48',
    );
    expect(dockerfile).toContain('COPY --chown=101:101 dist');
    expect(dockerfile).toContain('USER 101:101');
    expect(dockerfile).toContain('http://127.0.0.1:8080/healthz');
    expect(dockerfile).not.toMatch(/:latest\b/);
  });

  it('keeps API private and exposes only the web loopback port', () => {
    const compose = deploymentFile('compose.yml');

    expect(compose).toContain('name: lianqianyan');
    expect(compose).toContain(
      '127.0.0.1:${LIANQIANYAN_WEB_PORT:-18001}:8080',
    );
    expect(compose).toContain('LIANQIANYAN_API_IMAGE:?');
    expect(compose).toContain('LIANQIANYAN_WEB_IMAGE:?');
    expect(compose).toContain('LIANQIANYAN_SECRETS_ENV_FILE:?');
    expect(compose).toContain('sqlite:////data/education.db');
    expect(compose).toContain('user: "10001:10001"');
    expect(compose).toContain('user: "101:101"');
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('cap_drop: [ALL]');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('pids_limit:');
    expect(compose).toContain('mem_limit:');
    expect(compose).toContain('driver: local');
    expect(compose).toContain('lianqianyan_data');

    const apiBlock = compose.slice(
      compose.indexOf('  api:'),
      compose.indexOf('  web:'),
    );
    expect(apiBlock).not.toMatch(/^\s+ports:/m);
    expect(compose).not.toMatch(/:latest\b/);
    expect(compose).not.toMatch(/privileged:\s*true/);
    expect(compose).not.toMatch(/network_mode:\s*host/);
  });

  it('proxies API, streaming agents, and MCP while retaining SPA fallback', () => {
    const nginx = deploymentFile('nginx.conf');

    expect(nginx).toContain('listen 8080;');
    expect(nginx).toContain('location = /healthz');
    expect(nginx).toContain('location ^~ /api/');
    expect(nginx).toContain('location = /mcp');
    expect(nginx).toContain('location ^~ /mcp/');
    expect(nginx).toContain('proxy_pass http://lianqianyan_api;');
    expect(nginx).toContain('proxy_buffering off;');
    expect(nginx).toContain('proxy_read_timeout 300s;');
    expect(nginx).toContain('try_files $uri $uri/ /index.html;');
    expect(nginx).toContain('Cache-Control "no-store"');
  });

  it('excludes credentials, databases, caches, worktrees, and user artifacts', () => {
    const ignore = deploymentFile('docker-context.ignore');
    const requiredPatterns = [
      '.env',
      '*.db',
      '*.sqlite',
      '*.sqlite3',
      '.git',
      '.local',
      '.worktrees',
      'node_modules',
      '__pycache__',
      'release',
      '*.pptx',
      '*.mp4',
    ];

    for (const pattern of requiredPatterns) {
      expect(ignore, `missing ${pattern}`).toContain(pattern);
    }
  });

  it('builds a clean prefixed release and exports verified base images', () => {
    const script = deploymentFile('build-release.ps1');

    expect(script).toContain("VITE_BASE_PATH = '/lianqianyan/'");
    expect(script).toContain("VITE_EDUCATION_API_URL = '/lianqianyan'");
    expect(script).toContain('git status --porcelain --untracked-files=no');
    expect(script).toContain(
      "Invoke-Checked -FilePath 'pnpm' -ArgumentList @('build')",
    );
    expect(script).toContain('regctl-windows-amd64.exe');
    expect(script).toContain(
      '3dcf16028cbe95ead5d2706c5a646e5614478e4782b5fdd11e274a0d92973267',
    );
    expect(script).toContain('regctl image export');
    expect(script).toContain('python-base-linux-amd64.tar');
    expect(script).toContain('nginx-base-linux-amd64.tar');
    expect(script).not.toMatch(/git\s+(clean|reset\s+--hard)/);
  });

  it('prepares only the dedicated Rootless release and retains an offline image archive', () => {
    const script = deploymentFile('prepare-release.sh');

    expect(script).toContain('project=lianqianyan');
    expect(script).toContain('port=18001');
    expect(script).toContain('/opt/apps/.framework/appctl.py');
    expect(script).toContain('docker --context rootless load');
    expect(script).toContain('docker --context rootless build');
    expect(script).toContain('docker --context rootless save');
    expect(script).toContain('python3 "$appctl" init');
    expect(script).toContain('python3 "$appctl" stage');
    expect(script).toContain('python3 "$appctl" deploy');
    expect(script).toContain('lianqianyan_data');
    expect(script).toContain('"$stage_root/deploy/server/backup.sh"');
    expect(script).toContain('install -m 0700');
    expect(script).toContain(
      'runtime_env="$app_root/shared/secrets/api.env"',
    );
    expect(script).toContain('yilian-spatial');
    expect(script).not.toMatch(/docker(?:\s+--context\s+rootless)?\s+(system\s+)?prune/);
    expect(script).not.toMatch(/docker(?:\s+--context\s+rootless)?\s+compose\s+down/);
  });

  it('creates a consistent private SQLite backup', () => {
    const script = deploymentFile('backup.sh');

    expect(script).toContain('sqlite3.Connection.backup');
    expect(script).toContain('PRAGMA quick_check');
    expect(script).toContain('lianqianyan-api-1');
    expect(script).toContain('/opt/apps/lianqianyan/shared/backups');
    expect(script).toContain('chmod 0600');
    expect(script).toContain('sha256sum');
  });

  it('guards the only root change and preserves the existing root proxy', () => {
    const script = deploymentFile('install-nginx-route.sh');

    expect(script).toContain('[[ "$(id -u)" == 0 ]]');
    expect(script).toContain('iZ2vc47kmc8j8wtcbhfhclZ');
    expect(script).toContain('http://127.0.0.1:18001/healthz');
    expect(script).toContain('proxy_pass http://127.0.0.1:17800;');
    expect(script).toContain('location ^~ /lianqianyan/');
    expect(script).toContain('proxy_pass http://127.0.0.1:18001/;');
    expect(script).toContain('nginx -t');
    expect(script).toContain('systemctl reload nginx');
    expect(script).toContain('cp -a "$backup" "$site"');
    expect(script).toContain('route_state=$(python3');
    expect(script).toContain('if [[ "$route_state" == present ]]');
    expect(script).not.toContain('X-YiLian-Proxy-Token');
  });

  it('documents deploy, status, backup, rollback, and recovery commands', () => {
    const readme = deploymentFile('README.md');

    for (const command of [
      'build-release.ps1',
      'render_runtime_env.py',
      'prepare-release.sh',
      'install-nginx-route.sh',
      'appctl.py status lianqianyan',
      'backup.sh',
      'appctl.py rollback lianqianyan',
    ]) {
      expect(readme, `missing ${command}`).toContain(command);
    }
    expect(readme).toContain('https://8.156.67.132/lianqianyan/');
    expect(readme).toContain('不得上传本机 SQLite');
  });
});
