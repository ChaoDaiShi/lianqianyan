# 涟千言 ECS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` inline. This repository forbids subagents without explicit notice, so all steps stay in the primary session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the current 涟千言 React/Vite and FastAPI application at `https://8.156.67.132/lianqianyan/` without changing the existing root application on the ECS host.

**Architecture:** Build a path-prefixed Vite artifact, package it into an unprivileged Web image, and run FastAPI in a separate unprivileged API image on the existing Rootless Docker host. Expose only `127.0.0.1:18001`, then append one `/lianqianyan/` route to the existing host Nginx configuration after both containers pass health checks.

**Tech Stack:** React 18, TypeScript, Vite 5, pnpm, Vitest, FastAPI, Python 3.12, uv, SQLite, Rootless Docker Compose, unprivileged Nginx, Ubuntu 22.04.

## Global Constraints

- Use `pnpm` for all frontend package operations.
- Do not use subagents.
- Public brand remains “涟千言”; internal `EducationMind` and `EDUCATION_*` compatibility names remain.
- Do not upload the local SQLite database, local debug account, `.env`, private keys, PPT/video files, `.local` archive, or ignored user artifacts.
- Do not modify, restart, rename, rebuild, prune, or clean the existing `yilian-spatial` project, its images, volumes, network, release records, or root public route.
- The new Web port binds only to `127.0.0.1:18001`; the API has no host port.
- Production SQLite uses one Uvicorn worker and a dedicated named volume.
- Production cookies are Secure and the final CAPTCHA mode is `auto`.
- Do not push GitHub unless the user separately requests it.
- Every behavior change follows RED → GREEN. Deployment configuration receives executable contract tests.
- Run `pnpm check` before finalizing.

---

### Task 1: Production public-prefix contract

**Files:**
- Create: `src/config/deployment.ts`
- Create: `src/config/deployment.test.ts`
- Modify: `vite.config.ts`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `resolvePublicBasePath(value: unknown): string`, returning `/` or a normalized leading/trailing-slash path such as `/lianqianyan/`.
- Consumed by: `vite.config.ts` as Vite `base`.

- [ ] **Step 1: Write the failing public-prefix tests**

