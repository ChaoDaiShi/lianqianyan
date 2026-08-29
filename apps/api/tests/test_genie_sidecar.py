from __future__ import annotations

import io
import os
import sys
import wave
from pathlib import Path

import pytest

from app.core.config import Settings
from app.voice.genie_runtime import (
    GenieRuntime,
    GenieRuntimeConfigurationError,
    GenieRuntimeError,
    GenieRuntimeSettings,
)


def _valid_wav(
    *, frames: int = 320, channels: int = 1, sample_width: int = 2,
    sample_rate: int = 32_000,
) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(sample_width)
        output.setframerate(sample_rate)
        output.writeframes(b"\x01" * frames * channels * sample_width)
    return buffer.getvalue()


def _settings(tmp_path: Path, **overrides: object) -> GenieRuntimeSettings:
    genie_root = tmp_path / "runtime" / "genie-tts"
    (genie_root / "src" / "genie_tts").mkdir(parents=True, exist_ok=True)
    (genie_root / "src" / "genie_tts" / "__init__.py").write_text(
        "", encoding="utf-8"
    )
    values: dict[str, object] = {
        "genie_root": genie_root,
        "model_dir": tmp_path / "model",
        "reference_audio": tmp_path / "reference.wav",
        "reference_text": "能在梦里听见朦胧的神谕。",
        "genie_data_dir": tmp_path / "GenieData",
        "max_audio_bytes": 1_000_000,
    }
    values.update(overrides)
    return GenieRuntimeSettings(**values)


def test_application_settings_require_all_embedded_genie_assets(tmp_path: Path) -> None:
    incomplete = Settings(
        tts_provider="genie", tts_model_dir=str(tmp_path / "model"),
        tts_reference_audio_path=str(tmp_path / "reference.wav"),
        tts_reference_text="参考文本",
    )
    complete_without_root = Settings(
        tts_provider="genie", tts_model_dir=str(tmp_path / "model"),
        tts_genie_data_dir=str(tmp_path / "GenieData"),
        tts_reference_audio_path=str(tmp_path / "reference.wav"),
        tts_reference_text="参考文本",
    )
    complete = complete_without_root.model_copy(
        update={"tts_genie_root": str(tmp_path / "runtime" / "genie-tts")}
    )

    assert incomplete.tts_configured() is False
    assert complete_without_root.tts_configured() is False
    assert complete.tts_configured() is True
    assert complete.normalized_tts_base_url() is None


@pytest.mark.parametrize(
    "field", ["genie_root", "model_dir", "reference_audio", "genie_data_dir"]
)
def test_runtime_settings_require_absolute_paths(tmp_path: Path, field: str) -> None:
    with pytest.raises(GenieRuntimeConfigurationError, match="必须使用绝对路径"):
        _settings(tmp_path, **{field: Path("relative")}).validated()


def test_runtime_settings_reject_blank_reference_text(tmp_path: Path) -> None:
    with pytest.raises(GenieRuntimeConfigurationError, match="参考文本不能为空"):
        _settings(tmp_path, reference_text=" \n ").validated()


def test_runtime_settings_are_created_from_application_settings(tmp_path: Path) -> None:
    package_dir = tmp_path / "runtime" / "genie-tts" / "src" / "genie_tts"
    package_dir.mkdir(parents=True)
    (package_dir / "__init__.py").write_text("", encoding="utf-8")
    settings = Settings(
        tts_provider="genie",
        tts_genie_root=str(tmp_path / "runtime" / "genie-tts"),
        tts_model_dir=str(tmp_path / "model"),
        tts_genie_data_dir=str(tmp_path / "GenieData"),
        tts_reference_audio_path=str(tmp_path / "reference.wav"),
        tts_reference_text="  参考文本  ", tts_max_audio_bytes=1234,
    )

    result = GenieRuntimeSettings.from_application_settings(settings)

    assert result.genie_root == tmp_path / "runtime" / "genie-tts"
    assert result.model_dir == tmp_path / "model"
    assert result.genie_data_dir == tmp_path / "GenieData"
    assert result.reference_audio == tmp_path / "reference.wav"
    assert result.reference_text == "参考文本"
    assert result.max_audio_bytes == 1234


class _FakeGenieModule:
    def __init__(
        self,
        output: bytes,
        *,
        module_file: Path | None = None,
        fail: bool = False,
    ) -> None:
        self.output = output
        self.fail = fail
        self.__file__ = str(module_file) if module_file is not None else None
        self.calls: list[tuple[str, dict[str, object]]] = []
        self.last_save_path: Path | None = None

    def load_character(self, **kwargs: object) -> None:
        self.calls.append(("load_character", kwargs))

    def set_reference_audio(self, **kwargs: object) -> None:
        self.calls.append(("set_reference_audio", kwargs))

    def tts(self, **kwargs: object) -> None:
        self.calls.append(("tts", kwargs))
        self.last_save_path = Path(str(kwargs["save_path"]))
        if self.fail:
            raise RuntimeError(f"private path leaked: {self.last_save_path}")
        self.last_save_path.write_bytes(self.output)


