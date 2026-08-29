"""MiniMax T2A v2 语音合成 provider。

通过 MiniMax 开放平台 HTTP API 完成语音输出，替换本地 Genie-TTS /
GPT-SoVITS 输出链路：密钥只保存在服务端，前端继续消费
`/api/voice/synthesize` 返回的音频字节。
"""

from __future__ import annotations

import time

import httpx

from app.core.config import Settings
from app.voice.models import SynthesizedVoiceAudio
from app.voice.gpt_sovits import VoiceNotConfiguredError, VoiceProviderError

T2A_URL = "https://api.minimax.chat/v1/t2a_v2"
DEFAULT_MODEL = "speech-02-hd"
DEFAULT_VOICE_ID = "female-shaonv"
SUCCESS_STATUS = 0


class MiniMaxTTSProvider:
    provider_name = "minimax"

    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = (settings.minimax_api_key or "").strip()
        self._group_id = (settings.minimax_group_id or "").strip()
        self._model = (settings.minimax_model or "").strip() or DEFAULT_MODEL
        self._voice_id = (settings.minimax_voice_id or "").strip() or DEFAULT_VOICE_ID
        self._timeout = settings.minimax_timeout
        self._transport = transport

    async def synthesize(self, text: str) -> SynthesizedVoiceAudio:
        cleaned = (text or "").strip()
        if not self._api_key or not self._group_id:
            raise VoiceNotConfiguredError("MiniMax 语音服务未配置")
        if not cleaned:
            raise VoiceProviderError("语音内容为空")

        payload = {
            "model": self._model,
            "text": cleaned,
            "stream": False,
            "voice_setting": {
                "voice_id": self._voice_id,
                "speed": 1.0,
                "vol": 1.0,
                "pitch": 0,
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
                "channel": 1,
            },
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                transport=self._transport,
                follow_redirects=False,
            ) as client:
                response = await client.post(
                    f"{T2A_URL}?GroupId={self._group_id}",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise VoiceProviderError("MiniMax 语音服务暂时不可用") from exc

        base_resp = result.get("base_resp") if isinstance(result, dict) else None
        if not isinstance(base_resp, dict) or base_resp.get("status_code") != SUCCESS_STATUS:
            message = (
                base_resp.get("status_msg", "verification failed")
                if isinstance(base_resp, dict)
                else "MiniMax 返回了无效响应"
            )
            raise VoiceProviderError(f"MiniMax 语音合成失败：{message}")

        audio_hex = (result.get("data") or {}).get("audio")
        if not isinstance(audio_hex, str) or not audio_hex:
            raise VoiceProviderError("MiniMax 未返回音频数据")
        try:
            audio_bytes = bytes.fromhex(audio_hex)
        except ValueError as exc:
            raise VoiceProviderError("MiniMax 返回的音频数据无法解析") from exc
        if not audio_bytes:
            raise VoiceProviderError("MiniMax 返回的音频为空")

        return SynthesizedVoiceAudio(content=audio_bytes, media_type="audio/mpeg")
