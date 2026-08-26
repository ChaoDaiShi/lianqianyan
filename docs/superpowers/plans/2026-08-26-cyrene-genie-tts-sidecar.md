# Cyrene Genie-TTS Sidecar Implementation Plan

> **Execution:** Use the executing-plans workflow inline. Do not spawn subagents. Every feature or fix follows RED -> GREEN -> focused regression before commit.

**Goal:** Run the user-provided Genie-TTS 2.0.2 environment and converted Cyrene V2ProPlus ONNX model behind a loopback-only safe sidecar, route EducationMind voice synthesis through it, and show the active engine honestly in every speech surface.

**Architecture:** A project-owned FastAPI sidecar is executed by Genie-TTS's existing Python environment. It validates fixed local assets, loads one `cyrene` model, serializes synthesis, turns Genie's file output into a validated standard WAV, and exposes only `/health` and `/tts` on loopback. Education API selects `genie` or legacy `gpt_sovits` by server configuration. React continues to use the Education API and keeps the current browser fallback, adding the provider identity to visible attribution.

**Tech stack:** Python 3.11, FastAPI, Pydantic, httpx, Genie-TTS 2.0.2, ONNX Runtime 1.22.1, React 18, TypeScript, Axios, Vitest, pytest, PowerShell.

## Global constraints

- Use `pnpm` only for frontend commands.
- Do not modify, clean, stage, or commit anything in `F:\gpt sovites 轻量级\Genie-TTS`; its existing untracked `Output/` is user state.
- Do not copy `.venv`, `GenieData`, ONNX files, raw weights, full reference corpus, or generated WAV artifacts into Git.
- Do not rerun `.ckpt`/`.pth` conversion.
- Preserve `education.db`, `apps/api/education.db`, and `docs/创新赛道——开发日志参考模板.docx` byte-for-byte.
- Preserve the exact visible attribution: `GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn`.
- The sidecar must reject non-loopback hosts, run one worker, accept text only, and never return local paths in public errors.
- Keep `EDUCATION_TTS_PROVIDER` defaulting to `gpt_sovits` for compatibility with existing deployments.

---

### Task 1: Pin and test the Cyrene Genie asset contract

**Files:**

- Create: `apps/api/app/voice/cyrene_genie_manifest.py`
- Create: `apps/api/tests/test_cyrene_genie_manifest.py`

**Contract:**

- Nine required ONNX/bin filenames have exact byte sizes and SHA-256 values from the audited `Output/昔涟AI-GPT-SOVITS--V2proplus` directory.
- Reference WAV SHA-256 remains `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`.
- `validate_genie_assets(model_dir, reference_audio, genie_data_dir)` returns a sanitized immutable report or raises a configuration error whose string contains no absolute paths.

- [ ] Write tests for valid synthetic assets, missing file, wrong size, wrong hash, relative paths, wrong reference hash, and missing Chinese runtime resources. Use injected manifest/hash values or tiny fixture files so tests never copy the real 320 MiB model.
- [ ] Run `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_cyrene_genie_manifest.py -q` and confirm RED due to the missing module.
- [ ] Implement path normalization, chunked SHA-256 and immutable validation report. Public exception messages identify only the logical asset name.
- [ ] Run the focused test and confirm GREEN.
- [ ] Add a read-only real-asset validator command and verify all nine current files, GenieData and the installed reference WAV.
- [ ] Commit only the manifest module and its tests with `feat: validate cyrene genie assets`.

### Task 2: Build the restricted loopback sidecar by TDD

**Files:**

- Create: `apps/api/app/voice/genie_sidecar.py`
- Create: `apps/api/tests/test_genie_sidecar.py`

**Interfaces:**

- `GenieSidecarSettings.from_environment()` validates loopback host, port, absolute assets, reference text and byte limits without importing Genie-TTS.
- `GenieRuntime.start()` delays `GENIE_DATA_DIR` assignment and `import genie_tts` until after validation, loads fixed `cyrene`/`zh`, then fixes the reference audio.
- `GenieRuntime.synthesize_to_wav(text) -> bytes` creates a private temporary file, calls `genie.tts(..., play=False, split_sentence=True, save_path=...)`, validates WAV and always deletes the file.
- `create_genie_sidecar(settings, runtime_factory)` returns an app with only `GET /health` and `POST /tts` plus OpenAPI endpoints; TTS calls are serialized with one `asyncio.Lock`.

