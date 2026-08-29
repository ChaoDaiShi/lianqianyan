from __future__ import annotations

import importlib
import os
import sys
import tempfile
import wave
from collections.abc import Callable
from dataclasses import dataclass, replace
from pathlib import Path
from types import ModuleType
from typing import Protocol

from app.core.config import Settings
from app.voice.cyrene_genie_manifest import validate_genie_assets


class GenieRuntimeConfigurationError(ValueError):
    """A sanitized embedded-runtime configuration failure."""


class GenieRuntimeError(RuntimeError):
    """A sanitized embedded-runtime failure."""


@dataclass(frozen=True)
class GenieRuntimeSettings:
    genie_root: Path
    model_dir: Path
    reference_audio: Path
    reference_text: str
    genie_data_dir: Path
    max_audio_bytes: int = 20_000_000

    @classmethod
    def from_application_settings(cls, settings: Settings) -> GenieRuntimeSettings:
        return cls(
            genie_root=Path(settings.tts_genie_root or ""),
            model_dir=Path(settings.tts_model_dir or ""),
            reference_audio=Path(settings.tts_reference_audio_path or ""),
            reference_text=settings.tts_reference_text or "",
            genie_data_dir=Path(settings.tts_genie_data_dir or ""),
            max_audio_bytes=settings.tts_max_audio_bytes,
        ).validated()

    def validated(self) -> GenieRuntimeSettings:
        if self.max_audio_bytes < 44:
            raise GenieRuntimeConfigurationError("音频大小限制无效")
        reference_text = self.reference_text.strip()
        if not reference_text:
            raise GenieRuntimeConfigurationError("参考文本不能为空")
        for path, label in (
            (self.genie_root, "Genie-TTS运行区"),
            (self.model_dir, "模型目录"),
            (self.reference_audio, "参考音频"),
            (self.genie_data_dir, "GenieData目录"),
        ):
            if not path.is_absolute():
                raise GenieRuntimeConfigurationError(f"{label}必须使用绝对路径")
        package_entry = self.genie_root / "src" / "genie_tts" / "__init__.py"
        if not package_entry.is_file():
            raise GenieRuntimeConfigurationError("Genie-TTS运行区缺少本地引擎源码")
        return replace(self, reference_text=reference_text)


class GenieModule(Protocol):
    def load_character(self, **kwargs: object) -> None: ...
    def set_reference_audio(self, **kwargs: object) -> None: ...
    def tts(self, **kwargs: object) -> None: ...


def _import_genie_tts() -> ModuleType:
    return importlib.import_module("genie_tts")


def _prepare_project_genie_import(genie_root: Path) -> Path:
    source_root = (genie_root / "src").resolve()
    source_value = str(source_root)
    sys.path[:] = [entry for entry in sys.path if entry != source_value]
    sys.path.insert(0, source_value)
    importlib.invalidate_caches()
    return source_root


def _assert_project_genie_module(module: object, source_root: Path) -> None:
    module_file = getattr(module, "__file__", None)
    if not module_file:
        raise GenieRuntimeConfigurationError("Genie-TTS模块缺少来源信息")
    try:
        resolved_module = Path(str(module_file)).resolve(strict=False)
        resolved_module.relative_to(source_root)
    except (OSError, ValueError) as exc:
        raise GenieRuntimeConfigurationError("Genie-TTS模块未从项目运行区加载") from exc


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
        settings: GenieRuntimeSettings,
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
            source_root = _prepare_project_genie_import(self._settings.genie_root)
            genie = self._importer()
            _assert_project_genie_module(genie, source_root)
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
