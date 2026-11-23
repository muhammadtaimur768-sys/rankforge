"""Postgres access: one async pool shared by the LangGraph checkpointer and app tables."""
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from .config import DATABASE_URL

pool: AsyncConnectionPool | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS rf_users (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rf_memory (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS rf_articles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    keyword TEXT,
    meta_description TEXT,
    content_md TEXT NOT NULL,
    word_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    fact_checks JSONB DEFAULT '[]'::jsonb,
    views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS rf_articles_user ON rf_articles(user_id);
CREATE TABLE IF NOT EXISTS rf_links (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    article_id INT REFERENCES rf_articles(id) ON DELETE CASCADE,
    anchor TEXT NOT NULL,
    url TEXT NOT NULL,
    clicks INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rf_events (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    article_id INT,
    kind TEXT NOT NULL,           -- 'view' | 'click'
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rf_events_user ON rf_events(user_id, created_at);
CREATE TABLE IF NOT EXISTS rf_keywords (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    seed TEXT NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rf_ranks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    domain TEXT NOT NULL,
    position INT,
    checked_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rf_pending (
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    article_id INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, action, article_id)
);
CREATE TABLE IF NOT EXISTS rf_chat_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    message TEXT,
    reply TEXT,
    tool_calls JSONB DEFAULT '[]'::jsonb,
    tokens_in INT DEFAULT 0,
    tokens_out INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    blocked BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rf_chat_logs_user ON rf_chat_logs(user_id, thread_id);
"""


async def init_pool() -> AsyncConnectionPool:
    global pool
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set (use a Neon or Supabase Postgres URL)")
    pool = AsyncConnectionPool(
        conninfo=DATABASE_URL,
        min_size=1,
        max_size=10,
        open=False,
        # autocommit + dict_row are required by the LangGraph Postgres checkpointer;
        # prepare_threshold=None keeps it working behind pgbouncer/Supabase poolers.
        kwargs={"autocommit": True, "prepare_threshold": None, "row_factory": dict_row},
        check=AsyncConnectionPool.check_connection,
    )
    await pool.open(wait=True, timeout=30)
    async with pool.connection() as conn:
        await conn.execute(SCHEMA)
    return pool


async def fetch(sql: str, *params) -> list[dict]:
    async with pool.connection() as conn:
        cur = await conn.execute(sql, params)
        return await cur.fetchall() if cur.description else []


async def fetchone(sql: str, *params) -> dict | None:
    rows = await fetch(sql, *params)
    return rows[0] if rows else None


async def execute(sql: str, *params) -> None:
    async with pool.connection() as conn:
        await conn.execute(sql, params)


# ---------- long-term memory (per user_id) ----------

async def get_memory(user_id: str) -> dict[str, str]:
    rows = await fetch("SELECT key, value FROM rf_memory WHERE user_id=%s ORDER BY key", user_id)
    return {r["key"]: r["value"] for r in rows}


async def set_memory(user_id: str, key: str, value: str) -> None:
    await execute(
        """INSERT INTO rf_memory (user_id, key, value) VALUES (%s, %s, %s)
           ON CONFLICT (user_id, key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        user_id, key, value,
    )


async def delete_memory(user_id: str, key: str) -> None:
    await execute("DELETE FROM rf_memory WHERE user_id=%s AND key=%s", user_id, key)
