# EducationMind Project-local Genie Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch subagents because the user explicitly prohibited them.

**Goal:** Move all Genie-TTS runtime inputs into an isolated `runtime/genie-tts` directory inside EducationMind and make local startup and full-runtime packaging consume that directory.

**Architecture:** A guarded PowerShell importer copies the `uv.lock`-pinned installed Genie package plus the audited GenieData, Cyrene model and clean reference into a stable project-local layout. The API receives an explicit Genie root, prepends its `src` directory before importing `genie_tts`, and validates that the resolved module belongs to that root. Large payloads stay out of Git but remain available to full-runtime packaging.

**Tech Stack:** PowerShell 7, Python 3.12, FastAPI, Pydantic Settings, Genie-TTS 2.0.2, pytest, pnpm/Vitest.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Do not delete or mutate `F:\gpt sovites 轻量级\Genie-TTS`.
- Do not commit `.env`, databases, `.venv`, GenieData or model weights.
- Keep Genie in the Education API process; do not reintroduce a Sidecar port.
- Preserve the required GPT-SoVITS and Genie-TTS attribution.
- Do not create commits or push unrelated dirty-worktree state.

---

### Task 1: Define the project-local runtime contract

**Files:**
- Modify: `apps/api/tests/test_start_cyrene_web_script.py`
- Modify: `apps/api/tests/test_release_assets.py`
- Modify: `apps/api/tests/test_genie_sidecar.py`
- Create: `apps/api/tests/test_project_genie_runtime_installer.py`

**Interfaces:**
- Consumes: existing launch and release scripts.
- Produces: failing expectations for `runtime/genie-tts`, `EDUCATION_TTS_GENIE_ROOT`, guarded importing and importer path safety.

- [x] Write tests requiring project-local defaults, runtime source verification, release isolation and a safe importer.
- [x] Run the targeted pytest files and confirm failures are caused by missing project-local behavior.

### Task 2: Implement the runtime importer and isolated layout

**Files:**
- Create: `scripts/install-project-genie-runtime.ps1`
- Create: `runtime/genie-tts/README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: absolute upstream asset root, the pinned API-environment Genie package and clean reference WAV.
- Produces: `runtime/genie-tts` plus `RUNTIME_MANIFEST.json`.

- [x] Implement allowlisted staged copying and validation.
- [x] Run installer tests to green.
- [x] Import the local runtime from the audited F-drive source without deleting it.
- [x] Verify counts, sizes, manifest and Git ignore behavior.

### Task 3: Make Education API load the isolated engine

**Files:**
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/app/voice/genie_runtime.py`
- Modify: `apps/api/tests/test_genie_sidecar.py`
- Modify: `apps/api/tests/test_genie_embedded_api.py`

**Interfaces:**
- Consumes: `EDUCATION_TTS_GENIE_ROOT`.
- Produces: guarded project-local `genie_tts` import and validated runtime settings.

- [x] Add the explicit runtime-root setting and failing tests.
- [x] Validate absolute root and `src/genie_tts` existence.
- [x] Import from root-local `src` and reject a module resolved outside that root.
- [x] Run focused runtime/API tests to green.

### Task 4: Switch launch, environment and release flows

**Files:**
- Modify: `scripts/start-cyrene-web.ps1`
- Modify: `scripts/build-platform-release.ps1`
- Modify: `deploy/windows/install.ps1`
- Modify: `deploy/windows/start.ps1`
- Modify: `apps/api/.env` (ignored local runtime state only)
- Modify: tests from Task 1.

**Interfaces:**
- Consumes: `runtime/genie-tts` layout.
- Produces: project-local default startup and full-runtime packaging.

- [x] Change defaults from external F-drive paths to project-relative runtime paths.
- [x] Preserve explicit override parameters.
- [x] Change full-runtime packaging to source only from the project runtime.
- [x] Run launch/release tests to green.

### Task 5: Documentation and complete verification

**Files:**
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Modify: `deploy/platform-source/README.md`
- Modify: `deploy/windows/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Create: `docs/verification/2026-08-28-project-local-genie-runtime.md`

**Interfaces:**
- Consumes: completed runtime layout and test evidence.
- Produces: exact deployment guidance and evidence-backed handoff.

- [x] Run `pnpm dev:cyrene -ValidateOnly`.
- [x] Verify imported `genie_tts.__file__` is under `runtime/genie-tts/src`.
- [x] Start API and synthesize a real WAV without the external source path in configuration.
- [x] Run `pnpm check`, `pnpm exec vitest run`, full backend pytest and `pnpm build`.
- [x] Build and inspect the appropriate release artifacts without claiming unperformed online deployment.
- [x] Run `git diff --check` and record all evidence and limitations.
