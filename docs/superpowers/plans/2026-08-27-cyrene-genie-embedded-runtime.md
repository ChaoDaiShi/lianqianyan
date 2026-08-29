# Cyrene Genie-TTS Embedded Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the loopback Genie-TTS sidecar with a single-process Cyrene voice runtime owned by Education API.

**Architecture:** FastAPI loads one validated `GenieRuntime` during application lifespan and stores one concurrency-safe `EmbeddedGenieTTSProvider` in application state. The public `/api/voice/*` contract remains unchanged, while the internal `127.0.0.1:9881` HTTP hop, second virtual environment, sidecar process and sidecar health endpoint are removed.

**Tech Stack:** Python 3.11+, FastAPI lifespan/dependencies, asyncio, Genie-TTS 2.0.2, ONNX Runtime 1.22.1, pytest, PowerShell deployment scripts, React/Vite consumer contract.

## Global Constraints

- Use `pnpm` for root JavaScript commands and `uv` for `apps/api` Python commands.
- Preserve the existing `/api/voice/status` and `/api/voice/synthesize` browser contract.
- Load the Cyrene model exactly once and serialize inference through one asynchronous lock.
- Keep the application available with `provider: unavailable` when voice initialization fails.
- Never expose model paths, reference-audio paths, inference parameters or internal exceptions to the browser.
- Keep the fixed asset manifest, 1-600 character limit, WAV signature, 32 kHz, mono, 16-bit and maximum-size checks.
- Run Education API with one Uvicorn worker when embedded Genie-TTS is configured.
- Do not commit models, GenieData, reference audio, virtual environments, databases, logs or generated WAV files.
- Preserve all unrelated dirty-worktree changes; do not commit or push.

---

### Task 1: Define the embedded runtime and configuration contract

**Files:**
- Create: `apps/api/app/voice/genie_runtime.py`
- Modify: `apps/api/app/core/config.py`
- Replace tests: `apps/api/tests/test_genie_sidecar.py`

**Interfaces:**
- Consumes: `validate_genie_assets(model_dir, reference_audio, genie_data_dir)`.
- Produces: `GenieRuntimeSettings.from_application_settings(settings)`, `GenieRuntime.start()`, and `GenieRuntime.synthesize_to_wav(text)`.

- [ ] **Step 1: Write failing configuration and runtime tests**

```python
def test_genie_configuration_requires_all_embedded_asset_paths(tmp_path: Path) -> None:
    settings = Settings(tts_provider="genie")
    assert settings.tts_configured() is False

def test_runtime_validates_before_import_and_loads_fixed_character(tmp_path: Path) -> None:
    runtime = GenieRuntime(runtime_settings, importer=importer, asset_validator=validator)
    runtime.start()
    assert order == ["validate", "import"]
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `uv run --project apps/api pytest apps/api/tests/test_genie_sidecar.py -q`

Expected: FAIL because `app.voice.genie_runtime` and embedded path settings do not exist.

- [ ] **Step 3: Implement settings and the pure Genie runtime**

```python
@dataclass(frozen=True)
class GenieRuntimeSettings:
    model_dir: Path
    reference_audio: Path
    reference_text: str
    genie_data_dir: Path
    max_audio_bytes: int

class GenieRuntime:
    def start(self) -> None: ...
    def synthesize_to_wav(self, text: str) -> bytes: ...
```

Use `EDUCATION_TTS_MODEL_DIR`, `EDUCATION_TTS_GENIE_DATA_DIR`, `EDUCATION_TTS_REFERENCE_AUDIO_PATH` and `EDUCATION_TTS_REFERENCE_TEXT`. For `tts_provider=genie`, `tts_configured()` must require all four values and must not require a base URL.

- [ ] **Step 4: Run the focused runtime tests and verify GREEN**

Run: `uv run --project apps/api pytest apps/api/tests/test_genie_sidecar.py -q`

Expected: all pure runtime and configuration tests pass.

### Task 2: Load one provider inside FastAPI

**Files:**
- Create: `apps/api/app/voice/genie_embedded.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/api/routes/voice.py`
- Modify: `apps/api/app/voice/provider.py`
- Modify: `apps/api/app/voice/status.py`
- Modify: `apps/api/tests/test_voice_api.py`

**Interfaces:**
- Consumes: `GenieRuntime` from Task 1.
- Produces: `EmbeddedGenieTTSProvider.synthesize(text)` and runtime-aware voice status.

- [ ] **Step 1: Write failing application lifecycle tests**

```python
def test_embedded_genie_is_loaded_once_and_serves_voice() -> None:
    app = create_app(voice_runtime_factory=lambda _: runtime)
    with TestClient(app) as client:
        assert client.get("/api/voice/status").json()["provider"] == "genie_tts"
        assert client.post("/api/voice/synthesize", json={"text": "你好"}).status_code == 200
    assert runtime.start_calls == 1

def test_failed_embedded_runtime_keeps_api_available() -> None:
    app = create_app(voice_runtime_factory=lambda _: failing_runtime)
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/voice/status").json()["provider"] == "unavailable"
```

- [ ] **Step 2: Run the focused API tests and verify RED**

Run: `uv run --project apps/api pytest apps/api/tests/test_voice_api.py -q`

Expected: FAIL because `create_app` cannot accept a runtime factory and the provider still performs HTTP requests.

- [ ] **Step 3: Implement lifecycle ownership and direct inference**

```python
class EmbeddedGenieTTSProvider:
    provider_name = "genie_tts"

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        async with self._lock:
            content = await asyncio.to_thread(self._runtime.synthesize_to_wav, text)
        return SynthesizedVoiceAudio(content=content, media_type="audio/wav")
