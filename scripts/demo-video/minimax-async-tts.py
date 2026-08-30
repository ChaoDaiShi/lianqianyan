"""Generate the competition narration with MiniMax asynchronous TTS.

Secrets are loaded from apps/api/.env and are never printed or written to the
output metadata. The completed audio file is downloaded immediately because
MiniMax generated files have a limited retrieval window.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tarfile
import time
from io import BytesIO
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx


SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE = SCRIPT_DIR.parents[1]
TIMELINE_PATH = SCRIPT_DIR / "timeline.json"
ENV_PATH = WORKSPACE / "apps" / "api" / ".env"
OUTPUT_ROOT = WORKSPACE / "demo_video_20260830"
AUDIO_DIR = OUTPUT_ROOT / "audio"
AUDIO_PATH = AUDIO_DIR / "narration.mp3"
METADATA_PATH = AUDIO_DIR / "minimax-task.json"
NARRATION_PATH = OUTPUT_ROOT / "旁白稿.md"


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_timeline() -> list[dict[str, Any]]:
    value = json.loads(TIMELINE_PATH.read_text(encoding="utf-8"))
    if not isinstance(value, list) or not value:
        raise RuntimeError("timeline.json must contain at least one scene")
    return value


def build_narration(timeline: list[dict[str, Any]]) -> str:
    return "\n".join(str(scene["narration"]).strip() for scene in timeline).strip()


def write_narration_markdown(timeline: list[dict[str, Any]]) -> None:
    lines = [
        "# 涟千言三分钟功能演示旁白稿",
        "",
        "> 配音由 MiniMax 异步长文本语音合成生成；镜头等待时间会在剪辑中移除。",
        "",
    ]
    cursor = 0
    for scene in timeline:
        start = cursor
        cursor += int(scene["targetSeconds"])
        lines.extend(
            [
                f"## {start // 60:02d}:{start % 60:02d}–{cursor // 60:02d}:{cursor % 60:02d} {scene['id']}",
                "",
                str(scene["narration"]).strip(),
                "",
            ]
        )
    NARRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    NARRATION_PATH.write_text("\n".join(lines), encoding="utf-8")


def require_setting(values: dict[str, str], name: str) -> str:
    value = (os.environ.get(name) or values.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required MiniMax setting: {name}")
    return value


def ensure_success(payload: dict[str, Any], operation: str) -> None:
    base = payload.get("base_resp")
    if not isinstance(base, dict) or base.get("status_code") != 0:
        status = base.get("status_code") if isinstance(base, dict) else "invalid"
        message = base.get("status_msg") if isinstance(base, dict) else "invalid response"
        raise RuntimeError(f"MiniMax {operation} failed: {status} {message}")


def safe_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def extract_download_url(payload: dict[str, Any]) -> str:
    """Return the signed download URL from a MiniMax file-retrieve response."""
    ensure_success(payload, "file retrieve")
    file_info = payload.get("file")
    if not isinstance(file_info, dict):
        raise RuntimeError("MiniMax file retrieve response did not include file metadata")
    download_url = str(file_info.get("download_url") or "").strip()
    if not download_url:
        raise RuntimeError("MiniMax file retrieve response did not include download_url")
    return download_url


def normalize_audio_payload(payload: bytes, content_type: str) -> bytes:
    """Accept a raw MP3 or safely extract the sole MP3 from MiniMax's tar bundle."""
    mp3_prefixes = {b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}
    if len(payload) >= 1024 and payload[:3] in mp3_prefixes:
        return payload
    if content_type.split(";", 1)[0].strip().lower() not in {
        "application/x-tar",
        "application/tar",
        "application/octet-stream",
    }:
        raise RuntimeError("MiniMax download is neither MP3 nor a supported tar bundle")
    try:
        with tarfile.open(fileobj=BytesIO(payload), mode="r:*") as archive:
            audio_candidates: list[bytes] = []
            for member in archive.getmembers():
                if not member.isfile():
                    continue
                extracted = archive.extractfile(member)
                candidate = extracted.read() if extracted else b""
                if len(candidate) >= 1024 and candidate[:3] in mp3_prefixes:
                    audio_candidates.append(candidate)
            if len(audio_candidates) != 1:
                raise RuntimeError(
                    "MiniMax tar bundle must contain exactly one valid MP3 stream; "
                    f"found {len(audio_candidates)}"
                )
            audio = audio_candidates[0]
    except tarfile.TarError as exc:
        raise RuntimeError("MiniMax download is not a valid tar bundle") from exc
    if len(audio) < 1024 or audio[:3] not in mp3_prefixes:
        raise RuntimeError("MP3 member extracted from MiniMax tar bundle is invalid")
    return audio


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-wait", type=int, default=600)
    parser.add_argument("--task-id", help="Resume an already-created MiniMax async task")
    args = parser.parse_args()

    env_values = load_dotenv(ENV_PATH)
    api_key = require_setting(env_values, "EDUCATION_MINIMAX_API_KEY")
    base_url = (os.environ.get("EDUCATION_MINIMAX_BASE_URL") or env_values.get("EDUCATION_MINIMAX_BASE_URL") or "https://api.minimax.io").rstrip("/")
    group_id = (os.environ.get("EDUCATION_MINIMAX_GROUP_ID") or env_values.get("EDUCATION_MINIMAX_GROUP_ID") or "").strip()
    model = (os.environ.get("EDUCATION_MINIMAX_MODEL") or env_values.get("EDUCATION_MINIMAX_MODEL") or "speech-02-hd").strip()
    voice_id = (os.environ.get("EDUCATION_MINIMAX_VOICE_ID") or env_values.get("EDUCATION_MINIMAX_VOICE_ID") or "female-shaonv").strip()
    timeline = load_timeline()
    narration = build_narration(timeline)
    narration_sha256 = hashlib.sha256(narration.encode("utf-8")).hexdigest()
    write_narration_markdown(timeline)

    safe_summary = {
        "dryRun": args.dry_run,
        "baseHost": httpx.URL(base_url).host,
        "groupIdConfigured": bool(group_id),
        "model": model,
        "voiceId": voice_id,
        "characters": len(narration),
        "narrationSha256": narration_sha256,
        "pollBackoffSeconds": [2, 3, 5, 8, 13],
        "maxWaitSeconds": args.max_wait,
    }
    if args.dry_run:
        print(json.dumps(safe_summary, ensure_ascii=False, indent=2))
        return 0

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    group_params = {"GroupId": group_id} if group_id else None
    create_payload = {
        "model": model,
        "text": narration,
        "language_boost": "Chinese",
        "voice_setting": {"voice_id": voice_id, "speed": 1.04, "vol": 1.0, "pitch": 0},
        "audio_setting": {
            "audio_sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
    }

    started = time.monotonic()
    with httpx.Client(timeout=90.0, follow_redirects=True) as client:
        created: dict[str, Any] = {}
        if args.task_id:
            task_id = args.task_id
            print(json.dumps({"event": "resumed", "taskId": str(task_id)}, ensure_ascii=False), flush=True)
        else:
            response = client.post(
                f"{base_url}/v1/t2a_async_v2",
                params=group_params,
                headers=headers,
                json=create_payload,
            )
            response.raise_for_status()
            created = response.json()
            ensure_success(created, "create")
            task_id = created.get("task_id")
            if task_id is None:
                raise RuntimeError("MiniMax create response did not include task_id")
            print(json.dumps({"event": "created", "taskId": str(task_id)}, ensure_ascii=False), flush=True)

        backoff = [2, 3, 5, 8, 13]
        attempt = 0
        query: dict[str, Any] = {}
        while True:
            if time.monotonic() - started > args.max_wait:
                raise TimeoutError(f"MiniMax task {task_id} exceeded {args.max_wait} seconds")
            delay = 0 if args.task_id and attempt == 0 else backoff[min(attempt, len(backoff) - 1)]
            if delay:
                time.sleep(delay)
            attempt += 1
            query_response = client.get(
                f"{base_url}/v1/query/t2a_async_query_v2",
                params={**(group_params or {}), "task_id": task_id},
                headers=headers,
            )
            query_response.raise_for_status()
            query = query_response.json()
            ensure_success(query, "query")
            status = str(query.get("status") or "").strip().lower()
            print(json.dumps({"event": "poll", "attempt": attempt, "status": status}), flush=True)
            if status == "success":
                break
            if status in {"failed", "expired"}:
                raise RuntimeError(f"MiniMax task {task_id} ended with status {status}")

        file_id = query.get("file_id") or created.get("file_id")
        if file_id is None:
            raise RuntimeError("MiniMax completed task did not include file_id")
        retrieve_response = client.get(
            f"{base_url}/v1/files/retrieve",
            params={**(group_params or {}), "file_id": file_id},
            headers=headers,
        )
        retrieve_response.raise_for_status()
        download_url = extract_download_url(retrieve_response.json())
        audio_response = client.get(download_url)
        audio_response.raise_for_status()
        content_type = audio_response.headers.get("content-type", "unknown")
        downloaded_bytes = audio_response.content
        try:
            audio_bytes = normalize_audio_payload(downloaded_bytes, content_type)
        except RuntimeError as exc:
            content_type = audio_response.headers.get("content-type", "unknown").split(";", 1)[0]
            raise RuntimeError(
                f"{exc} (bytes={len(downloaded_bytes)}, content_type={content_type}, "
                f"prefix={downloaded_bytes[:12].hex()})"
            ) from exc

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    temporary_audio = AUDIO_PATH.with_suffix(".mp3.tmp")
    temporary_audio.write_bytes(audio_bytes)
    temporary_audio.replace(AUDIO_PATH)
    metadata = {
        "createdAt": datetime.now(UTC).isoformat(),
        "taskId": str(task_id),
        "fileId": str(file_id),
        "model": model,
        "voiceId": voice_id,
        "characters": len(narration),
        "usageCharacters": created.get("usage_characters"),
        "pollAttempts": attempt,
        "audioBytes": len(audio_bytes),
        "audioSha256": hashlib.sha256(audio_bytes).hexdigest(),
        "narrationSha256": narration_sha256,
        "downloadedImmediately": True,
    }
    safe_json_write(METADATA_PATH, metadata)
    print(json.dumps({"event": "downloaded", **metadata}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"MiniMax async TTS failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
