# Cyrene GPT-SOVITS Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic browser-first digital-human speech with a real, configurable Cyrene GPT-SOVITS V2 audio path while retaining an explicitly labeled browser fallback and the required attribution everywhere speech is used.

**Architecture:** Education API owns a fixed, environment-configured GPT-SOVITS `/tts` adapter; clients can submit only cleaned text. The React controller requests WAV audio first, owns/cancels `Audio` and Blob URLs, and falls back to Web Speech with a visible mode label. Reference audio and weights stay outside Git; a tested installer extracts one hash-pinned WAV into `.local/voice`.

**Tech Stack:** React 18, TypeScript, Axios, browser Audio/Web Speech APIs, FastAPI, Pydantic, httpx, pytest, Vitest, PowerShell/Windows deployment.

## Global Constraints

- Use `pnpm` only for frontend commands.
- Do not add the 1.274 GB corpus, either model weight, or a GPT-SOVITS inference package to Git.
- Dynamic spoken audio must correspond to the current answer text; never substitute an unrelated reference recording.
- The exact visible attribution is: `GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn`.
- Use the official GPT-SOVITS V2 non-streaming `POST /tts` schema documented in `https://github.com/RVC-Boss/GPT-SoVITS/blob/main/api_v2.py`.
- Client input is limited to cleaned text of 1–600 characters; upstream URL, reference path, prompt and inference controls are server-owned.
- Preserve the untracked `docs/创新赛道——开发日志参考模板.docx` and ignored runtime databases.
- Do not spawn subagents; execute this plan inline.

---

### Task 1: Restricted GPT-SOVITS backend adapter

**Files:**
- Create: `apps/api/app/voice/__init__.py`
- Create: `apps/api/app/voice/models.py`
- Create: `apps/api/app/voice/gpt_sovits.py`
- Create: `apps/api/app/voice/status.py`
- Create: `apps/api/app/api/routes/voice.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/app/api/__init__.py`
- Create: `apps/api/tests/test_voice_api.py`

**Interfaces:**
- Produces `VOICE_ATTRIBUTION: str`, `VoiceStatus`, `VoiceSynthesisRequest`, `SynthesizedVoiceAudio`, `GPTSoVITSProvider.synthesize(text)`.
- Produces `GET /api/voice/status` and `POST /api/voice/synthesize`.
- Consumes `Settings.tts_base_url`, `tts_reference_audio_path`, `tts_reference_text`, `tts_timeout`, `tts_max_audio_bytes`.

- [ ] **Step 1: Write failing status and configuration tests**

```python
def test_voice_status_is_honest_and_contains_exact_attribution(client, monkeypatch):
    monkeypatch.delenv("EDUCATION_TTS_BASE_URL", raising=False)
    response = client.get("/api/voice/status")
    assert response.status_code == 200
    assert response.json() == {
        "provider": "unavailable",
        "voice": "cyrene",
        "configured": False,
        "fallback": "browser_speech",
        "attribution": VOICE_ATTRIBUTION,
    }
    assert "reference_audio" not in response.text
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_voice_api.py -q`

Expected: collection or route failure because `app.voice` and `/api/voice/status` do not exist.

- [ ] **Step 3: Implement settings, models and status route**

```python
VOICE_ATTRIBUTION = (
    "GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，"
    "自练作者为KearDawn"
)

class VoiceSynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)

class VoiceStatus(BaseModel):
    provider: Literal["gpt_sovits", "unavailable"]
    voice: Literal["cyrene"] = "cyrene"
    configured: bool
    fallback: Literal["browser_speech"] = "browser_speech"
    attribution: str = VOICE_ATTRIBUTION
```

Add the five `tts_*` settings and include `voice.router` in the `/api` router.

- [ ] **Step 4: Write failing synthesis proxy tests**

Cover exact cases with `httpx.MockTransport`: unconfigured 503 with zero upstream calls; official JSON fields; WAV byte preservation; non-audio response; upstream 400; oversized body; timeout. Assert error payloads never contain the configured URL or reference path.

```python
assert received_json["text"] == "死锁的四个必要条件"
assert received_json["text_lang"] == "zh"
assert received_json["ref_audio_path"] == "C:/voice/cyrene-reference.wav"
assert received_json["prompt_lang"] == "zh"
assert received_json["text_split_method"] == "cut5"
assert received_json["media_type"] == "wav"
assert received_json["streaming_mode"] is False
```

- [ ] **Step 5: Run synthesis tests and verify RED**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_voice_api.py -q`

Expected: failures because the provider and synthesis route are missing.

- [ ] **Step 6: Implement the minimal async provider and route**

Use `AsyncClient.stream("POST", f"{base_url}/tts", json=payload)`, accept only WAV media types, stop after `tts_max_audio_bytes`, and map provider exceptions to a generic 502. Return `Response(audio.bytes, media_type="audio/wav", headers={"Cache-Control": "no-store", "X-Voice-Provider": "gpt-sovits"})`.

- [ ] **Step 7: Verify backend task GREEN**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_voice_api.py apps/api/tests/test_cors.py apps/api/tests/test_health.py -q`

