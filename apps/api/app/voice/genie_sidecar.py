from __future__ import annotations

import asyncio
import importlib
import logging
import os
import tempfile
import wave
from collections.abc import Callable, Mapping
from contextlib import asynccontextmanager
from dataclasses import dataclass, replace
from pathlib import Path
from types import ModuleType
from typing import Protocol

from fastapi import FastAPI, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.voice.cyrene_genie_manifest import validate_genie_assets

logger = logging.getLogger(__name__)


class GenieSidecarConfigurationError(ValueError):
    """A sanitized startup configuration failure."""


class GenieRuntimeError(RuntimeError):
    """A sanitized runtime failure."""


@dataclass(frozen=True)
class GenieSidecarSettings:
    host: str
    port: int
    model_dir: Path
    reference_audio: Path
    reference_text: str
    genie_data_dir: Path
    max_audio_bytes: int = 20_000_000

    @classmethod
    def from_environment(
        cls,
        environment: Mapping[str, str] | None = None,
    ) -> GenieSidecarSettings:
        values = environment if environment is not None else os.environ
        try:
            port = int(values.get("GENIE_SIDECAR_PORT", "9881"))
            max_audio_bytes = int(
                values.get("GENIE_SIDECAR_MAX_AUDIO_BYTES", "20000000")
            )
        except ValueError as exc:
            raise GenieSidecarConfigurationError("端口或音频大小限制无效") from exc

        return cls(
            host=values.get("GENIE_SIDECAR_HOST", "127.0.0.1"),
            port=port,
            model_dir=Path(values.get("GENIE_SIDECAR_MODEL_DIR", "")),
            reference_audio=Path(
                values.get("GENIE_SIDECAR_REFERENCE_AUDIO", "")
            ),
            reference_text=values.get("GENIE_SIDECAR_REFERENCE_TEXT", ""),
            genie_data_dir=Path(values.get("GENIE_DATA_DIR", "")),
            max_audio_bytes=max_audio_bytes,
        ).validated()

    def validated(self) -> GenieSidecarSettings:
        host = self.host.strip().lower()
        if host not in {"127.0.0.1", "localhost", "::1"}:
            raise GenieSidecarConfigurationError("Genie-TTS 侧车仅允许回环地址")
        if self.port < 1 or self.port > 65_535:
            raise GenieSidecarConfigurationError("Genie-TTS 侧车端口无效")
        if self.max_audio_bytes < 44:
            raise GenieSidecarConfigurationError("音频大小限制无效")
        reference_text = self.reference_text.strip()
        if not reference_text:
            raise GenieSidecarConfigurationError("参考文本不能为空")

        for path, label in (
            (self.model_dir, "模型目录"),
            (self.reference_audio, "参考音频"),
            (self.genie_data_dir, "GenieData目录"),
        ):
            if not path.is_absolute():
                raise GenieSidecarConfigurationError(f"{label}必须使用绝对路径")

        return replace(self, host=host, reference_text=reference_text)


class GenieModule(Protocol):
    def load_character(self, **kwargs: object) -> None: ...

    def set_reference_audio(self, **kwargs: object) -> None: ...

    def tts(self, **kwargs: object) -> None: ...


class SidecarRuntime(Protocol):
    def start(self) -> None: ...

    def synthesize_to_wav(self, text: str) -> bytes: ...


def _import_genie_tts() -> ModuleType:
    return importlib.import_module("genie_tts")


def _inspect_wav(content: bytes, max_audio_bytes: int) -> None:
    import io

    if not content:
        raise GenieRuntimeError("Genie-TTS 未生成音频")
    if len(content) > max_audio_bytes:
        raise GenieRuntimeError("Genie-TTS 音频超过大小限制")
    if len(content) < 12 or content[:4] != b"RIFF" or content[8:12] != b"WAVE":
        raise GenieRuntimeError("Genie-TTS 输出不是有效 WAV")

    try:
        with wave.open(io.BytesIO(content), "rb") as reader:
            if reader.getnchannels() != 1:
                raise GenieRuntimeError("Genie-TTS WAV 必须为单声道")
            if reader.getsampwidth() != 2:
                raise GenieRuntimeError("Genie-TTS WAV 必须为 16 位")
            if reader.getframerate() != 32_000:
                raise GenieRuntimeError("Genie-TTS WAV 采样率必须为 32 kHz")
            if reader.getnframes() < 1:
                raise GenieRuntimeError("Genie-TTS WAV 没有音频帧")
    except GenieRuntimeError:
        raise
    except (EOFError, wave.Error) as exc:
        raise GenieRuntimeError("Genie-TTS 输出不是有效 WAV") from exc


