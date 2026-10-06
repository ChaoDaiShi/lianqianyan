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
});
