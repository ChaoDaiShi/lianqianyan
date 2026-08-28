# EducationMind 登录与验证码恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复历史账号因 API 工作目录切换数据库而无法登录的问题，并让登录/注册失败后 Turnstile 自动获得新的验证机会。

**Architecture:** 在前端保留认证表单状态，通过 `TurnstileWidget` 的受控 handle 清空一次性 token并调用 Cloudflare reset；`AuthScreen` 监听认证错误触发恢复，不自动重复提交密码请求。后端在 `Settings` 配置层把所有相对 SQLite URL 锚定到 `apps/api` 目录，显式绝对数据库 URL 和内存数据库保持不变。

**Tech Stack:** React 18 + TypeScript + Vitest；FastAPI + Pydantic Settings + SQLAlchemy + pytest；PowerShell/`pnpm`。

## Global Constraints

- 保留服务端 Turnstile 校验、密码校验、失败次数和账号锁定逻辑，不自动创建账号或合并数据库。
- 登录/注册失败只清除验证码 token，不清除用户名、显示名称和密码。
- 生产或部署环境提供的绝对 `EDUCATION_DATABASE_URL` 不得被改写。
- 按仓库契约使用 `pnpm` 完成前端检查与构建；后端使用 `apps/api` 现有 `uv run pytest` 测试入口。
- 工作区已有未提交改动属于用户状态；只修改本计划列出的认证文件和相关文档/测试。

---

### Task 1: 固定验证码失败恢复行为

**Files:**
- Create: `src/auth/turnstileRecovery.test.ts`
- Modify: `src/auth/TurnstileWidget.tsx`
- Modify: `src/auth/AuthScreen.tsx`
- Modify: `src/auth/AuthScreen.test.tsx`

**Interfaces:**
- Produces `TurnstileWidgetHandle.reset(): void` for the page-level error recovery.
- Produces `resetTurnstileWidget(turnstile, widgetId, onToken): void`, which clears the token callback before invoking the provider reset when a widget exists.

- [ ] **Step 1: Write the failing unit test for reset semantics**

Add a test that calls the exported helper with a fake Turnstile object and asserts the token is cleared before the provider's `reset` call; add a second assertion that a missing widget id still clears the token without throwing:

```ts
import { describe, expect, it, vi } from 'vitest';
import { resetTurnstileWidget } from './TurnstileWidget';

describe('resetTurnstileWidget', () => {
  it('clears the one-time token and resets the rendered widget', () => {
    const onToken = vi.fn();
    const reset = vi.fn();

    resetTurnstileWidget({ reset }, 'widget-1', onToken);

    expect(onToken).toHaveBeenCalledWith(null);
    expect(reset).toHaveBeenCalledWith('widget-1');
    expect(onToken.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0]);
  });

  it('clears the token when the widget has not rendered yet', () => {
    const onToken = vi.fn();

    expect(() => resetTurnstileWidget(undefined, null, onToken)).not.toThrow();
    expect(onToken).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run the test and verify the expected RED failure**

Run `pnpm test --run src/auth/turnstileRecovery.test.ts` from `F:\比赛\智能体 ican 教育skill`.

Expected result: Vitest fails because `resetTurnstileWidget` is not exported yet; this confirms the test is exercising the missing recovery behavior rather than existing markup.

- [ ] **Step 3: Implement the minimal widget handle and page recovery**

In `src/auth/TurnstileWidget.tsx`, add the typed handle and helper, wrap the component with `forwardRef`, and implement `reset()` with `useImperativeHandle`:

```tsx
export interface TurnstileWidgetHandle {
  reset(): void;
}

export function resetTurnstileWidget(
  turnstile: Window['turnstile'] | undefined,
  widgetId: string | null,
  onToken: (token: string | null) => void,
): void {
  onToken(null);
  if (turnstile && widgetId) turnstile.reset(widgetId);
}
```

Use `forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>` and `useImperativeHandle(ref, () => ({ reset: () => resetTurnstileWidget(window.turnstile, widgetRef.current, onToken) }), [onToken])`. Keep the existing render, expired, error, cleanup, script loading, and theme behavior unchanged.

In `AuthScreen.tsx`, hold `const captchaRef = useRef<TurnstileWidgetHandle>(null)`, call `captchaRef.current?.reset()` from an effect whenever `error` is non-null, and pass `ref={captchaRef}` to `TurnstileWidget`. The form field state must remain untouched; the existing disabled-submit guard remains in force while a new token is unavailable.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run `pnpm test --run src/auth/turnstileRecovery.test.ts src/auth/AuthScreen.test.tsx`.

Expected result: all tests pass with no TypeScript or runtime errors. The existing static AuthScreen assertions must continue to pass.

- [ ] **Step 5: Commit the isolated frontend fix**

Run:

```powershell
git add src/auth/TurnstileWidget.tsx src/auth/AuthScreen.tsx src/auth/turnstileRecovery.test.ts src/auth/AuthScreen.test.tsx
git commit -m "fix: reset turnstile after auth failure"
```

### Task 2: Anchor relative API SQLite URLs

**Files:**
- Create: `apps/api/tests/test_database_url.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `README.md`

