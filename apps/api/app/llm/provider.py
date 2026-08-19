"""统一 LLM Provider 抽象。

第一阶段仅保留抽象契约与 Provider 注册表，不实现真正的 Agent。
未来可接入 OpenAI-compatible API / DeepSeek / Qwen 等兼容模型。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class LLMMessage:
    """一条对话消息。"""

    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class LLMResult:
    """一次模型调用的结果。"""

    content: str
    usage: dict = field(default_factory=dict)


class BaseLLMProvider(ABC):
    """LLM Provider 统一接口。"""

    @abstractmethod
    async def chat(self, messages: list[LLMMessage], **kwargs) -> LLMResult:
        """发送一组消息并返回模型回复。"""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider 名称。"""


class BaseProviderRegistry:
    """Provider 注册表 —— 通过名称获取 Provider 实例。"""

    _providers: dict[str, BaseLLMProvider] = {}

    @classmethod
    def register(cls, provider: BaseLLMProvider) -> None:
        cls._providers[provider.name] = provider

    @classmethod
    def get(cls, name: str) -> BaseLLMProvider | None:
        return cls._providers.get(name)


# 未来接入示例（本轮不启用）：
#   OpenAIClient（OpenAI-compatible：可指向 DeepSeek / Qwen 的 base_url）
#   DeepSeekClient
#   QwenClient
