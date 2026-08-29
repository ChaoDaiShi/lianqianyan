# Learning Space Layout Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Rework the EducationMind entry and application shell into a sparse, useful learning space inspired by the reference site's brand-first layout, while preserving real API and account semantics.

**Architecture:** Keep AuthScreen, AuthCompanionScene, AppShell, TopCompanionBar, and LearningRail as focused React components. Add one shared background asset and CSS tokens/classes so the same visual language works for authentication, desktop application pages, dark mode, and mobile navigation. Existing pages and hooks remain consumers of the current shell and data services.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, CSS custom properties, Vitest, pnpm.

## Global Constraints

- Use pnpm only; required gate is pnpm check.
- Only modify src/pages/**, src/components/**, src/lib/**, src/router/**, template-local config, docs, and required public assets.
- Preserve real API semantics; do not fabricate profiles, progress, diagnoses, plans, knowledge relations, XP, streaks, or results.
- Keep /api/plans/current 404 as a truthful no-current-plan state.
- Keep login/register field constraints, Turnstile behavior, inline errors, keyboard focus, and reduced-motion support.
- Do not reset, clean, or overwrite existing dirty-worktree changes.
- Do not copy reference-site code, assets, or brand copy.

---

### Task 1: Add the supplied visual background as a shared project asset

**Files:**
- Create: public/brand/learning-space-background.png
- Modify: src/brandAsset.test.ts
- Source: C:\Users\25113\AppData\Local\Temp\codex-clipboard-88b4bac6-7dbb-4c5d-913b-889a33f8fb10.png

**Interfaces:** Produces a stable /brand/learning-space-background.png URL for authentication and application background layers.

- [ ] Step 1: Write the failing asset test.

Add an assertion to the existing brand asset test:

    it('ships the supplied learning-space background asset', () => {
      const asset = resolve(process.cwd(), 'public/brand/learning-space-background.png');
      expect(existsSync(asset)).toBe(true);
      expect(statSync(asset).size).toBeGreaterThan(1000);
    });

- [ ] Step 2: Run the focused test and verify the expected failure.

Run: pnpm exec vitest run src/brandAsset.test.ts

Expected: FAIL because the asset does not exist yet.

- [ ] Step 3: Copy the attached image into public/brand/learning-space-background.png without altering the source.

- [ ] Step 4: Run the focused test and verify it passes.

Run: pnpm exec vitest run src/brandAsset.test.ts

Expected: PASS with all brand assertions passing.

- [ ] Step 5: Commit.

    git add -- src/brandAsset.test.ts public/brand/learning-space-background.png
    git commit -m "feat: add learning space background asset"

### Task 2: Redesign the unauthenticated entry around the supplied image

**Files:**
- Modify: src/auth/AuthScreen.tsx
- Modify: src/auth/AuthCompanionScene.tsx
- Modify: src/auth/AuthScreen.test.tsx

**Interfaces:** Preserve the existing onLogin, onRegister, busy, and error props. Produce a responsive data-auth-entry="companion" page with the supplied background URL, real fields, account switch, Turnstile, and inline status states.

- [ ] Step 1: Write the failing presentation tests.

Extend src/auth/AuthScreen.test.tsx:

    it('uses the supplied background and a focused form card', () => {
      const html = renderScreen();
      expect(html).toContain('data-auth-background="learning-space"');
      expect(html).toContain('/brand/learning-space-background.png');
      expect(html).toContain('data-auth-card="true"');
      expect(html).toContain('data-auth-brand="true"');
      expect(html).toContain('进入我的学习空间');
    });

    it('keeps truthful login and registration states in the focused entry', () => {
      expect(renderScreen({ busy: true })).toContain('正在登录…');
      expect(renderScreen({ error: '用户名或密码不正确。' })).toContain('role="alert"');
      expect(renderScreen()).toContain('创建账号');
    });

- [ ] Step 2: Run the focused auth tests and verify the expected failure.

Run: pnpm exec vitest run src/auth/AuthScreen.test.tsx

Expected: FAIL because the current entry does not expose the new background, card, brand markers, or primary copy.

- [ ] Step 3: Implement the minimal entry redesign.

Make AuthCompanionScene a full-bleed background layer using /brand/learning-space-background.png, a readable soft gradient overlay, and project brand/title copy. Make AuthScreen a responsive layout with a compact brand cue and an opaque form card. Keep name, minLength, maxLength, autoComplete, TurnstileWidget, role="alert", and callback invocation unchanged.

- [ ] Step 4: Run the focused auth tests.

Run: pnpm exec vitest run src/auth/AuthScreen.test.tsx

Expected: PASS with no console errors.

- [ ] Step 5: Commit.

    git add -- src/auth/AuthScreen.tsx src/auth/AuthCompanionScene.tsx src/auth/AuthScreen.test.tsx
    git commit -m "feat: refresh learning space auth entry"

### Task 3: Make the authenticated shell sparse and responsive

**Files:**
- Modify: src/components/layout/AppShell.tsx
- Modify: src/components/layout/TopCompanionBar.tsx
- Modify: src/components/layout/LearningRail.tsx
- Modify: src/components/design/NebulaBackground.tsx
- Modify: src/design/theme.css
- Modify: src/components/layout/LearningRail.test.tsx
- Create: src/components/design/NebulaBackground.test.tsx

**Interfaces:** Preserve AppShell({ children, companion?, scene? }), LearningRail({ currentPath? }), route links, auth logout, and companion navigation. Produce the shared background layer, compact header, quiet desktop rail, and safe-area-aware mobile rail.

- [ ] Step 1: Write the failing shell tests.

Add to LearningRail.test.tsx:

    it('marks the learning rail as the responsive primary navigation', () => {
      const html = renderToStaticMarkup(<LearningRail currentPath="/" />);
      expect(html).toContain('data-learning-rail="primary"');
      expect(html).toContain('学习星轨');
      expect(html).toContain('首页');
      expect(html).toContain('设置');
    });

Create NebulaBackground.test.tsx:

    import { renderToStaticMarkup } from 'react-dom/server';
    import { describe, expect, it } from 'vitest';
    import { NebulaBackground } from './NebulaBackground';

    describe('NebulaBackground', () => {
      it('uses the shared learning-space background layer', () => {
        const html = renderToStaticMarkup(<NebulaBackground scene="companion" />);
        expect(html).toContain('data-background="learning-space"');
        expect(html).toContain('/brand/learning-space-background.png');
      });
    });

- [ ] Step 2: Run the focused shell tests and verify the expected failure.

Run: pnpm exec vitest run src/components/layout/LearningRail.test.tsx src/components/design/NebulaBackground.test.tsx

Expected: FAIL because the semantic markers and shared asset URL are not present.

- [ ] Step 3: Implement the shell layout.

Update NebulaBackground to render the supplied image with low opacity, a scene-aware wash, and no pointer interaction. Update AppShell spacing to reserve the compact header and responsive rail. Update TopCompanionBar to use a simpler brand lockup and compact actions. Update LearningRail to expose data-learning-rail="primary", preserve every existing route target, use one active surface state, and retain horizontal overflow only on mobile. Add CSS variables/classes for background wash, readable surfaces, and dark-mode contrast.

- [ ] Step 4: Run focused shell tests.

Run: pnpm exec vitest run src/components/layout/LearningRail.test.tsx src/components/design/NebulaBackground.test.tsx

Expected: PASS.

- [ ] Step 5: Commit.

    git add -- src/components/layout/AppShell.tsx src/components/layout/TopCompanionBar.tsx src/components/layout/LearningRail.tsx src/components/design/NebulaBackground.tsx src/design/theme.css src/components/layout/LearningRail.test.tsx src/components/design/NebulaBackground.test.tsx
    git commit -m "feat: simplify learning space application shell"

### Task 4: Rebalance the home page around one useful next action

**Files:**
- Modify: src/components/home/HeroBanner.tsx
- Modify: src/components/home/TodaysJourney.tsx
- Modify: src/pages/Home.tsx
- Modify: src/components/home/HomeCompanionEntry.test.tsx
- Modify: src/components/home/TodaysJourney.test.tsx

**Interfaces:** Consume the same profile, diagnosis, plan, evidence, loading, error, and task props. Produce a hierarchy with one primary next-step action and truthful secondary summaries; add no API calls or fake fallback values.

- [ ] Step 1: Write failing home hierarchy tests.

Add assertions using existing test helpers:

    it('prioritizes one next learning action', () => {
      const html = renderToStaticMarkup(<HeroBanner {...propsForCurrentTask} />);
      expect(html).toContain('data-home-primary-action="true"');
      expect(html).toContain('继续今天的学习');
    });

    it('does not turn missing plan data into a fabricated metric', () => {
      const html = renderToStaticMarkup(<TodaysJourney {...propsForNoPlan} />);
      expect(html).toContain('尚未安排');
      expect(html).toContain('--');
      expect(html).not.toContain('100%');
    });

Adapt fixture names to the existing test file's prop builders while keeping the same behaviors.

- [ ] Step 2: Run focused home tests and verify the expected failure.

Run: pnpm exec vitest run src/components/home/HomeCompanionEntry.test.tsx src/components/home/TodaysJourney.test.tsx

Expected: FAIL because the current hierarchy/copy markers are not yet present.

- [ ] Step 3: Implement the focused home hierarchy.

Keep existing onGeneratePlan, onPrepareTask, and onRetry callbacks and data conditions. Give the current task or plan-generation action one primary button, move companion and module links into a quieter secondary region, and preserve explicit loading/error/no-plan/unassessed states. Adjust Home.tsx only as needed to pass the same props.

- [ ] Step 4: Run focused home tests.

Run: pnpm exec vitest run src/components/home/HomeCompanionEntry.test.tsx src/components/home/TodaysJourney.test.tsx

Expected: PASS with no invented values.

- [ ] Step 5: Commit.

    git add -- src/components/home/HeroBanner.tsx src/components/home/TodaysJourney.tsx src/pages/Home.tsx src/components/home/HomeCompanionEntry.test.tsx src/components/home/TodaysJourney.test.tsx
    git commit -m "feat: focus home page on next learning action"

### Task 5: Run full verification and inspect the real local flow

**Files:** Modify only files required to correct failures found by verification; do not broaden scope.

- [ ] Step 1: Run the required engineering checks.

    pnpm check
    pnpm exec vitest run
    pnpm build
    git diff --check

Expected: each command exits 0; tests report 0 failed tests; build writes dist; diff check reports no whitespace errors.

- [ ] Step 2: Start the local app and inspect the actual unauthenticated flow.

Run: pnpm dev --host 127.0.0.1

Check the local Vite URL for the background behind the auth card, login/register toggle, busy and inline error states, no horizontal overflow at desktop/mobile widths, and reduced-motion behavior.

- [ ] Step 3: Exercise the real account boundary without fabricating data.

Use existing API configuration and an approved test account if available. Verify login, registration, course selection, and home transitions. If the API or test account is unavailable, record that layer as unperformed rather than creating fake frontend success data.

- [ ] Step 4: Recheck the worktree boundary.

    git status --short --branch
    git diff --stat main...HEAD
    git log --oneline --decorate -12

Confirm intended commits are present and existing user changes were not discarded.

### Task 6: Merge the completed branch into main and push

**Files:** Git refs only.

- [ ] Step 1: Verify target branch and remote state.

    git fetch origin
    git status --short --branch
    git rev-parse --verify main
    git rev-parse --verify origin/main

Do not merge with uncommitted changes.

- [ ] Step 2: Commit final scoped changes and verify HEAD.

    git add -- src public docs/superpowers
    git commit -m "feat: refresh learning space layout"
    git show --stat --oneline HEAD

Expected: final implementation commit contains only the intentionally added layout work, asset, tests, and design/plan documents.

- [ ] Step 3: Merge into main without destructive resets.

    git switch main
    git merge --no-ff phase-3-1-competition-sprint -m "merge: refresh learning space layout"

Resolve only documented conflicts from the target branch, preserving both histories and the validated layout work.

- [ ] Step 4: Run post-merge smoke checks.

    pnpm check
    pnpm build
    git diff --check
    git status --short --branch

Expected: all commands exit 0 and main has no uncommitted changes.

- [ ] Step 5: Push merged main.

    git push origin main

Expected: origin/main advances to the merge commit. Report the exact pushed commit and any external/API checks that could not be performed.

