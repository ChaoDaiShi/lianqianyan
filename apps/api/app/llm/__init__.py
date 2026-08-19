"""LLM Provider 抽象模块。"""

from app.llm.provider import (
    BaseLLMProvider,
    BaseProviderRegistry,
    LLMMessage,
    LLMResult,
)


def get_llm_provider() -> BaseLLMProvider:
    """返回当前使用的 LLM Provider（演示默认 Mock，接口真实）。

    比赛演示阶段没有真实 API Key，默认返回 `MockTutorProvider`（确定性、
    上下文感知）；未来接入真实模型时，在此按环境配置返回对应 Provider
    （OpenAI-compatible / DeepSeek / Qwen），业务代码（TutorService）无需改动。
    """
    from app.llm.mock_provider import MockTutorProvider

    return MockTutorProvider()


__all__ = [
    "BaseLLMProvider",
    "BaseProviderRegistry",
    "LLMMessage",
    "LLMResult",
    "get_llm_provider",
]