**Interfaces:**
- Produces `Settings.database_url` normalized so relative SQLite database names resolve under `API_ENV_FILE.parent` (`apps/api`).
- Preserves absolute SQLite paths, `:memory:`, and non-SQLite URLs byte-for-byte.

- [ ] **Step 1: Write the failing configuration regression test**

Create `apps/api/tests/test_database_url.py`:

```python
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import API_ENV_FILE, Settings


def test_relative_sqlite_url_is_anchored_to_api_directory() -> None:
    settings = Settings(database_url="sqlite:///./education.db", _env_file=None)

    expected = (API_ENV_FILE.parent / "education.db").resolve()

    actual_database = make_url(settings.database_url).database
    assert actual_database is not None
    assert Path(actual_database).is_absolute()
    assert Path(actual_database).resolve() == expected


def test_explicit_absolute_and_memory_database_urls_are_preserved() -> None:
    absolute = (API_ENV_FILE.parent / "custom.db").resolve()

    assert Settings(database_url=f"sqlite:///{absolute.as_posix()}", _env_file=None).database_url == f"sqlite:///{absolute.as_posix()}"
    assert Settings(database_url="sqlite:///:memory:", _env_file=None).database_url == "sqlite:///:memory:"
```

- [ ] **Step 2: Run the configuration test and verify RED**

Run `uv run pytest tests/test_database_url.py -q` from `F:\比赛\智能体 ican 教育skill\apps\api`.

Expected result: the relative-path assertion fails because `Settings` currently returns `sqlite:///./education.db` and SQLAlchemy resolves it relative to the caller's working directory.

- [ ] **Step 3: Implement URL normalization at the settings boundary**

In `apps/api/app/core/config.py`, import `make_url` and `field_validator`, define an internal `_anchor_relative_sqlite_url(value: str) -> str`, and add a `@field_validator("database_url")` that returns the anchored URL. The helper must return the original value for non-SQLite URLs, missing/`:memory:` database names, and absolute database paths; only resolve a relative SQLite database against `API_ENV_FILE.parent` and render it back through the SQLAlchemy URL object.

This handles the current `.env` value `sqlite:///./education.db` without editing or overwriting the ignored `.env` or either existing SQLite file.

- [ ] **Step 4: Document the stable path contract**

Update the README backend section to state that relative SQLite paths are anchored to `apps/api`, while deployments should continue to use an explicit absolute `EDUCATION_DATABASE_URL`. Keep the existing warning not to commit production databases and do not name or migrate either existing local database.

- [ ] **Step 5: Run the backend regression and auth tests**

Run `uv run pytest tests/test_database_url.py tests/test_config_env_file.py tests/test_auth.py tests/test_turnstile.py -q`.

Expected result: all selected tests pass, including case-insensitive login, session creation, lockout, and server-side Turnstile behavior.

- [ ] **Step 6: Commit the backend fix**

Run:

```powershell
git add apps/api/app/core/config.py apps/api/tests/test_database_url.py README.md
git commit -m "fix: anchor auth database path"
```

### Task 3: Full verification and evidence

**Files:**
- Modify: none unless verification exposes a scoped regression.

- [ ] **Step 1: Run the complete frontend gate**

Run `pnpm check` and require exit code 0 with zero TypeScript or ESLint errors.

- [ ] **Step 2: Run the production frontend build**

Run `pnpm build` and require exit code 0.

- [ ] **Step 3: Run the complete backend test suite**

Run `uv run pytest -q` from `apps/api` and record the pass count and any pre-existing failures separately.

- [ ] **Step 4: Run request-level authentication smoke checks**

Use the existing isolated test setup or a temporary database to verify this sequence: register a new account, logout, login with case-variant username, verify session identity, submit a bad credential and then a correct credential, and verify the account is not blocked by a stale client token when Turnstile is disabled in the test environment. Do not use or modify the two ignored workspace databases.

- [ ] **Step 5: Inspect the final diff and report boundaries**

Run `git diff HEAD~2..HEAD --check` and `git status --short`. Report changed files, test/build evidence, the fact that no local database was merged or overwritten, and that public deployment verification remains separate if no deployed URL is available.
