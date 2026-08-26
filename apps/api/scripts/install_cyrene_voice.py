"""Safely install the one audited Cyrene GPT-SoVITS reference clip.

The command reads one hash-pinned WAV from the user-provided archive. It never
extracts the full corpus and never installs model weights or executable code.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import tempfile
import wave
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath

VOICE_ATTRIBUTION = (
    "GPT-SOVITS项目作者为花儿不哭，推理包作者为红血球AE3803和白菜工厂1145号员工，"
    "自练作者为KearDawn"
)


@dataclass(frozen=True)
class VoiceReferenceSpec:
    filename: str
    transcript: str
    sha256: str
    channels: int
    sample_rate: int
    sample_width: int
    min_duration_seconds: float
    max_duration_seconds: float
    max_file_bytes: int


CYRENE_REFERENCE_SPEC = VoiceReferenceSpec(
    filename="6dfbeee4e5c7441f.wav",
    transcript="能在梦里听见朦胧的神谕，还在它的指引下前行…人家也觉得很神奇呢。",
    sha256="C4D72E084DBDA5A8AECEAAFF1094656B9A6B207E46BA7024B47AFC8B61A755C6",
    channels=1,
    sample_rate=48_000,
    sample_width=2,
    min_duration_seconds=3.0,
    max_duration_seconds=10.0,
    max_file_bytes=2_000_000,
)


@dataclass(frozen=True)
class VoiceInstallReport:
    wav_path: Path
    metadata_path: Path
    sha256: str
    duration_seconds: float
    source_entry: str


def _normalized_safe_entry(name: str) -> PurePosixPath:
    normalized = name.replace("\\", "/")
    candidate = PurePosixPath(normalized)
    if (
        candidate.is_absolute()
        or not candidate.parts
        or ".." in candidate.parts
        or any(":" in part for part in candidate.parts)
    ):
        raise ValueError("selected archive entry has an unsafe path")
    return candidate


def _select_entry(
    archive: zipfile.ZipFile,
    spec: VoiceReferenceSpec,
) -> zipfile.ZipInfo:
    matches: list[zipfile.ZipInfo] = []
    for info in archive.infolist():
        if info.is_dir():
            continue
        normalized = PurePosixPath(info.filename.replace("\\", "/"))
        if normalized.name == spec.filename:
            _normalized_safe_entry(info.filename)
            matches.append(info)
    if len(matches) != 1:
        raise ValueError("archive must contain exactly one selected reference WAV")
    return matches[0]


def _validate_wav(
    content: bytes,
    spec: VoiceReferenceSpec,
) -> tuple[int, float]:
    digest = hashlib.sha256(content).hexdigest().upper()
    if digest != spec.sha256.upper():
        raise ValueError("selected reference WAV failed SHA-256 verification")

    try:
        with wave.open(io.BytesIO(content), "rb") as audio:
            channels = audio.getnchannels()
            sample_width = audio.getsampwidth()
            sample_rate = audio.getframerate()
            frame_count = audio.getnframes()
    except (EOFError, wave.Error) as exc:
        raise ValueError("selected reference is not a valid PCM WAV") from exc

    if channels != spec.channels:
        raise ValueError("selected reference WAV has unexpected channel count")
    if sample_width != spec.sample_width:
        raise ValueError("selected reference WAV has unexpected sample width")
    if sample_rate != spec.sample_rate:
        raise ValueError("selected reference WAV has unexpected sample rate")
    duration_seconds = frame_count / sample_rate
    if not spec.min_duration_seconds <= duration_seconds <= spec.max_duration_seconds:
        raise ValueError("selected reference WAV has unexpected duration")
    return frame_count, duration_seconds


def _write_temporary(directory: Path, suffix: str, content: bytes) -> Path:
    with tempfile.NamedTemporaryFile(
        mode="wb",
        prefix=".cyrene-reference-",
        suffix=suffix,
        dir=directory,
        delete=False,
    ) as temporary:
        temporary.write(content)
        temporary.flush()
        os.fsync(temporary.fileno())
        return Path(temporary.name)


def install_cyrene_voice(
    zip_path: Path,
    output_directory: Path,
    *,
    spec: VoiceReferenceSpec = CYRENE_REFERENCE_SPEC,
) -> VoiceInstallReport:
    """Validate and atomically replace the local Cyrene reference artifacts."""
    if not zip_path.is_absolute() or not output_directory.is_absolute():
        raise ValueError("ZIP and output paths must be absolute")
    if not zip_path.is_file():
        raise ValueError("reference ZIP does not exist")

    try:
        with zipfile.ZipFile(zip_path, "r") as archive:
            info = _select_entry(archive, spec)
            if info.file_size > spec.max_file_bytes:
                raise ValueError("selected reference WAV exceeds the size limit")
            with archive.open(info, "r") as source:
                content = source.read(spec.max_file_bytes + 1)
    except zipfile.BadZipFile as exc:
        raise ValueError("reference archive is not a valid ZIP") from exc

    if len(content) > spec.max_file_bytes or len(content) != info.file_size:
        raise ValueError("selected reference WAV exceeds the size limit")
    frame_count, duration_seconds = _validate_wav(content, spec)
    digest = hashlib.sha256(content).hexdigest().upper()

    metadata = {
        "format_version": 1,
        "voice": "cyrene",
        "provider": "gpt_sovits",
        "filename": "cyrene-reference.wav",
        "source_archive": zip_path.name,
        "source_entry": info.filename.replace("\\", "/"),
        "source_filename": spec.filename,
        "sha256": digest,
        "transcript": spec.transcript,
        "attribution": VOICE_ATTRIBUTION,
        "wav": {
            "channels": spec.channels,
            "sample_rate": spec.sample_rate,
            "sample_width_bytes": spec.sample_width,
            "frame_count": frame_count,
            "duration_seconds": round(duration_seconds, 6),
        },
    }
    metadata_bytes = (
        json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")

    output_directory.mkdir(parents=True, exist_ok=True)
    wav_path = output_directory / "cyrene-reference.wav"
    metadata_path = output_directory / "cyrene-reference.json"
    temporary_paths: list[Path] = []
    try:
        temporary_wav = _write_temporary(output_directory, ".wav.tmp", content)
        temporary_paths.append(temporary_wav)
        temporary_metadata = _write_temporary(
            output_directory,
            ".json.tmp",
            metadata_bytes,
        )
        temporary_paths.append(temporary_metadata)
        os.replace(temporary_wav, wav_path)
        temporary_paths.remove(temporary_wav)
        os.replace(temporary_metadata, metadata_path)
        temporary_paths.remove(temporary_metadata)
    finally:
        for temporary_path in temporary_paths:
            temporary_path.unlink(missing_ok=True)

    return VoiceInstallReport(
        wav_path=wav_path,
        metadata_path=metadata_path,
        sha256=digest,
        duration_seconds=duration_seconds,
        source_entry=metadata["source_entry"],
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install the audited Cyrene GPT-SoVITS reference WAV",
    )
    parser.add_argument("--zip", required=True, type=Path, dest="zip_path")
    parser.add_argument("--output", required=True, type=Path, dest="output_directory")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    report = install_cyrene_voice(args.zip_path, args.output_directory)
    print(
        json.dumps(
            {**asdict(report), "wav_path": str(report.wav_path), "metadata_path": str(report.metadata_path)},
            ensure_ascii=False,
            indent=2,
        ),
    )
    print(VOICE_ATTRIBUTION)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
