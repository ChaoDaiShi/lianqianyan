from __future__ import annotations

import hashlib
import io
import json
import wave
import zipfile
from pathlib import Path

import pytest

from scripts.install_cyrene_voice import (
    VoiceReferenceSpec,
    install_cyrene_voice,
)


def make_wav(*, seconds: float = 0.05) -> bytes:
    output = io.BytesIO()
    frame_count = int(48_000 * seconds)
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(48_000)
        audio.writeframes(b"\x00\x00" * frame_count)
    return output.getvalue()


def make_spec(wav_bytes: bytes, **overrides: object) -> VoiceReferenceSpec:
    values: dict[str, object] = {
        "filename": "selected.wav",
        "transcript": "这是测试参考音频。",
        "sha256": hashlib.sha256(wav_bytes).hexdigest().upper(),
        "channels": 1,
        "sample_rate": 48_000,
        "sample_width": 2,
        "min_duration_seconds": 0.01,
        "max_duration_seconds": 1.0,
        "max_file_bytes": 1_000_000,
    }
    values.update(overrides)
    return VoiceReferenceSpec(**values)


def write_zip(path: Path, entries: dict[str, bytes]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)


def test_installs_only_the_hash_pinned_nested_unicode_wav(tmp_path: Path) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "昔涟参考音频.zip"
    output_directory = tmp_path / "voice-output"
    write_zip(
        archive_path,
        {
            "昔涟/参考音频/selected.wav": wav_bytes,
            "昔涟/参考音频/unrelated.wav": b"not selected",
        },
    )

    report = install_cyrene_voice(
        archive_path.resolve(),
        output_directory.resolve(),
        spec=make_spec(wav_bytes),
    )

    installed_wav = output_directory / "cyrene-reference.wav"
    metadata_path = output_directory / "cyrene-reference.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    assert report.wav_path == installed_wav
    assert report.metadata_path == metadata_path
    assert installed_wav.read_bytes() == wav_bytes
    assert metadata["source_entry"] == "昔涟/参考音频/selected.wav"
    assert metadata["sha256"] == hashlib.sha256(wav_bytes).hexdigest().upper()
    assert metadata["transcript"] == "这是测试参考音频。"
    assert metadata["attribution"] == (
        "GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，"
        "自练作者为KearDawn"
    )


@pytest.mark.parametrize("relative_argument", ["zip", "output"])
def test_requires_absolute_input_and_output_paths(
    tmp_path: Path,
    relative_argument: str,
) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "audio.zip"
    output_directory = tmp_path / "output"
    write_zip(archive_path, {"selected.wav": wav_bytes})

    zip_argument = Path("audio.zip") if relative_argument == "zip" else archive_path.resolve()
    output_argument = Path("output") if relative_argument == "output" else output_directory.resolve()

    with pytest.raises(ValueError, match="absolute"):
        install_cyrene_voice(
            zip_argument,
            output_argument,
            spec=make_spec(wav_bytes),
        )


def test_rejects_duplicate_selected_leaf_names(tmp_path: Path) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "audio.zip"
    write_zip(
        archive_path,
        {
            "folder-a/selected.wav": wav_bytes,
            "folder-b/selected.wav": wav_bytes,
        },
    )

    with pytest.raises(ValueError, match="exactly one"):
        install_cyrene_voice(
            archive_path.resolve(),
            (tmp_path / "output").resolve(),
            spec=make_spec(wav_bytes),
        )


def test_rejects_wrong_hash_and_preserves_existing_outputs(tmp_path: Path) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "audio.zip"
    output_directory = tmp_path / "output"
    output_directory.mkdir()
    installed_wav = output_directory / "cyrene-reference.wav"
    metadata_path = output_directory / "cyrene-reference.json"
    installed_wav.write_bytes(b"existing-wav")
    metadata_path.write_text("existing-metadata", encoding="utf-8")
    write_zip(archive_path, {"selected.wav": wav_bytes})

    with pytest.raises(ValueError, match="SHA-256"):
        install_cyrene_voice(
            archive_path.resolve(),
            output_directory.resolve(),
            spec=make_spec(wav_bytes, sha256="0" * 64),
        )

    assert installed_wav.read_bytes() == b"existing-wav"
    assert metadata_path.read_text(encoding="utf-8") == "existing-metadata"
    assert set(output_directory.iterdir()) == {installed_wav, metadata_path}


def test_rejects_an_oversized_selected_entry_before_reading_it(tmp_path: Path) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "audio.zip"
    write_zip(archive_path, {"selected.wav": wav_bytes})

    with pytest.raises(ValueError, match="size limit"):
        install_cyrene_voice(
            archive_path.resolve(),
            (tmp_path / "output").resolve(),
            spec=make_spec(wav_bytes, max_file_bytes=len(wav_bytes) - 1),
        )


def test_rejects_an_unsafe_selected_entry_path(tmp_path: Path) -> None:
    wav_bytes = make_wav()
    archive_path = tmp_path / "audio.zip"
    write_zip(archive_path, {"../selected.wav": wav_bytes})

    with pytest.raises(ValueError, match="unsafe"):
        install_cyrene_voice(
            archive_path.resolve(),
            (tmp_path / "output").resolve(),
            spec=make_spec(wav_bytes),
        )
