import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
MODEL = os.getenv("MODEL", "claude-haiku-5-5")
ADMIN_KEY = os.getenv("ADMIN_KEY", "change-me-admin")
AUTH_SECRET = os.getenv("AUTH_SECRET", "change-me-secret")
# Public URL of the Vercel website, used to build article links
SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")
# Public URL of this API, used to build tracked affiliate links
API_URL = os.getenv("API_URL", "http://localhost:7860").rstrip("/")

# Cost controls
HISTORY_MESSAGES = int(os.getenv("HISTORY_MESSAGES", "14"))
AGENT_MAX_TOKENS = int(os.getenv("AGENT_MAX_TOKENS", "900"))
MAX_TOOL_ROUNDS = int(os.getenv("MAX_TOOL_ROUNDS", "6"))

# Haiku 5.5 pricing (USD per 1M tokens, prompts <= 100K)
PRICE_IN = 0.10
PRICE_OUT = 0.50