- [ ] Write failing configuration tests for non-loopback host, malformed port, blank transcript, non-absolute asset paths, and valid config.
- [ ] Write a fake Genie module and failing runtime tests asserting the exact `load_character`/`set_reference_audio` calls, delayed import, output validation, size limit and cleanup after success/failure.
- [ ] Write failing API tests for startup readiness, text length 1–600, no client path fields, true WAV response, serialized overlapping calls and sanitized 502/503 responses.
- [ ] Run `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_genie_sidecar.py -q` and confirm RED.
- [ ] Implement the smallest runtime and app satisfying the tests. Validate WAV using both RIFF/WAVE markers and the standard `wave` reader; require mono, 16-bit, 32 kHz and at least one frame.
- [ ] Rerun focused tests and manifest regression to GREEN.
- [ ] Inspect route registry and assert no model-management, reference-change, arbitrary save or cache-clear endpoints are present.
- [ ] Commit sidecar and tests with `feat: add restricted genie tts sidecar`.

### Task 3: Add Genie as an Education API voice provider

**Files:**

- Create: `apps/api/app/voice/genie.py`
- Create: `apps/api/app/voice/provider.py`
- Modify: `apps/api/app/voice/gpt_sovits.py`
- Modify: `apps/api/app/voice/models.py`
- Modify: `apps/api/app/voice/status.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/app/api/routes/voice.py`
- Modify: `apps/api/tests/test_voice_api.py`

**Contract:**

- `EDUCATION_TTS_PROVIDER` accepts `genie` and `gpt_sovits`; missing value means `gpt_sovits`.
- Genie configuration needs only a safe absolute HTTP(S) base URL; GPT-SoVITS keeps requiring URL, reference path and reference text.
- Genie request body is exactly `{ "text": value }`.
- Both providers reject a zero-byte or structurally invalid WAV, non-audio Content-Type, oversized response and unsafe upstream errors.
- Route returns the provider-specific `X-Voice-Provider` header.

- [ ] Extend status tests first for configured Genie, configured legacy GPT-SoVITS, incomplete/unknown provider and non-leakage; run focused status tests and confirm RED.
- [ ] Add failing Genie provider tests for exact body/URL, WAV success, false WAV, empty body, JSON, non-2xx, timeout and size cap.
- [ ] Add a failing route test proving the header follows the injected provider rather than being hard-coded.
- [ ] Implement provider selection, provider identity and shared WAV signature validation without changing the legacy payload.
- [ ] Run `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_voice_api.py -q` to GREEN.
- [ ] Run sidecar and existing CORS/health tests as focused regression.
- [ ] Commit with `feat: route cyrene speech through genie tts`.

### Task 4: Surface the active engine in React

**Files:**

- Modify: `src/lib/voiceApi.ts`
- Modify: `src/lib/voiceApi.test.ts`
- Modify: `src/components/digital-human/useSpeechSynthesis.ts`
- Modify: `src/components/digital-human/VoiceAttributionNotice.tsx`
- Modify: `src/components/digital-human/VoiceAttributionNotice.test.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/pages/XiaolianSpeech.test.tsx`
- Modify: `src/components/learning/SpaceTutor.tsx`
- Modify: `src/components/learning/SpaceTutorSpeech.test.tsx`
- Modify: `src/components/exam/ExamRunner.tsx`
- Modify: `src/components/exam/ExamRunner.test.tsx`
- Modify: `src/pages/PlaceholderPages.tsx`
- Modify: `src/pages/PlaceholderPages.test.tsx`

**Contract:**

- `VoiceProvider = 'genie_tts' | 'gpt_sovits' | 'browser_speech' | 'unavailable'` is present in the speech controller.
- A configured status sets the remote provider; successful remote playback retains it; browser fallback changes it to `browser_speech`; stop does not falsely rename an otherwise configured engine.
- `VoiceAttributionNotice` labels Genie, GPT-SoVITS, browser fallback and unavailable distinctly.
- Genie mode adds its MIT runtime notice while always keeping the exact required GPT-SOVITS attribution.

