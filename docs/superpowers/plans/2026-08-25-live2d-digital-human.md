# Live2D Digital Human Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old SVG Xiaolian artwork with a locally served Cyrene Live2D model and add explicit browser speech playback with mouth-state synchronization.

**Architecture:** A Vite development middleware serves an ignored `.local/live2d` directory, while a React wrapper loads Cubism Core before the Pixi Cubism 4 runtime and owns every canvas resource. A browser-only speech hook exposes a small state machine that Xiaolian chat surfaces use to drive both playback controls and `ParamMouthOpenY`.

**Tech Stack:** React 18, TypeScript, Vite 5, PixiJS 6.5.10, pixi-live2d-display 0.4.0, Web Speech API, Vitest, PowerShell.

## Global Constraints

- Use `pnpm` only for JavaScript dependencies and scripts.
- Never commit `.local/live2d`, the supplied model ZIP contents, or `live2dcubismcore.min.js`.
- The model URL is `/local-live2d/Cyrene1002/Cyrene.model3.json`; Cubism Core is `/local-live2d/core/live2dcubismcore.min.js`.
- Cubism Core must load before `pixi-live2d-display/cubism4` is imported.
- Missing assets hide the character canvas; never restore the old SVG fallback.
- Speech starts only from an explicit user action and always leaves the full text visible.
- Preserve the existing `XiaolianCharacter` state and size API for callers.

## File map

- Create `src/config/localLive2d.ts`: URL validation shared by Vite and tests.
- Modify `vite.config.ts`: development-only local asset middleware.
- Create `scripts/install-local-live2d.ps1`: safe, allowlisted local installer.
- Modify `.gitignore`: ignore `.local/` explicitly.
- Modify `package.json`: exact Pixi dependencies through `pnpm add`.
- Create `src/components/live2d/live2dRuntime.ts`: core-script and runtime load coordination.
- Create `src/components/live2d/Live2DCharacter.tsx`: Pixi lifecycle, resize, focus, mouth animation.
- Modify `src/components/xiaolian/XiaolianCharacter.tsx`: stable facade over Live2D.
- Create `src/components/digital-human/speech.ts`: pure text/voice helpers.
- Create `src/components/digital-human/useSpeechSynthesis.ts`: browser speech state machine.
- Create `src/components/digital-human/SpeechControls.tsx`: accessible play/stop control.
- Modify `src/components/learning/SpaceTutor.tsx` and `src/pages/XiaolianPage.tsx`: digital-human playback.

---

### Task 1: Local-only asset boundary and installer

**Files:**
- Create: `src/config/localLive2d.ts`
- Test: `src/config/localLive2d.test.ts`
- Modify: `vite.config.ts`
- Create: `scripts/install-local-live2d.ps1`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `LOCAL_LIVE2D_PREFIX: "/local-live2d/"` and `relativeLocalLive2dPath(rawUrl: string): string | null`.
- Produces: HTTP development mapping from `/local-live2d/*` to `<repo>/.local/live2d/*`.

- [ ] **Step 1: Write failing path-boundary tests**

```ts
import { describe, expect, it } from 'vitest';
import { relativeLocalLive2dPath } from './localLive2d';

describe('relativeLocalLive2dPath', () => {
  it('accepts model assets and strips a query string', () => {
    expect(relativeLocalLive2dPath('/local-live2d/Cyrene1002/Cyrene.model3.json?v=1'))
      .toBe('Cyrene1002/Cyrene.model3.json');
  });

  it.each([
    '/api/health',
    '/local-live2d/../secret.txt',
    '/local-live2d/%2e%2e/secret.txt',
    '/local-live2d/Cyrene1002/../../secret.txt',
    '/local-live2d/',
  ])('rejects unsafe or unrelated URL %s', (url) => {
    expect(relativeLocalLive2dPath(url)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `pnpm test -- --run src/config/localLive2d.test.ts`

Expected: FAIL because `src/config/localLive2d.ts` does not exist.

- [ ] **Step 3: Implement the pure URL boundary**

```ts
export const LOCAL_LIVE2D_PREFIX = '/local-live2d/';