def test_runtime_validates_before_import_and_loads_only_fixed_character(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(
        _valid_wav(),
        module_file=settings.genie_root / "src" / "genie_tts" / "__init__.py",
    )
    order: list[str] = []

    def validate(*_: object) -> object:
        order.append("validate")
        return object()

    def importer() -> _FakeGenieModule:
        order.append("import")
        assert os.environ["GENIE_DATA_DIR"] == str(settings.genie_data_dir)
        return fake

    monkeypatch.delenv("GENIE_DATA_DIR", raising=False)
    runtime = GenieRuntime(settings, importer=importer, asset_validator=validate)
    runtime.start()

    assert order == ["validate", "import"]
    assert sys.path[0] == str(settings.genie_root / "src")
    assert fake.calls == [
        ("load_character", {"character_name": "cyrene", "onnx_model_dir": str(settings.model_dir), "language": "zh"}),
        ("set_reference_audio", {"character_name": "cyrene", "audio_path": str(settings.reference_audio), "audio_text": settings.reference_text, "language": "zh"}),
    ]


def test_runtime_rejects_genie_module_loaded_outside_project_root(
    tmp_path: Path,
) -> None:
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(
        _valid_wav(), module_file=tmp_path / "site-packages" / "genie_tts" / "__init__.py"
    )
    runtime = GenieRuntime(
        settings,
        importer=lambda: fake,
        asset_validator=lambda *_: object(),
    )

    with pytest.raises(GenieRuntimeError, match="运行时启动失败"):
        runtime.start()


@pytest.mark.parametrize(
    ("output", "message"),
    [
        (b"", "未生成音频"), (b"not-wave", "不是有效 WAV"),
        (_valid_wav(frames=0), "没有音频帧"),
        (_valid_wav(channels=2), "必须为单声道"),
        (_valid_wav(sample_width=1), "必须为 16 位"),
        (_valid_wav(sample_rate=44_100), "采样率必须为 32 kHz"),
    ],
)
def test_runtime_rejects_invalid_output_and_deletes_temporary_file(
    tmp_path: Path, output: bytes, message: str,
) -> None:
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(
        output,
        module_file=settings.genie_root / "src" / "genie_tts" / "__init__.py",
    )
    runtime = GenieRuntime(
        settings, importer=lambda: fake,
        asset_validator=lambda *_: object(), temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match=message):
        runtime.synthesize_to_wav("测试")

    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_rejects_audio_over_size_limit(tmp_path: Path) -> None:
    settings = _settings(tmp_path, max_audio_bytes=100)
    fake = _FakeGenieModule(
        _valid_wav(frames=400),
        module_file=settings.genie_root / "src" / "genie_tts" / "__init__.py",
    )
    runtime = GenieRuntime(
        settings, importer=lambda: fake,
        asset_validator=lambda *_: object(), temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match="超过大小限制"):
        runtime.synthesize_to_wav("测试")
    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_returns_true_wav_and_never_plays_audio(tmp_path: Path) -> None:
    expected = _valid_wav()
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(
        expected,
        module_file=settings.genie_root / "src" / "genie_tts" / "__init__.py",
    )
    runtime = GenieRuntime(
        settings, importer=lambda: fake,
        asset_validator=lambda *_: object(), temporary_directory=tmp_path,
    )
    runtime.start()

    result = runtime.synthesize_to_wav("解释死锁。")

    assert result == expected
    _, tts_call = fake.calls[-1]
    assert tts_call["character_name"] == "cyrene"
    assert tts_call["text"] == "解释死锁。"
    assert tts_call["play"] is False
    assert tts_call["split_sentence"] is True
    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()


def test_runtime_sanitizes_internal_failure_and_deletes_file(tmp_path: Path) -> None:
    settings = _settings(tmp_path)
    fake = _FakeGenieModule(
        _valid_wav(),
        module_file=settings.genie_root / "src" / "genie_tts" / "__init__.py",
        fail=True,
    )
    runtime = GenieRuntime(
        settings, importer=lambda: fake,
        asset_validator=lambda *_: object(), temporary_directory=tmp_path,
    )
    runtime.start()

    with pytest.raises(GenieRuntimeError, match="语音生成失败") as caught:
        runtime.synthesize_to_wav("测试")

    assert str(tmp_path) not in str(caught.value)
    assert fake.last_save_path is not None
    assert not fake.last_save_path.exists()
