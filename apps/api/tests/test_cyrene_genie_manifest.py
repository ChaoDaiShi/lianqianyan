from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from app.voice.cyrene_genie_manifest import (
    CYRENE_REFERENCE_TRANSCRIPT,
    AssetFingerprint,
    GenieAssetConfigurationError,
    validate_genie_assets,
)


def test_reference_prompt_is_a_single_short_utterance() -> None:
    assert CYRENE_REFERENCE_TRANSCRIPT == "能在梦里听见朦胧的神谕。"
    assert "还在" not in CYRENE_REFERENCE_TRANSCRIPT


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest().upper()


def _fixture_assets(tmp_path: Path) -> tuple[Path, Path, Path, dict[str, AssetFingerprint]]:
    model_dir = tmp_path / "model"
    model_dir.mkdir()
    model_content = b"cyrene-onnx-fixture"
    (model_dir / "model.onnx").write_bytes(model_content)

    reference_audio = tmp_path / "reference.wav"
    reference_audio.write_bytes(b"RIFF-reference-fixture")

    genie_data_dir = tmp_path / "GenieData"
    for relative_path in (
        "G2P/ChineseG2P/opencpop-strict.txt",
        "G2P/ChineseG2P/polyphonic.pickle",
        "chinese-hubert-base/chinese-hubert-base.onnx",
        "chinese-hubert-base/chinese-hubert-base_weights_fp16.bin",
        "speaker_encoder.onnx",
    ):
        target = genie_data_dir / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"runtime-resource")

    manifest = {
        "model.onnx": AssetFingerprint(
            size=len(model_content),
            sha256=_sha256(model_content),
        )
    }
    return model_dir, reference_audio, genie_data_dir, manifest


def test_validates_fixed_model_reference_and_chinese_runtime_assets(tmp_path: Path) -> None:
    model_dir, reference_audio, genie_data_dir, manifest = _fixture_assets(tmp_path)

    report = validate_genie_assets(
        model_dir,
        reference_audio,
        genie_data_dir,
        model_manifest=manifest,
        reference_sha256=_sha256(reference_audio.read_bytes()),
    )

    assert report.model_file_count == 1
    assert report.model_bytes == len(b"cyrene-onnx-fixture")
    assert report.reference_sha256 == _sha256(reference_audio.read_bytes())
    assert report.runtime_resource_count == 5


@pytest.mark.parametrize("target", ["model", "reference", "data"])
def test_rejects_relative_asset_paths_without_leaking_paths(
    tmp_path: Path,
    target: str,
) -> None:
    model_dir, reference_audio, genie_data_dir, manifest = _fixture_assets(tmp_path)
    values: list[Path] = [model_dir, reference_audio, genie_data_dir]
    values[{"model": 0, "reference": 1, "data": 2}[target]] = Path("relative")

    with pytest.raises(GenieAssetConfigurationError, match="必须使用绝对路径") as caught:
        validate_genie_assets(
            *values,
            model_manifest=manifest,
            reference_sha256=_sha256(reference_audio.read_bytes()),
        )

    assert str(tmp_path) not in str(caught.value)


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        ("missing", "模型文件缺失"),
        ("size", "模型文件大小不匹配"),
        ("hash", "模型文件校验失败"),
    ],
)
def test_rejects_missing_truncated_or_changed_model(
    tmp_path: Path,
    mutation: str,
    message: str,
) -> None:
    model_dir, reference_audio, genie_data_dir, manifest = _fixture_assets(tmp_path)
    model_path = model_dir / "model.onnx"
    if mutation == "missing":
        model_path.unlink()
    elif mutation == "size":
        model_path.write_bytes(b"short")
    else:
        changed = b"changed-onnx-fixtur"
        assert len(changed) == manifest["model.onnx"].size
        model_path.write_bytes(changed)

    with pytest.raises(GenieAssetConfigurationError, match=message) as caught:
        validate_genie_assets(
            model_dir,
            reference_audio,
            genie_data_dir,
            model_manifest=manifest,
            reference_sha256=_sha256(reference_audio.read_bytes()),
        )

    assert "model.onnx" in str(caught.value)
    assert str(tmp_path) not in str(caught.value)


def test_rejects_wrong_reference_audio_hash_without_leaking_path(tmp_path: Path) -> None:
    model_dir, reference_audio, genie_data_dir, manifest = _fixture_assets(tmp_path)

    with pytest.raises(GenieAssetConfigurationError, match="参考音频校验失败") as caught:
        validate_genie_assets(
            model_dir,
            reference_audio,
            genie_data_dir,
            model_manifest=manifest,
            reference_sha256="0" * 64,
        )

    assert str(tmp_path) not in str(caught.value)


def test_rejects_missing_chinese_runtime_resource(tmp_path: Path) -> None:
    model_dir, reference_audio, genie_data_dir, manifest = _fixture_assets(tmp_path)
    (genie_data_dir / "speaker_encoder.onnx").unlink()

    with pytest.raises(GenieAssetConfigurationError, match="中文运行资源缺失") as caught:
        validate_genie_assets(
            model_dir,
            reference_audio,
            genie_data_dir,
            model_manifest=manifest,
            reference_sha256=_sha256(reference_audio.read_bytes()),
        )

    assert "speaker_encoder.onnx" in str(caught.value)
    assert str(tmp_path) not in str(caught.value)