export function relativeLocalLive2dPath(rawUrl: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(rawUrl.split('?', 1)[0]).replace(/\\/g, '/');
  } catch {
    return null;
  }
  if (!pathname.startsWith(LOCAL_LIVE2D_PREFIX)) return null;
  const parts = pathname.slice(LOCAL_LIVE2D_PREFIX.length).split('/');
  if (!parts.length || parts.some((part) => !part || part === '.' || part === '..')) return null;
  return parts.join('/');
}
```

- [ ] **Step 4: Add the Vite middleware**

In `vite.config.ts`, import `createReadStream`, `existsSync`, and `statSync` from `node:fs`, import `relativeLocalLive2dPath`, and add a `localLive2dPlugin()` with `configureServer`. Resolve from `path.resolve(__dirname, '.local/live2d')`, require the absolute result to start with `${root}${path.sep}`, return 404 for missing files, set MIME for `.json`, `.png`, `.moc3`, and `.js`, set `Cache-Control: no-store`, and stream the file. Add this plugin to `plugins` unconditionally; it has no build hook and therefore cannot copy assets into `dist`.

Core guard:

```ts
const relative = relativeLocalLive2dPath(request.url ?? '');
if (relative === null) return next();
const absolute = path.resolve(root, relative);
if (!absolute.startsWith(`${root}${path.sep}`)) {
  response.statusCode = 400;
  return response.end('invalid local asset path');
}
if (!existsSync(absolute) || !statSync(absolute).isFile()) {
  response.statusCode = 404;
  return response.end('local Live2D asset not found');
}
```

- [ ] **Step 5: Add a safe PowerShell installer and ignore rule**

Add `.local/` under the runtime ignore section. The script takes mandatory `-ZipPath` and `-CubismCorePath`, resolves both paths, verifies ZIP size is at most 30 MB, enumerates with `System.IO.Compression.ZipArchive`, rejects rooted or `..` paths, accepts only `.json`, `.moc3`, and `.png` entries under `Cyrene1002/`, and writes to a newly created `.local/live2d/Cyrene1002` directory. It then copies Cubism Core to `.local/live2d/core/live2dcubismcore.min.js`, parses `Cyrene.model3.json`, verifies every referenced file, and emits SHA-256 values.

Use these exact safety checks before extraction:

```powershell
$allowedExtensions = @('.json', '.moc3', '.png')
$relative = $entry.FullName.Replace('\\', '/')
$segments = $relative.Split('/', [System.StringSplitOptions]::RemoveEmptyEntries)
if ($segments.Count -lt 2 -or $segments[0] -ne 'Cyrene1002' -or $segments -contains '..') {
    throw "Unsafe or unexpected ZIP entry: $relative"
}
if ([IO.Path]::GetExtension($relative).ToLowerInvariant() -notin $allowedExtensions) {
    continue
}
$destination = [IO.Path]::GetFullPath((Join-Path $localRoot ($segments -join [IO.Path]::DirectorySeparatorChar)))
if (-not $destination.StartsWith($modelRootWithSeparator, [StringComparison]::OrdinalIgnoreCase)) {
    throw "ZIP entry escapes local model directory: $relative"
}
```

- [ ] **Step 6: Verify the boundary and install the supplied local model**

Run:

```powershell
pnpm test -- --run src/config/localLive2d.test.ts
& .\scripts\install-local-live2d.ps1 `
  -ZipPath 'E:\Eage Downloads\Cyrene1002_by_MomokaSono_aec2fc8eb7a411c7a8e3b8fb709eebc0.zip' `
  -CubismCorePath 'F:\比赛\软件杯\many_agent_learn\frontend\public\live2d\core\live2dcubismcore.min.js'
