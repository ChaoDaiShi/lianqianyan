from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Mapping


@dataclass(frozen=True)
class AssetFingerprint:
    size: int
    sha256: str


CYRENE_GENIE_MODEL_FILES: Mapping[str, AssetFingerprint] = MappingProxyType(
    {
        "prompt_encoder_fp16.bin": AssetFingerprint(
            size=44_262_912,
            sha256="592C5E34BC8B728992308416F8D6BE89E811199E190FDD5D8B83270D8CD45074",
        ),
        "prompt_encoder_fp32.onnx": AssetFingerprint(
            size=44_464,
            sha256="C4A3D8C1E385A17AECB7BD9C5EDE5707BA390F85C3EB49B388DEEAAAF53D2748",
        ),
        "t2s_encoder_fp32.bin": AssetFingerprint(
            size=11_465_732,
            sha256="430398D8A36A5729D91C133EBF8AB20E537BB1A323C79F98BA4A01053116CCCB",
        ),
        "t2s_encoder_fp32.onnx": AssetFingerprint(
            size=14_568,
            sha256="F6EB1ACD47C8E6D36B777886981A49122E8E070A5EB9888D458FB188DC139F75",
        ),
        "t2s_first_stage_decoder_fp32.onnx": AssetFingerprint(
            size=416_803,
            sha256="868F395999508905128C5325C5DB4F4B37B2E70E04D6E2719FEC64CBB60EE7F9",
        ),
        "t2s_shared_fp16.bin": AssetFingerprint(
            size=153_413_634,
            sha256="6128DCE13CC813B333DC546588D60552A1DCC02863143022C4F5538EA2A6D4D2",
        ),
        "t2s_stage_decoder_fp32.onnx": AssetFingerprint(
            size=417_625,
            sha256="3F02881C517423DEB610F86D5441BD9825937C5069F3887CACEFA1E9DC403B0D",
        ),
        "vits_fp16.bin": AssetFingerprint(
            size=124_345_856,
            sha256="63920411CA14E7E5F0C2BD02797863220E54A3EAC98FE39314D9A6B9A809380D",
        ),
        "vits_fp32.onnx": AssetFingerprint(
            size=1_611_210,
            sha256="2F918E08A1BFECC568DE4CC5DC96135CB8BAF37A07F4EB4EC9258A4854FCD3F3",
        ),
    }
)

CYRENE_REFERENCE_SHA256 = (
    "EB9F7564AEDCE832428623E6968EF206ABB5115B965FBBFF9C1B995229C17AA1"
)
CYRENE_REFERENCE_TRANSCRIPT = "能在梦里听见朦胧的神谕。"

REQUIRED_CHINESE_RUNTIME_RESOURCES = (
    "G2P/ChineseG2P/opencpop-strict.txt",
    "G2P/ChineseG2P/polyphonic.pickle",
    "chinese-hubert-base/chinese-hubert-base.onnx",
    "chinese-hubert-base/chinese-hubert-base_weights_fp16.bin",
    "speaker_encoder.onnx",
)


class GenieAssetConfigurationError(ValueError):
    """A sanitized Genie asset validation failure safe for public logs."""


@dataclass(frozen=True)
class GenieAssetValidationReport:
    model_file_count: int
    model_bytes: int
    reference_sha256: str
    runtime_resource_count: int


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest().upper()


def _require_absolute(path: Path, label: str) -> Path:
    if not path.is_absolute():
        raise GenieAssetConfigurationError(f"{label}必须使用绝对路径")
    return path


def validate_genie_assets(
    model_dir: Path,
    reference_audio: Path,
    genie_data_dir: Path,
    *,
    model_manifest: Mapping[str, AssetFingerprint] = CYRENE_GENIE_MODEL_FILES,
    reference_sha256: str = CYRENE_REFERENCE_SHA256,
) -> GenieAssetValidationReport:
    model_dir = _require_absolute(Path(model_dir), "模型目录")
    reference_audio = _require_absolute(Path(reference_audio), "参考音频")
    genie_data_dir = _require_absolute(Path(genie_data_dir), "GenieData目录")

    if not model_dir.is_dir():
        raise GenieAssetConfigurationError("模型目录不存在")
    if not reference_audio.is_file():
        raise GenieAssetConfigurationError("参考音频不存在")
    if not genie_data_dir.is_dir():
        raise GenieAssetConfigurationError("GenieData目录不存在")

    total_model_bytes = 0
    for filename, fingerprint in model_manifest.items():
        if Path(filename).name != filename:
            raise GenieAssetConfigurationError("模型清单文件名无效")
        model_path = model_dir / filename
        if not model_path.is_file():
            raise GenieAssetConfigurationError(f"模型文件缺失：{filename}")
        actual_size = model_path.stat().st_size
        if actual_size != fingerprint.size:
            raise GenieAssetConfigurationError(f"模型文件大小不匹配：{filename}")
        if sha256_file(model_path) != fingerprint.sha256.upper():
            raise GenieAssetConfigurationError(f"模型文件校验失败：{filename}")
        total_model_bytes += actual_size

    actual_reference_sha = sha256_file(reference_audio)
    if actual_reference_sha != reference_sha256.upper():
        raise GenieAssetConfigurationError("参考音频校验失败")

    for relative_path in REQUIRED_CHINESE_RUNTIME_RESOURCES:
        resource = genie_data_dir / Path(relative_path)
        if not resource.is_file() or resource.stat().st_size == 0:
            raise GenieAssetConfigurationError(f"中文运行资源缺失：{relative_path}")

    return GenieAssetValidationReport(
        model_file_count=len(model_manifest),
        model_bytes=total_model_bytes,
        reference_sha256=actual_reference_sha,
        runtime_resource_count=len(REQUIRED_CHINESE_RUNTIME_RESOURCES),
    )