```

Store the ready provider in `app.state.voice_provider`. Dependency resolution must return this singleton for `tts_provider=genie`; startup failure returns a sanitized unavailable provider. `GET /api/voice/status` must read actual readiness.

- [ ] **Step 4: Run runtime and API tests and verify GREEN**

Run: `uv run --project apps/api pytest apps/api/tests/test_genie_sidecar.py apps/api/tests/test_voice_api.py -q`

Expected: all embedded runtime and voice API tests pass.

### Task 3: Remove sidecar deployment and unify the Python environment

**Files:**
- Modify: `apps/api/pyproject.toml`
- Modify: `apps/api/uv.lock`
- Modify: `scripts/start-cyrene-web.ps1`
- Modify: `deploy/windows/install.ps1`
- Modify: `deploy/windows/start.ps1`
- Delete: `apps/api/scripts/start_genie_voice.ps1`
- Delete: `apps/api/tests/test_start_genie_voice_script.py`
- Modify: `apps/api/tests/test_start_cyrene_web_script.py`
- Modify: `apps/api/tests/test_release_assets.py`

**Interfaces:**
- Consumes: embedded application from Task 2.
- Produces: one-environment installation and one-process backend launch.

- [ ] **Step 1: Write failing script-contract tests**

```python
assert "$SidecarPort" not in launcher
assert "$sidecarProcess" not in launcher
assert "EDUCATION_TTS_MODEL_DIR" in launcher
assert "EDUCATION_TTS_GENIE_DATA_DIR" in launcher
assert "runtime\\Genie-TTS" in installer
assert installer.count(".venv") == expected_single_environment_mentions
```

- [ ] **Step 2: Run script tests and verify RED**

Run: `uv run --project apps/api pytest apps/api/tests/test_start_cyrene_web_script.py apps/api/tests/test_release_assets.py -q`

Expected: FAIL because scripts still define and launch the sidecar.

- [ ] **Step 3: Add Genie-TTS to the backend dependency lock and simplify launchers**

Add `genie-tts==2.0.2` to Education API dependencies. Windows installation must install the packaged Genie source and Education API into one `apps/api/.venv`; launch must set embedded asset paths and start only `app.main:app --workers 1`. Development runtime must start only API and Vite, track only their owned processes and validate embedded status through `/api/voice/status`.

- [ ] **Step 4: Run script and dependency tests and verify GREEN**

Run: `uv run --project apps/api pytest apps/api/tests/test_start_cyrene_web_script.py apps/api/tests/test_release_assets.py -q`

Expected: all deployment contract tests pass and no active script references a sidecar port or process.

### Task 4: Update release and operator documentation

**Files:**
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Modify: `deploy/windows/README.md`
- Modify: `deploy/platform-source/README.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `scripts/build-platform-release.ps1`
- Create: `docs/verification/2026-08-27-cyrene-genie-embedded-runtime.md`

**Interfaces:**
- Consumes: configuration and deployment contracts from Tasks 1-3.
- Produces: truthful source-package, Windows-package and runtime instructions.

- [ ] **Step 1: Update release tests to require the embedded contract**

Require the full Windows package to retain Genie source, model, GenieData and reference audio, while documenting that platform source packages require operator-provided runtime assets. Require active documentation to contain `EDUCATION_TTS_MODEL_DIR` and contain no instructions to start port `9881`.

- [ ] **Step 2: Run release tests and verify RED**

Run: `uv run --project apps/api pytest apps/api/tests/test_release_assets.py -q`

Expected: FAIL against the old sidecar documentation and two-environment installer.

- [ ] **Step 3: Rewrite active documentation and notices**

Document one-process startup, actual readiness semantics, single-worker rule, browser fallback, asset-size/deployment limits and the existing GPT-SoVITS attribution. Mark old sidecar design/verification documents as historical rather than presenting them as the active architecture.

- [ ] **Step 4: Run release tests and verify GREEN**

Run: `uv run --project apps/api pytest apps/api/tests/test_release_assets.py -q`

Expected: all packaging and documentation contract tests pass.

### Task 5: Full verification and live synthesis

**Files:**
- Modify: `docs/verification/2026-08-27-cyrene-genie-embedded-runtime.md`

**Interfaces:**
- Consumes: final application, fixed Cyrene assets and local Genie-TTS installation.
- Produces: build, test, runtime and audio evidence.

- [ ] **Step 1: Run all static and automated gates**

Run:

```powershell
pnpm check
pnpm exec vitest run
uv run --project apps/api pytest apps/api/tests -q
pnpm build
git diff --check
```

Expected: every command exits 0; the existing large Pixi chunk may remain a warning rather than an error.

- [ ] **Step 2: Validate fixed voice assets**

Run the embedded asset validator against the local Cyrene model, reference WAV and GenieData. Expected: 9 model files, 335,992,804 model bytes, 5 runtime resources and the fixed reference SHA-256.

- [ ] **Step 3: Start only Education API and synthesize real Cyrene audio**

Start `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1` with embedded paths. Verify `/api/voice/status` returns `genie_tts`, POST one short Chinese sentence, verify `audio/wav`, RIFF/WAVE, 32 kHz mono 16-bit and play the generated file locally.

- [ ] **Step 4: Verify cleanup and record limitations**

Stop the owned API process, verify no project-owned listener remains, record package-size/native-runtime constraints and keep generated WAV/log/database artifacts outside Git.