git status --short --ignored
```

Expected: tests PASS; seven required model runtime files plus Core exist under `.local`; Git shows `.local/` only as ignored and does not stage the user DOCX.

- [ ] **Step 7: Commit only reusable boundary code**

```powershell
git add -- .gitignore vite.config.ts src/config/localLive2d.ts src/config/localLive2d.test.ts scripts/install-local-live2d.ps1
git commit -m "feat: add local-only Live2D asset boundary"
```

### Task 2: Live2D runtime and Xiaolian replacement

**Files:**
- Modify: `package.json`
- Create: `src/components/live2d/live2dRuntime.ts`
- Test: `src/components/live2d/live2dRuntime.test.ts`
- Create: `src/components/live2d/Live2DCharacter.tsx`
- Modify: `src/components/xiaolian/XiaolianCharacter.tsx`
- Test: `src/components/xiaolian/XiaolianCharacter.test.tsx`
- Modify: `src/config/buildChunks.ts`
- Modify: `src/config/buildChunks.test.ts`

**Interfaces:**
- Produces: `loadLive2dRuntime(): Promise<typeof import('pixi-live2d-display/cubism4')>`.
- Produces: `Live2DCharacterProps { stateLabel: string; size: 'sm'|'md'|'lg'|'hero'; speaking?: boolean; priority?: boolean; className?: string }`.
- Extends: `XiaolianCharacterProps` with optional `speaking?: boolean`.

- [ ] **Step 1: Add exact dependencies with pnpm**

Run: `pnpm add pixi.js@6.5.10 pixi-live2d-display@0.4.0`

Expected: `package.json` contains exact compatible versions; no npm/yarn lock is created.

- [ ] **Step 2: Write failing runtime and facade tests**

The runtime test asserts `live2dModelUrl()` returns the fixed local URL and `fitLive2dModel(360, 460, 3600, 5200)` returns a positive contain scale with centered X and bottom-aligned Y. The facade SSR test renders `XiaolianCharacter` and asserts `data-live2d-character="true"` is present while `.svg` and the old manifest paths are absent.

```ts
expect(live2dModelUrl()).toBe('/local-live2d/Cyrene1002/Cyrene.model3.json');
expect(fitLive2dModel(360, 460, 3600, 5200)).toMatchObject({ x: 180, y: 460 });
```

Run: `pnpm test -- --run src/components/live2d/live2dRuntime.test.ts src/components/xiaolian/XiaolianCharacter.test.tsx`

Expected: FAIL because the runtime and facade do not exist yet.

- [ ] **Step 3: Implement runtime coordination**

Use one module-scoped promise for the Core script and one for the Cubism 4 module. `loadScript` reuses an existing `script[data-cubism-core]`, resolves on `load`, rejects on `error`, and checks `window.Live2DCubismCore` before adding a tag.

```ts
export const LIVE2D_MODEL_URL = '/local-live2d/Cyrene1002/Cyrene.model3.json';
export const CUBISM_CORE_URL = '/local-live2d/core/live2dcubismcore.min.js';

export async function loadLive2dRuntime() {
  await loadCubismCore();
  runtimePromise ??= import('pixi-live2d-display/cubism4');
  return runtimePromise;
}
```

`fitLive2dModel` uses `Math.min(containerWidth * 0.92 / modelWidth, containerHeight * 0.98 / modelHeight)`, returns `{ scale, x: containerWidth / 2, y: containerHeight }`, and returns `null` for non-positive dimensions.

- [ ] **Step 4: Implement the React/Pixi lifecycle**

In an effect, create a transparent Pixi `Application` with `autoStart`, `antialias`, and capped resolution, append its canvas, await `loadLive2dRuntime`, then `Live2DModel.from(LIVE2D_MODEL_URL)`. Set anchor `(0.5, 1)`, add to stage, apply `fitLive2dModel`, observe container resize, and call `model.focus()` on pointer movement. A second effect or stable animation loop updates `ParamMouthOpenY` only while `speaking`; reduced-motion mode uses a slower fixed pulse. Cleanup cancels frames, disconnects the observer, removes listeners, destroys the model, and calls `app.destroy(true, { children: true, texture: false, baseTexture: false })`.

Required failure state:

```tsx
if (availability === 'unavailable') return null;
return <div data-live2d-character="true" aria-label={stateLabel} className={...} ref={containerRef} />;
```

- [ ] **Step 5: Replace the old SVG facade and chunk the heavy runtime**

Keep existing state resolution and size labels, delete the image manifest/import logic, forward `speaking`, and render `Live2DCharacter`. Add `/node_modules/pixi.js/` and `/node_modules/pixi-live2d-display/` mappings to a `vendor-live2d` manual chunk before the generic React mapping. Update the chunk test accordingly.

- [ ] **Step 6: Run focused and project gates**

Run:

```powershell
pnpm test -- --run src/components/live2d/live2dRuntime.test.ts src/components/xiaolian/XiaolianCharacter.test.tsx src/config/buildChunks.test.ts
pnpm check
pnpm build
```

Expected: all focused tests PASS, check PASS, build PASS. `Get-ChildItem dist -Recurse | Select-String 'Cyrene.model3|Cyrene.moc3|live2dcubismcore'` returns no asset match.

- [ ] **Step 7: Commit**

```powershell
git add -- package.json src/components/live2d src/components/xiaolian/XiaolianCharacter.tsx src/components/xiaolian/XiaolianCharacter.test.tsx src/config/buildChunks.ts src/config/buildChunks.test.ts
git commit -m "feat: replace Xiaolian artwork with local Live2D"
```

### Task 3: Browser speech state machine and controls

**Files:**
- Create: `src/components/digital-human/speech.ts`
- Test: `src/components/digital-human/speech.test.ts`
- Create: `src/components/digital-human/useSpeechSynthesis.ts`
- Create: `src/components/digital-human/SpeechControls.tsx`

**Interfaces:**
- Produces: `cleanSpeechText(text: string, maxLength?: number): string`.
- Produces: `pickChineseVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null`.
- Produces: `useSpeechSynthesis(): { supported: boolean; speaking: boolean; speak(text: string): void; stop(): void }`.
- Produces: `SpeechControls` props matching that controller plus `text`.

- [ ] **Step 1: Write failing pure helper tests**

```ts
expect(cleanSpeechText('## 标题\n**互斥** `mutex` [来源](https://x.test)')).toBe('标题 互斥 mutex 来源');
expect(cleanSpeechText('甲'.repeat(900))).toHaveLength(600);
expect(pickChineseVoice([enVoice, zhVoice])).toBe(zhVoice);
```

Run: `pnpm test -- --run src/components/digital-human/speech.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement pure helpers**