Expected: all selected tests pass with no new warning beyond the existing TestClient deprecation warning.

- [ ] **Step 8: Commit backend adapter**

```powershell
git add -- apps/api/app/voice apps/api/app/api/routes/voice.py apps/api/app/core/config.py apps/api/app/api/__init__.py apps/api/tests/test_voice_api.py
git commit -m "feat: proxy cyrene gpt-sovits speech"
```

### Task 2: Frontend Cyrene playback and visible attribution

**Files:**
- Create: `src/lib/voiceApi.ts`
- Create: `src/lib/voiceApi.test.ts`
- Create: `src/components/digital-human/voiceAttribution.ts`
- Create: `src/components/digital-human/VoiceAttributionNotice.tsx`
- Create: `src/components/digital-human/VoiceAttributionNotice.test.tsx`
- Modify: `src/components/digital-human/speech.ts`
- Modify: `src/components/digital-human/speech.test.ts`
- Create: `src/components/digital-human/speechPlayback.ts`
- Create: `src/components/digital-human/speechPlayback.test.ts`
- Modify: `src/components/digital-human/useSpeechSynthesis.ts`
- Modify: `src/components/digital-human/SpeechControls.tsx`
- Create: `src/components/digital-human/SpeechControls.test.tsx`
- Modify: `src/pages/XiaolianPage.tsx`
- Modify: `src/pages/XiaolianSpeech.test.tsx`
- Modify: `src/components/learning/SpaceTutor.tsx`
- Modify: `src/components/learning/SpaceTutorSpeech.test.tsx`
- Modify: `src/components/exam/ExamRunner.tsx`
- Modify: `src/components/exam/ExamRunner.test.tsx`
- Modify: `src/pages/PlaceholderPages.tsx`
- Modify: `src/pages/PlaceholderPages.test.tsx`

**Interfaces:**
- Produces `VoiceMode = "cyrene" | "browser_fallback" | "unavailable"` and `selectVoiceMode(configured, browserSupported)`.
- Produces `fetchVoiceStatus()` and `synthesizeCyreneSpeech(text, signal): Promise<Blob>`.
- Extends `SpeechSynthesisController` with `mode`, `error`, and asynchronous remote-first playback while preserving `supported`, `speaking`, `speak`, `stop`.

- [ ] **Step 1: Write failing API, mode and attribution tests**

```ts
expect(selectVoiceMode(true, true)).toBe('cyrene');
expect(selectVoiceMode(false, true)).toBe('browser_fallback');
expect(selectVoiceMode(false, false)).toBe('unavailable');
expect(renderToStaticMarkup(<VoiceAttributionNotice />)).toContain(VOICE_ATTRIBUTION);
```

Mock Axios responses to assert `/api/voice/status`, `/api/voice/synthesize`, `responseType: "blob"`, and `signal` forwarding.

- [ ] **Step 2: Run the new frontend tests and verify RED**

Run: `pnpm test --run src/lib/voiceApi.test.ts src/components/digital-human/VoiceAttributionNotice.test.tsx src/components/digital-human/SpeechControls.test.tsx`

Expected: missing module/component failures.

- [ ] **Step 3: Implement API, shared constant, mode selector and controls**

```ts
export const VOICE_ATTRIBUTION =
  'GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，自练作者为KearDawn';

export function selectVoiceMode(
  configured: boolean,
  browserSupported: boolean,
): VoiceMode {
  if (configured) return 'cyrene';
  return browserSupported ? 'browser_fallback' : 'unavailable';
}
```

`SpeechControls` receives `mode` and `error`; its visible label is “昔涟语音讲解” only in `cyrene`, otherwise “浏览器备用讲解”.

- [ ] **Step 4: Write a failing controller behavior test around an extracted playback helper**

Extract a dependency-injected `startVoicePlayback` helper that accepts `requestAudio`, `createAudio`, `speakWithBrowser`, and `onMode`. Test remote success, remote failure fallback, abort, object URL cleanup, and absence of browser support.

- [ ] **Step 5: Run helper test and verify RED**

Run: `pnpm test --run src/components/digital-human/speechPlayback.test.ts`

Expected: missing helper failure.

- [ ] **Step 6: Implement remote-first controller and lifecycle cleanup**

The hook owns one `AbortController`, one `HTMLAudioElement`, one Blob URL, and one browser utterance. `stop()` must abort/pause/revoke/cancel only owned resources. `onended`, `onerror`, replacement playback and unmount all converge on the same cleanup path.

- [ ] **Step 7: Add attribution and mode to all speech surfaces**

Render `VoiceAttributionNotice` once in each of `XiaolianWorkspace`, `SpaceTutor`, and `ExamRunner`. Pass `speech.mode` and `speech.error` to every `SpeechControls`. Update settings/privacy copy so output text transmission is distinguished from microphone input.

- [ ] **Step 8: Verify frontend task GREEN**

Run: `pnpm test --run src/components/digital-human src/pages/XiaolianSpeech.test.tsx src/components/learning/SpaceTutorSpeech.test.tsx src/components/exam/ExamRunner.test.tsx src/pages/PlaceholderPages.test.tsx src/lib/voiceApi.test.ts`

