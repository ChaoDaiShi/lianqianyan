# EducationMind Product Hardening Implementation Plan

> **For agentic workers:** Execute this plan inline in the current session. Subagents are explicitly forbidden by the user. Apply `systematic-debugging`, `test-driven-development`, and `verification-before-completion` at every bug-fix boundary.

**Goal:** Remove verified runtime noise, preserve honest empty-state semantics, reduce initial bundle size, modernize UTC generation, and restore mobile first-screen action reachability without changing EducationMind business behavior.

**Architecture:** Keep the existing React hooks/API/FastAPI boundaries. Add small pure helpers for optional development integrations and accepted Current Plan response statuses, use React Router lazy route modules for page-level chunks, and centralize naive-UTC generation in the backend.

**Tech Stack:** React 18, React Router 7, Vite 5, TypeScript, Vitest, Tailwind CSS, FastAPI, SQLAlchemy, Python 3.12, pytest.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Do not modify API contracts, database schema, Agent, MCP, learning evidence, mastery, diagnosis, planning, or replanning semantics.
- Do not add Memory Center, voice, infinite canvas, fake user memory, fake progress, fake knowledge relations, XP, or streak data.
- Preserve the untracked `docs/创新赛道——开发日志参考模板.docx`.
- Do not use subagents.

---

### Task 1: Clean optional Vite development integrations

**Files:**
- Create: `src/config/devIntegrations.ts`
- Test: `src/config/devIntegrations.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: `resolveDevIntegrations(env: Record<string, string | undefined>): { designMode: boolean; monitorUrl: string | null }`
- Consumes: optional `XAGI_DESIGN_MODE=true` and `XAGI_DEV_MONITOR_URL=https://...` environment values.

- [ ] Write tests asserting integrations are disabled by default, boolean parsing is exact, and only HTTP(S) monitor URLs are accepted.
- [ ] Run `pnpm exec vitest run src/config/devIntegrations.test.ts` and confirm failure because the module does not exist.
- [ ] Implement the pure resolver and make `vite.config.ts` register/inject integrations only when explicitly enabled.
- [ ] Re-run the focused test and confirm it passes.
- [ ] Restart Vite and verify neither `/sdk/dev-monitor.js` nor `/@appdev-design-mode/client.js` is requested by default.

### Task 2: Treat missing Current Plan as an honest empty state

**Files:**
- Test: `src/lib/educationApi.test.ts`
- Modify: `src/lib/educationApi.ts`

**Interfaces:**
- Produces: `isCurrentPlanResponseStatus(status: number): boolean` returning true only for 2xx and 404.
- Consumes: Axios `validateStatus` on `GET /api/plans/current`.

- [ ] Write tests for 200, 204, 404, 400, 500, and 0.
- [ ] Run `pnpm exec vitest run src/lib/educationApi.test.ts` and confirm failure because the status function does not exist.
- [ ] Add the helper, pass it as `validateStatus`, and map a 404 response directly to `null` without throwing through the shared interceptor.
- [ ] Re-run the focused test and confirm it passes.
- [ ] Open `/`, `/my-learning`, `/archive`, `/space`, and `/demo` with no ACTIVE plan and verify no `API Error: 404` console message appears.

### Task 3: Split route pages into lazy chunks

**Files:**
- Create: `src/router/routeManifest.ts`
- Test: `src/router/routeManifest.test.ts`
- Modify: `src/router/index.tsx`
- Modify page modules only to add `Component` route exports where needed.

**Interfaces:**
- Produces: a typed route manifest containing every existing path exactly once.
- Consumes: React Router route-level `lazy` functions.

- [ ] Write a manifest test asserting all existing paths and unique path membership.
- [ ] Run the focused test and confirm failure because the manifest does not exist.
- [ ] Implement the manifest and convert all non-home pages to lazy route modules while retaining every current path.
- [ ] Add a small accessible route-loading fallback only if the router API requires it.
- [ ] Run focused tests and `pnpm build`; confirm the build emits page chunks and the entry chunk is below 500 kB without a chunk-size warning.

### Task 4: Centralize warning-free UTC generation

**Files:**
- Create: `apps/api/app/core/time.py`
- Create: `apps/api/tests/test_time.py`
- Modify: `apps/api/app/domain/models.py`
- Modify: `apps/api/app/core/seed.py`
- Modify: affected files under `apps/api/app/services/`
- Modify: affected datetime fixtures in `apps/api/tests/`

**Interfaces:**
- Produces: `utc_now() -> datetime`, a naive datetime whose value represents UTC.
- Consumes: SQLAlchemy `default`/`onupdate`, Pydantic default factories, services and repositories.

- [ ] Write a test asserting `utc_now()` exists, is warning-free, remains naive for the current DB schema, and is within two seconds of current UTC.
- [ ] Run the focused pytest and confirm failure because the module does not exist.
- [ ] Implement `utc_now()` and replace every production `datetime.utcnow` reference.
- [ ] Replace the two test fixture call sites so project-owned warnings are eliminated.
- [ ] Run backend tests with warning reporting and confirm only the third-party Starlette warning remains.

### Task 5: Improve mobile first-screen reachability and document metadata

**Files:**
- Modify: `src/components/home/HeroBanner.tsx`
- Modify: `src/components/xiaolian/XiaolianCharacter.tsx`
- Modify: `index.html`

**Interfaces:**
- Preserves: Hero content, data-derived observation/suggestion, current-task behavior, desktop size tokens.

- [ ] Capture the current 390×844 Hero/button/nav coordinates as the failing visual baseline.
- [ ] Reduce only mobile Hero image size, minimum height, padding, and vertical gaps; restore current values at `sm`/`lg` breakpoints.
- [ ] Set `lang="zh-CN"` and replace the missing Vite favicon with an existing local Xiaolian SVG.
- [ ] Verify at 390×844 that the first primary action does not intersect the fixed bottom nav, five nav items remain in bounds, and no horizontal overflow appears.
- [ ] Verify desktop 1440×1000 visual hierarchy remains intact.

### Task 6: Full verification and delivery audit

**Files:**
- Modify: `docs/EducationMind开发日志.md` with factual results only.

- [ ] Run `pnpm exec vitest run` and record exact test counts.
- [ ] Run `pnpm check` and confirm TypeScript and ESLint pass.
- [ ] Run `pnpm build` and record chunk sizes/warnings.
- [ ] Run `apps/api/.venv/Scripts/python.exe -m pytest -q` from `apps/api` and record exact pass/warning counts.
- [ ] Start the real API and frontend; inspect all principal routes at 390×844 and 1440×1000 for page errors, failed business requests, broken images, overflow, and console errors.
- [ ] Run `git diff --check`, inspect `git status`, and confirm the reference DOCX and SQLite files were not altered or staged.
- [ ] Append a concise development-log entry that distinguishes implementation, automated verification, live verification, visual verification, and remaining third-party limitations.
