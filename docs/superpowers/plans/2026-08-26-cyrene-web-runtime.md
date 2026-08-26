# Cyrene Voice Web Runtime Implementation Plan

> **Execution:** Implement inline in the current session. Do not spawn subagents. Every behavior change follows RED -> GREEN -> focused regression.

**Goal:** Add a single `pnpm dev:cyrene` command that starts the real Cyrene Genie-TTS sidecar, Education API, and Vite in a verified order so speech can be triggered and played from the website.

**Architecture:** A root PowerShell orchestrator owns only the child processes it creates. It validates local dependencies and free ports, waits on health conditions instead of sleeping, injects the existing Genie provider configuration into the API child, persists anonymous runtime data under ignored `.local/runtime`, and runs Vite in the foreground.

**Tech Stack:** pnpm, PowerShell 7/Windows PowerShell, Python 3.11, FastAPI/Uvicorn, Genie-TTS 2.0.2, React 18, Vite 5, pytest, Vitest.

## Global constraints

- Use `pnpm` only for frontend commands.
- Do not change the existing voice API schema, model hashes, reference transcript, exact attribution, or browser fallback semantics.
- Do not modify, stage, or commit either tracked/ignored SQLite database, the user-owned DOCX, or the external Genie-TTS repository.
- Refuse occupied ports without stopping unknown processes.
- Start child processes with hidden windows and clean up only recorded child PIDs.
- Do not spawn subagents.

---

### Task 1: Specify the one-command runtime contract

**Files:**

- Create: `apps/api/tests/test_start_cyrene_web_script.py`
- Modify: `package.json`
- Create: `scripts/start-cyrene-web.ps1`

**Interfaces:**

- `pnpm dev:cyrene` invokes `scripts/start-cyrene-web.ps1`.
- The script accepts `-ValidateOnly`, `-GenieRoot`, `-ModelDirectory`, `-ReferenceAudio`, `-SidecarPort`, `-ApiPort`, `-WebPort`, `-DatabasePath`, and readiness timeout parameters.
- Validation output identifies all three loopback endpoints and the ignored runtime database without exposing model hashes to the browser.

- [ ] Write a pytest contract test that reads `package.json` and the PowerShell source, asserting the command, parameters, loopback hosts, Genie environment, `.local/runtime`, condition polling, `-WindowStyle Hidden`, and PID-scoped cleanup.
- [ ] Run `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_start_cyrene_web_script.py -q` and confirm RED because the script and package entry are absent.
- [ ] Implement the smallest orchestrator and `dev:cyrene` entry satisfying the contract.
- [ ] Run the focused pytest and confirm GREEN.
- [ ] Run the script with `-ValidateOnly` and confirm it starts no listeners.

### Task 2: Verify website-origin real speech

**Files:**

- Modify: `README.md`
- Modify: `apps/api/README.md`
- Create: `docs/verification/2026-08-26-cyrene-web-runtime.md`

**Interfaces:**

- The public web origin is `http://127.0.0.1:5173` by default.
- `GET /api/voice/status` through Vite must report `provider: genie_tts` and `configured: true`.
- `POST /api/voice/synthesize` through Vite must return `audio/wav` with a valid RIFF/WAVE header, nonzero frames and nonzero RMS.

- [ ] Start the stack with `pnpm dev:cyrene` and wait for the script readiness marker.
- [ ] Request the page, voice status and a fresh synthesis through port 5173; record status, headers, elapsed time, WAV metadata and SHA-256.
- [ ] Open `/#/agent` in the Codex browser so the website's “昔涟讲解” control is available to the user.
- [ ] Stop the first validation stack and confirm ports 5173, 8000 and 9881 close; then restart the final stack for user use.
- [ ] Document the one-command workflow and exact required attribution.

### Task 3: Run final gates and preserve protected state

**Files:**

- Test: all intentional changes above.

- [ ] Run `pnpm test --run`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q` with an explicit temporary base directory.
- [ ] Recheck Git status, both existing SQLite files, the user DOCX and the external Genie-TTS status against the pre-task evidence.
- [ ] Leave only the final `pnpm dev:cyrene` stack running and report its URLs and stop command.