- [ ] Extend API mapping and attribution component tests first and confirm RED.
- [ ] Add hook/playback-level assertions for Genie status, legacy status and remote-failure fallback.
- [ ] Implement typed provider propagation through the three existing speech surfaces.
- [ ] Update privacy copy to “Genie-TTS 或 GPT-SoVITS” without weakening the existing microphone statement.
- [ ] Run `pnpm test --run src/lib/voiceApi.test.ts src/components/digital-human/VoiceAttributionNotice.test.tsx src/pages/XiaolianSpeech.test.tsx src/components/learning/SpaceTutorSpeech.test.tsx src/components/exam/ExamRunner.test.tsx src/pages/PlaceholderPages.test.tsx` to GREEN.
- [ ] Run all digital-human tests and `pnpm check`.
- [ ] Commit with `feat: show active cyrene voice engine`.

### Task 5: Provide a safe launcher and deployment documentation

**Files:**

- Create: `apps/api/scripts/start_genie_voice.ps1`
- Create: `apps/api/tests/test_start_genie_voice_script.py`
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Launcher behavior:**

- Accept parameters for Genie root, model directory, reference WAV, sidecar host/port and Education API port.
- Defaults match the currently audited Windows paths, but every path can be overridden.
- Resolve and validate all targets before process launch; refuse non-loopback hosts and any worker count other than 1.
- Start the sidecar using `Genie-TTS\.venv\Scripts\python.exe` without administrator privileges.
- Offer a mode that prints the exact Education API environment variables (`EDUCATION_TTS_PROVIDER=genie`, base URL and limits) without leaking unrelated environment values.
- Never write into the Genie-TTS repository.

- [ ] Write a static/parameter validation test for the PowerShell script and confirm RED because it is missing.
- [ ] Implement the launcher with literal paths and PowerShell native process invocation; avoid shell-built command strings.
- [ ] Run the launcher test and a `-ValidateOnly` real-path check.
- [ ] Update both READMEs with actual start order, portability parameters, health/status endpoints, failure fallback, one-worker rule, no-admin rule, asset boundaries and troubleshooting.
- [ ] Add `Genie-TTS 2.0.2`, source link, `Copyright (c) 2025 High_Logic` and MIT license text to `THIRD_PARTY_NOTICES.md`, while retaining the exact GPT-SOVITS attribution.
- [ ] Scan documentation for stale statements claiming no inference runtime exists.
- [ ] Commit with `docs: add genie tts local deployment`.

### Task 6: Run a real model/API/browser acceptance chain

**Files:**

- Create: `docs/verification/2026-08-26-cyrene-genie-tts-sidecar.md`

- [ ] Record pre-verification hashes, lengths and UTC modification times for both runtime SQLite files and the user DOCX.
- [ ] Record external Genie-TTS HEAD/status and all real model/reference validation hashes.
- [ ] Start the sidecar with the external `.venv` on `127.0.0.1:9881`; capture startup time, ready health and listening address.
- [ ] Generate a short Chinese educational sentence directly through sidecar `/tts`; validate RIFF/WAVE, 32 kHz mono 16-bit, nonzero frames, duration, byte size, SHA-256 and elapsed time.
- [ ] Repeat once after warmup and record the measured elapsed time separately.
- [ ] Start an isolated Education API on a non-default port with a fresh temp SQLite and `EDUCATION_TTS_PROVIDER=genie`; verify public status, provider header and exact audio relay.
- [ ] Start Vite and verify `/#/agent` in desktop and 390px viewport. Exercise real Genie playback, stop/replay and a controlled sidecar-unavailable fallback; inspect console, network and horizontal overflow.
- [ ] Stop all verification processes and confirm no test SQLite or temporary WAV is left in the repository.
- [ ] Run fresh complete gates:

```powershell
pnpm test --run
pnpm check
pnpm build
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q
```

- [ ] Recompute protected hashes/timestamps and prove they are unchanged.
- [ ] Prove the external Genie-TTS repo still has no tracked modification and only its original `?? Output/` state.
- [ ] Write evidence with exact counts, commands, measured inference values, limitations and browser observations; do not substitute build success for browser or model evidence.
- [ ] Commit only the verification document with `docs: verify cyrene genie tts integration`.

### Task 7: Final repository audit

- [ ] Run `git diff --check HEAD~6..HEAD`, inspect every changed file and scan for unfinished markers, placeholder claims, absolute secrets and accidental model/audio binaries.
- [ ] Run `git status --short --branch` and verify the only unrelated item is the pre-existing user DOCX.
- [ ] Confirm no ignored database or `.local/voice` file was staged.
- [ ] Use the verification-before-completion checklist before making any completion claim.
- [ ] Use the finishing-a-development-branch checklist, but leave this branch unmerged and unpushed unless the user later requests integration.