Expected: all selected tests pass and exact attribution appears in each speech surface test.

- [ ] **Step 9: Run template gate and commit**

Run: `pnpm check`

```powershell
git add -- src/lib/voiceApi.ts src/lib/voiceApi.test.ts src/components/digital-human src/pages/XiaolianPage.tsx src/pages/XiaolianSpeech.test.tsx src/components/learning/SpaceTutor.tsx src/components/learning/SpaceTutorSpeech.test.tsx src/components/exam/ExamRunner.tsx src/components/exam/ExamRunner.test.tsx src/pages/PlaceholderPages.tsx src/pages/PlaceholderPages.test.tsx
git commit -m "feat: play cyrene voice with explicit fallback"
```

### Task 3: Hash-pinned reference installer and deployment documentation

**Files:**
- Create: `apps/api/scripts/install_cyrene_voice.py`
- Create: `apps/api/tests/test_install_cyrene_voice.py`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Modify: `.gitignore` only if `.local/voice` is not already ignored

**Interfaces:**
- Produces `install_cyrene_voice(zip_path: Path, output_directory: Path) -> VoiceInstallReport`.
- Produces `.local/voice/cyrene-reference.wav` and `.local/voice/cyrene-reference.json` outside Git.

- [ ] **Step 1: Write failing installer tests with a synthetic ZIP**

Generate a tiny valid mono 48 kHz/16-bit WAV in the pytest temp directory, place it under nested Unicode directories, and assert exact-leaf extraction. Add cases for relative paths, duplicate target names, wrong SHA, oversized entry and atomic failure.

- [ ] **Step 2: Run installer tests and verify RED**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_install_cyrene_voice.py -q`

Expected: import failure because the installer does not exist.

- [ ] **Step 3: Implement the safe installer**

Pin filename, transcript, expected SHA, channels, sample rate, sample width and duration bounds in constants. Validate ZIP and output paths are absolute. Read only the unique selected entry, validate in memory, then write a temporary sibling and replace the final WAV/JSON atomically.

- [ ] **Step 4: Verify installer tests GREEN**

Run: `apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests/test_install_cyrene_voice.py -q`

- [ ] **Step 5: Install the actual user-provided reference clip**

```powershell
apps\api\.venv\Scripts\python.exe apps\api\scripts\install_cyrene_voice.py --zip "F:\昔涟AI-GPT-SOVITS--V2proplus\昔涟参考音频.zip" --output "F:\比赛\智能体 ican 教育skill\.local\voice"
```

Verify the output WAV SHA is `C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6`, the metadata contains the exact attribution, and `git check-ignore` reports both files ignored.

- [ ] **Step 6: Document inference service and attribution**

Document the official `api_v2.py` service requirement, the two provided model paths, the reference installer command, all `EDUCATION_TTS_*` variables, status/synthesis endpoints, fallback behavior, shared-filesystem requirement for `ref_audio_path`, and the exact attribution in all three documents.

- [ ] **Step 7: Commit installer and documentation**

```powershell
git add -- apps/api/scripts/install_cyrene_voice.py apps/api/tests/test_install_cyrene_voice.py README.md apps/api/README.md THIRD_PARTY_NOTICES.md .gitignore
git commit -m "feat: install and document cyrene voice assets"
```

### Task 4: Full integration and evidence

**Files:**
- Create: `docs/verification/2026-08-26-cyrene-gpt-sovits-voice.md`

**Interfaces:**
- Consumes all previous task outputs.
- Produces an evidence record with exact commands, counts, hashes, screenshots and remaining deployment dependency.

- [ ] **Step 1: Run full automated gates**

```powershell
pnpm test --run
pnpm check
pnpm build
apps\api\.venv\Scripts\python.exe -m pytest apps/api/tests -q
```

- [ ] **Step 2: Run isolated API verification**

Use a fresh temporary SQLite and port other than 8000. Verify unconfigured status/503. Start a local stub that implements official `/tts`, returns a valid WAV, and assert Education API sends fixed Cyrene payload and relays WAV without leaking the configured path in public status.

- [ ] **Step 3: Run browser verification**

At `/#/agent` in 1440×1000 and 390×844, verify full attribution is discoverable, the fallback label is honest while no real inference service is configured, Live2D remains visible, root scroll width equals viewport width, and console/runtime/network failures are zero except the expected handled 503 request if the button is deliberately exercised.

- [ ] **Step 4: Re-audit protected files and runtime databases**

Compare SHA-256, length and modification time of both runtime SQLite files and `docs/创新赛道——开发日志参考模板.docx` with pre-task values. Confirm Git status contains only that user file and intentional tracked changes; `.local/voice` must remain ignored.

- [ ] **Step 5: Write evidence and commit**

Record the full test counts, selected WAV metadata/hash, browser results, backend payload, build warnings, existing TestClient warning, and the fact that a GPT-SOVITS inference package is still required for live dynamic Cyrene synthesis.

```powershell
git add -- docs/verification/2026-08-26-cyrene-gpt-sovits-voice.md
git commit -m "docs: verify cyrene gpt-sovits voice integration"
```