class GenieRuntime:
    def __init__(
        self,
        settings: GenieSidecarSettings,
        *,
        importer: Callable[[], GenieModule] = _import_genie_tts,
        asset_validator: Callable[..., object] = validate_genie_assets,
        temporary_directory: Path | None = None,
    ) -> None:
        self._settings = settings.validated()
        self._importer = importer
        self._asset_validator = asset_validator
        self._temporary_directory = temporary_directory
        self._genie: GenieModule | None = None

    def start(self) -> None:
        try:
            self._asset_validator(
                self._settings.model_dir,
                self._settings.reference_audio,
                self._settings.genie_data_dir,
            )
            os.environ["GENIE_DATA_DIR"] = str(self._settings.genie_data_dir)
            genie = self._importer()
            genie.load_character(
                character_name="cyrene",
                onnx_model_dir=str(self._settings.model_dir),
                language="zh",
            )
            genie.set_reference_audio(
                character_name="cyrene",
                audio_path=str(self._settings.reference_audio),
                audio_text=self._settings.reference_text,
                language="zh",
            )
            self._genie = genie
        except Exception as exc:
            raise GenieRuntimeError("Genie-TTS 运行时启动失败") from exc

    def synthesize_to_wav(self, text: str) -> bytes:
        if self._genie is None:
            raise GenieRuntimeError("Genie-TTS 运行时未启动")

        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                prefix="educationmind-cyrene-",
                suffix=".wav",
                dir=self._temporary_directory,
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)

            self._genie.tts(
                character_name="cyrene",
                text=text,
                play=False,
                split_sentence=True,
                save_path=str(temporary_path),
            )
            content = temporary_path.read_bytes()
            _inspect_wav(content, self._settings.max_audio_bytes)
            return content
        except GenieRuntimeError:
            raise
        except Exception as exc:
            raise GenieRuntimeError("Genie-TTS 语音生成失败") from exc
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)


class GenieTTSRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=600)

    @field_validator("text")
    @classmethod
    def reject_whitespace_only(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("speech text must not be blank")
        return cleaned


def create_genie_sidecar(
    settings: GenieSidecarSettings | None = None,
    runtime_factory: Callable[[GenieSidecarSettings], SidecarRuntime] = GenieRuntime,
) -> FastAPI:
    active_settings = (settings or GenieSidecarSettings.from_environment()).validated()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runtime = runtime_factory(active_settings)
        app.state.genie_runtime = runtime
        app.state.genie_ready = False
        try:
            await asyncio.to_thread(runtime.start)
        except Exception:
            logger.exception("Genie-TTS sidecar failed to start")
        else:
            app.state.genie_ready = True
        yield

    app = FastAPI(
        title="EducationMind Cyrene Genie-TTS Sidecar",
        version="1.0.0",
        lifespan=lifespan,
    )
    synthesis_lock = asyncio.Lock()

    @app.get("/health")
    async def health() -> dict[str, object]:
        if not app.state.genie_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="昔涟 Genie-TTS 运行时未就绪",
            )
        return {"ready": True, "runtime": "genie_tts", "voice": "cyrene"}

    @app.post("/tts")
    async def synthesize(request: GenieTTSRequest) -> Response:
        if not app.state.genie_ready:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="昔涟 Genie-TTS 运行时未就绪",
            )
        try:
            async with synthesis_lock:
                content = await asyncio.to_thread(
                    app.state.genie_runtime.synthesize_to_wav,
                    request.text,
                )
        except Exception as exc:
            logger.exception("Genie-TTS synthesis failed", exc_info=exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="昔涟 Genie-TTS 语音生成失败",
            ) from exc

        return Response(
            content=content,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-Voice-Provider": "genie-tts",
            },
        )

    return app


def create_app() -> FastAPI:
    """Uvicorn factory entry point for the loopback sidecar."""

    return create_genie_sidecar()
