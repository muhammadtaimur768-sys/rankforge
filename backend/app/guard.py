"""Rule-based safety pre-filter. Runs before any LLM call, so blocked requests cost $0."""
import re

INJECTION_PATTERNS = [
    r"\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(previous|prior|above|earlier|all|your|system|the)\b.{0,30}\b(instructions?|rules?|prompts?|guidelines?|directives?)",
    r"\b(reveal|show|print|repeat|output|leak|tell me|display|dump)\b.{0,30}\b(system prompt|your prompt|hidden prompt|your instructions|initial instructions|developer message)",
    r"\bwhat (is|are) your (system prompt|instructions)\b",
    r"\b(you are now|from now on you are|act as|pretend (to be|you are)|roleplay as)\b.{0,40}\b(dan|unrestricted|unfiltered|jailbroken|evil|no (rules|limits|restrictions))",
    r"\b(developer|god|admin|debug|jailbreak)\s+mode\b",
    r"\bjailbreak\b",
    r"\bdo anything now\b",
    r"<\|?(im_start|im_end|system)\|?>|\[/?(system|inst)\]|^\s*system\s*:",
    r"\bnew instructions?\s*:",
]

CROSS_USER_PATTERNS = [
    r"\b(other|another|all|every|different)\s+(users?|customers?|clients?|accounts?)('s|s')?\b.{0,40}\b(data|articles?|memor(y|ies)|info|information|keywords?|history|chats?|details|stats)",
    r"\b(data|articles?|memor(y|ies)|history|chats?|keywords?)\b.{0,30}\b(of|from|belonging to)\s+(user|account)[\s_-]*(id)?\s*[:=#]?\s*\S+",
    r"\b(show|give|see|get|read|access|fetch|list|tell|view|open)\b.{0,40}\b(user|account)[\s_-]*(id)?\s*[:=#]?\s*['\"]?[\w-]+['\"]?'s\b",
    r"\b(switch|change|set)\b.{0,15}\buser_?id\b",
    r"\b(dump|export|list)\b.{0,20}\b(the )?(database|all tables|every user)",
]

_inj = [re.compile(p, re.I | re.M) for p in INJECTION_PATTERNS]
_cross = [re.compile(p, re.I) for p in CROSS_USER_PATTERNS]

REFUSE_INJECTION = (
    "I can't do that. I'm RankForge, your SEO & affiliate content assistant, and I don't change my "
    "rules or reveal internal instructions. I can help you research keywords, write and fact-check "
    "articles, add affiliate links, publish, and track rankings and clicks."
)
REFUSE_CROSS_USER = (
    "I can't access other users' data. Every RankForge workspace is private, so I can only work with "
    "your own articles, keywords, and memory. Want me to show your articles or performance instead?"
)


def check(message: str) -> tuple[bool, str | None, str | None]:
    """Return (allowed, refusal_text, reason)."""
    for p in _inj:
        if p.search(message):
            return False, REFUSE_INJECTION, "prompt_injection"
    for p in _cross:
        if p.search(message):
            return False, REFUSE_CROSS_USER, "cross_user"
    return True, None, None


AFFIRMATIVE = re.compile(
    r"^\s*(yes|yeah|yep|yup|y|sure|ok|okay|confirm(ed)?|go ahead|do it|proceed|please do|approved?|"
    r"publish it|delete it|go for it|absolutely|definitely|correct|that'?s right)\b",
    re.I,
)


def is_affirmative(message: str) -> bool:
    return bool(AFFIRMATIVE.search(message or ""))


# Cheap gate: only run the memory-extraction LLM when the user seems to share facts about themselves.
MEMORY_HINT = re.compile(
    r"\b(my|i am|i'm|im|i run|i own|i have|i sell|i write|i prefer|i like|i want|i need|i use|we|we're|our|"
    r"call me|name is|prefer|remember|forget|always|never|audience|niche|tone|affiliate|amazon associates|"
    r"website|blog|domain|site is|based in|language)\b",
    re.I,
)


def has_memory_hint(message: str) -> bool:
    return bool(MEMORY_HINT.search(message))
