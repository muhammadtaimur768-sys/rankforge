from langchain_anthropic import ChatAnthropic

from .config import AGENT_MAX_TOKENS, ANTHROPIC_API_KEY, MODEL


def make_llm(max_tokens: int = AGENT_MAX_TOKENS, effort: str = "low") -> ChatAnthropic:
    # Haiku 5.5: thinking is on by default. We disable it (allowed at effort <= high) to
    # cut output tokens and latency, and so trimmed history never has to replay thinking blocks.
    # No temperature/top_p: non-default sampling params return 400 on Haiku 5.5.
    return ChatAnthropic(
        model=MODEL,
        api_key=ANTHROPIC_API_KEY,
        max_tokens=max_tokens,
        thinking={"type": "disabled"},
        effort=effort,
        max_retries=2,
        default_request_timeout=60,
    )


agent_llm = make_llm()
writer_llm = make_llm(max_tokens=2600, effort="medium")
memory_llm = make_llm(max_tokens=200, effort="low")


def text_of(msg) -> str:
    """Extract plain text from an AIMessage whose content may be a list of blocks."""
    c = msg.content
    if isinstance(c, str):
        return c
    return "".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