Remove Markdown headings, emphasis markers, inline code delimiters, link URLs, repeated whitespace, and control characters; default `maxLength` is 600. Voice selection preference is exact `zh-CN`, then any `zh-*`, then `null` so the browser can use its default.

- [ ] **Step 3: Implement the hook**

The hook must guard `typeof window === 'undefined'`, create a fresh `SpeechSynthesisUtterance`, set selected voice and `lang='zh-CN'`, cancel any current utterance before `speak`, set `speaking=true`, and reset it in `onend` and `onerror`. `stop` cancels and resets. Cleanup calls `cancel` only when this hook owns an active utterance.

- [ ] **Step 4: Implement accessible controls**

Render nothing when unsupported. Otherwise render one outline button whose label and `aria-label` switch between “数字人讲解” and “停止讲解”, using `Volume2` and `Square` icons. Disable the button when cleaned text is empty.

- [ ] **Step 5: Run focused tests and type check**

Run:

```powershell
pnpm test -- --run src/components/digital-human/speech.test.ts
pnpm type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- src/components/digital-human
git commit -m "feat: add digital human speech controls"
```

### Task 4: Connect speech to Tutor surfaces

**Files:**
- Modify: `src/components/learning/SpaceTutor.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Test: `src/components/learning/SpaceTutorSpeech.test.tsx`
- Test: `src/pages/XiaolianSpeech.test.tsx`

**Interfaces:**
- Consumes: `useSpeechSynthesis`, `SpeechControls`, and `XiaolianCharacter speaking`.
- Produces: explicit playback controls for every assistant answer on both Tutor surfaces.

- [ ] **Step 1: Write failing presentation tests**

Mock `useSpeechSynthesis` with `supported=true`, SSR-render each surface with an assistant answer fixture, and assert the rendered HTML contains “数字人讲解”; assert the Xiaolian facade receives `speaking=true` when the mock controller reports speaking.

Run: `pnpm test -- --run src/components/learning/SpaceTutorSpeech.test.tsx src/pages/XiaolianSpeech.test.tsx`

Expected: FAIL because the controls are not connected.

- [ ] **Step 2: Integrate SpaceTutor**

Create one speech controller per mounted `SpaceTutor`, forward `speech.speaking` to the header `XiaolianCharacter`, render `SpeechControls` under assistant text/`TutorExplanationCard`, and call `speech.stop()` whenever `knowledgePointId` changes.

- [ ] **Step 3: Integrate XiaolianPage**

Create one speech controller per page, enlarge the header character from `sm` to `md`, forward speaking state, and render `SpeechControls` for assistant messages. Stop current playback before sending a new question and on page cleanup.

- [ ] **Step 4: Run regression gates**

Run:

```powershell
pnpm test -- --run
pnpm check
pnpm build
```

Expected: all frontend tests, type-check, lint, and build PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/learning/SpaceTutor.tsx src/components/learning/SpaceTutorSpeech.test.tsx src/pages/XiaolianPage.tsx src/pages/XiaolianSpeech.test.tsx
git commit -m "feat: connect Live2D speech to Tutor answers"
```