Cover undefined/empty values, `lianqianyan`, `/lianqianyan`, `/lianqianyan/`, repeated slashes, query/hash/control characters, protocol-relative URLs, and absolute URLs. Valid values normalize to one leading and trailing slash; unsafe values fall back to `/`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm test -- --run src/config/deployment.test.ts
```

Expected: FAIL because `src/config/deployment.ts` does not exist.

- [ ] **Step 3: Implement the minimal resolver and Vite integration**

Create the pure resolver, add `VITE_BASE_PATH` to `ImportMetaEnv`, and set:

```ts
base: resolvePublicBasePath(process.env.VITE_BASE_PATH),
```

Do not change development proxy behavior.

- [ ] **Step 4: Verify GREEN**

Run the same focused test. Expected: all cases pass.

- [ ] **Step 5: Commit**

```powershell
git add src/config/deployment.ts src/config/deployment.test.ts src/vite-env.d.ts vite.config.ts
git commit -m "feat: support prefixed production deployment"
```

### Task 2: Container and proxy deployment contract

**Files:**
- Create: `deploy/server/Dockerfile.api`
- Create: `deploy/server/Dockerfile.web`
- Create: `deploy/server/nginx.conf`
- Create: `deploy/server/compose.yml`
- Create: `deploy/server/docker-context.ignore`
- Create: `src/config/serverDeploymentContract.test.ts`

**Interfaces:**
- Web container: `8080`, `/healthz`, static SPA, `/api/*` and `/mcp*` reverse proxy to `api:8000`.
- API container: `8000`, `/api/health`, one Uvicorn worker.
- Host interface: `127.0.0.1:${LIANQIANYAN_WEB_PORT:-18001}:8080`.

- [ ] **Step 1: Write a failing file-contract test**

The test reads the five deployment files and requires:

- fixed non-`latest` base images;
- `uv sync --frozen --no-dev` and one Uvicorn worker;
- non-root UIDs;
- API without host ports;
- Web loopback binding at 18001;
- read-only roots, capability drops, no-new-privileges, limits and log rotation;
- dedicated network and data volume;
- `/api`, `/mcp`, `/healthz`, SPA fallback and disabled proxy buffering;
- exclusion of `.env`, database files, `.git`, `.local`, `release`, worktrees, caches and competition artifacts.

- [ ] **Step 2: Verify RED**

```powershell
pnpm test -- --run src/config/serverDeploymentContract.test.ts
```

Expected: FAIL because the deployment files are absent.

- [ ] **Step 3: Create the minimal production files**

Use `python:3.12.12-slim-bookworm` with `uv==0.11.32` for API and `nginxinc/nginx-unprivileged:1.27.5-alpine3.21` for Web. The release Compose uses immutable application tags supplied through required environment variables.

- [ ] **Step 4: Verify GREEN and render Compose**

Run:

```powershell
pnpm test -- --run src/config/serverDeploymentContract.test.ts
```

On the ECS host, run `docker --context rootless compose config` with non-secret placeholder environment values. Expected: exit 0, no host port except loopback 18001.

- [ ] **Step 5: Commit**

```powershell
git add deploy/server src/config/serverDeploymentContract.test.ts
git commit -m "feat: add isolated server runtime"
```

### Task 3: Safe production environment renderer

**Files:**
- Create: `deploy/server/render_runtime_env.py`
- Create: `deploy/server/tests/test_render_runtime_env.py`
- Create: `deploy/server/runtime.env.example`

**Interfaces:**
- Command:

```text
python deploy/server/render_runtime_env.py --source apps/api/.env --output .local/ecs-lianqianyan-20261006/api.env --origin https://8.156.67.132 --public-prefix /lianqianyan
```

- Output: a dotenv file containing only supported provider keys plus production overrides; stdout never contains values.

- [ ] **Step 1: Write failing Python tests**

Cover duplicate source keys using last-value semantics, strict source allowlist, generated JWT/Fernet secrets, HTTPS origin validation, normalized prefix, JSON-style dotenv quoting, production database/CORS/cookie/MCP overrides, and `captcha_mode=auto`.

- [ ] **Step 2: Verify RED**

From `apps/api`:

```powershell
uv run pytest ..\..\deploy\server\tests\test_render_runtime_env.py -q
```

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement the renderer**

Use only the Python standard library. Generate a fresh production JWT secret and URL-safe 32-byte model encryption key. Write atomically; set mode `0600` on POSIX. Do not copy local `EDUCATION_DATABASE_URL`, JWT secret, model secret, CORS, cookie, MCP URL/hosts, CAPTCHA mode, or unknown keys.

- [ ] **Step 4: Verify GREEN**

Run the focused Python test. Expected: all cases pass and captured stdout contains no fixture secret.

- [ ] **Step 5: Commit**

```powershell
git add deploy/server/render_runtime_env.py deploy/server/runtime.env.example deploy/server/tests/test_render_runtime_env.py
git commit -m "feat: render private production environment"
```

### Task 4: Release, backup, and root-route scripts

**Files:**
- Create: `deploy/server/build-release.ps1`
- Create: `deploy/server/prepare-release.sh`
- Create: `deploy/server/backup.sh`
- Create: `deploy/server/install-nginx-route.sh`
- Create: `deploy/server/README.md`
- Modify: `src/config/serverDeploymentContract.test.ts`

**Interfaces:**
- `build-release.ps1`: builds the exact Git commit with `/lianqianyan/`, creates a clean tar context and manifest, and rejects dirty tracked state.
- `prepare-release.sh`: builds fixed API/Web images, initializes the framework project/port and named-volume ownership, stages the immutable release, and deploys it without touching other projects.
- `backup.sh`: uses SQLite online backup, `PRAGMA quick_check`, SHA-256 and mode 0600.
- `install-nginx-route.sh`: root-only, exact-host guarded, health-gated, backup-first, idempotent, `nginx -t` before reload, restore-on-failure.

- [ ] **Step 1: Extend the contract test and verify RED**

Require exact project name, port, private paths, backup API, root/hostname guards, old `17800` route assertion, new `18001` route, Nginx backup/restore and no prune/global Compose commands.

- [ ] **Step 2: Implement scripts and deployment guide**

Scripts must avoid printing environment values, tokens or account passwords. The guide must provide initial deployment, status, backup, rollback, logs and recovery commands with the real public prefix.

- [ ] **Step 3: Verify GREEN and shell syntax**

Run the Vitest contract and, on the ECS host:

```bash
bash -n prepare-release.sh backup.sh install-nginx-route.sh
```

Expected: exit 0. Do not execute the root route script yet.

- [ ] **Step 4: Commit**

```powershell
git add deploy/server src/config/serverDeploymentContract.test.ts
git commit -m "feat: add guarded ecs release workflow"
```

### Task 5: Local gates and immutable release build

**Files:**
- Create locally and keep ignored: `.local/ecs-lianqianyan-20261007/**`
- Modify after verification: `docs/verification/2026-10-07-ecs-deployment.md`

Before the steps, compute and retain the immutable identifiers:

```powershell
$sourceCommit = (git rev-parse HEAD).Trim()
$releaseId = (Get-Date -Format 'yyyyMMdd') + '-' + $sourceCommit.Substring(0, 12)
$localEvidence = 'F:\比赛\智能体 ican 教育skill\.worktrees\server-deployment\.local\ecs-lianqianyan-20261007'
$remoteRelease = "/home/aiops/.local/lianqianyan-deploy/$releaseId"
```

- [ ] **Step 1: Run focused tests**

```powershell
pnpm test -- --run src/config/deployment.test.ts src/config/serverDeploymentContract.test.ts
Set-Location apps\api
uv run pytest ..\..\deploy\server\tests\test_render_runtime_env.py -q
```

- [ ] **Step 2: Run required frontend gate**

```powershell
Set-Location 'F:\比赛\智能体 ican 教育skill\.worktrees\server-deployment'
pnpm check
```

- [ ] **Step 3: Build the exact prefixed artifact**

Run `deploy/server/build-release.ps1`. Verify `dist/index.html` references `/lianqianyan/assets/`, every referenced asset exists, Live2D files are included only when present and permitted, and the archive contains no `.env`, DB, secret, Git, worktree or user artifact. The script must verify the pinned `regctl` binary, export the two digest-pinned Linux/amd64 base images without Docker Desktop, and write a SHA-256 beside every archive.

- [ ] **Step 4: Create the production env without exposing values**

Run the renderer into the ignored evidence directory. Record only key names, set/unset state, file mode and SHA-256; never record values.

- [ ] **Step 5: Commit deployment evidence skeleton**

Create the verification document with exact source commit, commands and pending server checks. Commit only the document, never the generated env or release archive.

### Task 6: Rootless ECS deployment and private acceptance account

**Files:**
- Upload the generated archive and private env to `$remoteRelease`, computed in Task 5; reuse that exact value for the whole deployment.
- Server project: `/opt/apps/lianqianyan/`

- [ ] **Step 1: Preflight the existing host**

Confirm disk/memory, Rootless Docker health, `yilian-spatial` container health, port registry, port 18001 availability and no existing `lianqianyan` project. Stop if an unexpected conflicting project exists.

- [ ] **Step 2: Upload and verify bytes**

Use `scp` through `aliyun-ai`, compare local/server SHA-256, set private env mode 0600, and inspect archive member names before extraction.

- [ ] **Step 3: Build immutable images sequentially**

Build API then Web with Rootless Docker, using the source commit in image labels and tags. Inspect labels, architecture, user, entrypoint and image history; save an offline image archive plus SHA-256.

- [ ] **Step 4: Stage and deploy**

Run `prepare-release.sh`. Verify only the new project resources appear and both new containers become healthy. Confirm the existing two containers remain healthy.

- [ ] **Step 5: Create the acceptance account on loopback only**

Temporarily set CAPTCHA off while the service has no public route, create one strong acceptance account through the real registration API, save credentials to mode-0600 private files, restore `captcha_mode=auto`, redeploy/restart only `lianqianyan`, and confirm the final public config requires the configured chain.

- [ ] **Step 6: Loopback verification**

Check Web 200, API health 200, protected endpoint 401, login/session/logout, Agent SSE `done`, MCP without bearer 401, provider status endpoints and SQLite `quick_check`. Run `backup.sh` and verify the backup artifact.

### Task 7: Host Nginx route and public browser acceptance

**Files:**
- Root-reviewed script staged inside the exact release directory computed in Task 6 as `install-nginx-route.sh`.
- Final evidence: `docs/verification/2026-10-07-ecs-deployment.md`

- [ ] **Step 1: Review and hash the exact root script**

Compare it with the committed file, calculate SHA-256 locally and remotely, and prepare a single root command that verifies the hash before execution. If no authenticated root/admin channel is active, finish every non-root deployment step first, then request only the unavoidable root-session handoff.

- [ ] **Step 2: Install the route**

Execute the reviewed script as root. Require `nginx -t` success, reload only Nginx, and save a receipt. On failure, restore the backup and keep the loopback deployment running for diagnosis.

- [ ] **Step 3: Public HTTP/API verification**

Verify HTTP redirects to HTTPS, TLS verification succeeds, `/lianqianyan/` and API health return 200, protected endpoints return 401, static assets use the prefix, and the existing root application still returns its expected page and protected API status.

- [ ] **Step 4: Browser workflow**

Use the real acceptance account. Verify login, session refresh, home, Xiaolian, knowledge, resources, exams, settings, logout, responsive 1440/1024/390 layouts, zero horizontal overflow, and zero console/page/request/5xx failures. Exercise one Agent SSE answer and record the real provider/fallback status.

- [ ] **Step 5: MCP scope verification**

Create one account MCP token, confirm no-token access is rejected, call one read-only tool with the token, verify the server fixes learner/course scope to the account, revoke the token, and confirm it no longer works. Do not print or persist the plaintext token outside the private test process.

- [ ] **Step 6: Persistence and isolation verification**

Restart only `lianqianyan`. Confirm account/session re-login, database row counts, Agent history/test state and backup digest remain. Reconfirm the existing project containers, root page and data-backed page are unchanged.

- [ ] **Step 7: Complete evidence and commit**

Record exact release, image IDs, archive/backup hashes, container health, public URL, browser results, provider results, root-site preservation and any unexecuted checks. Commit the evidence document.

### Task 8: Final branch integration

- [ ] Run `pnpm check`, focused deployment tests, `git diff --check` and verify a clean feature worktree.
- [ ] Review the feature diff for credentials, database files, absolute local paths, broad cleanup commands and changes outside the approved scope.
- [ ] Merge `codex/server-deployment` into local `main` after all application and public deployment checks pass.
- [ ] Delete the feature worktree and branch after confirming the local merge.
- [ ] Do not push `origin/main`; report the exact local HEAD and ahead/behind state.
