class VoiceNotConfiguredError(RuntimeError):
    """MiniMax voice output is not configured for this deployment."""


class VoiceProviderError(RuntimeError):
    """MiniMax rejected or failed a synthesis request."""
