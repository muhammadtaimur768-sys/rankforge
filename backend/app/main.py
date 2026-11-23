import asyncio
import base64
import hashlib
import hmac
import logging
import re
import secrets
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from langchain_core.callbacks import get_usage_metadata_callback
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.errors import GraphRecursionError
from pydantic import BaseModel

from . import db
from .agent import RECURSION_LIMIT, build_graph
from .config import ADMIN_KEY, AUTH_SECRET, PRICE_IN, PRICE_OUT, SITE_URL
from .llm import text_of

log = logging.getLogger("rankforge")
logging.basicConfig(level=logging.INFO)

graph = None
_init_lock = asyncio.Lock()


async def ensure_ready() -> None:
    """Lazy, idempotent startup (serverless platforms may not run ASGI lifespan)."""
    global graph
    if graph is not None:
        return
    async with _init_lock:
        if graph is None:
            pool = await db.init_pool()
            checkpointer = AsyncPostgresSaver(pool)  # short-term memory, keyed by thread_id
            await checkpointer.setup()
            graph = build_graph(checkpointer)
            log.info("RankForge ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_ready()
    except Exception:
        log.exception("startup init failed; will retry on first request")
    yield


app = FastAPI(title="RankForge Agent API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def ready_middleware(request: Request, call_next):
    if request.url.path not in ("/health", "/") and request.method != "OPTIONS":
        try:
            await ensure_ready()
        except Exception as e:
            log.exception("init failed")
            if request.url.path == "/chat":
                return JSONResponse({"reply": "The service is starting up or the database is unreachable. Please retry.",
                                     "tool_calls": [], "tokens": {"in": 0, "out": 0}}, status_code=503)
            return JSONResponse({"error": f"init failed: {type(e).__name__}"}, status_code=503)
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={
        "error": "Invalid request body. Expected JSON: {\"user_id\": str, \"thread_id\": str, \"message\": str}",
        "details": [e.get("msg") for e in exc.errors()][:5],
    })


# ====================================================================== chat core
class ChatIn(BaseModel):
    user_id: str
    thread_id: str
    message: str


_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
_rate: dict[str, deque] = defaultdict(deque)
RATE_PER_MIN = 40
ID_RE = re.compile(r"^[\w.@:+-]{1,128}$")


def _rate_ok(user_id: str) -> bool:
    now, q = time.time(), _rate[user_id]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_PER_MIN:
        return False
    q.append(now)
    return True


async def run_chat(user_id: str, thread_id: str, message: str) -> dict:
    user_id, thread_id, message = (user_id or "").strip(), (thread_id or "").strip(), (message or "").strip()
    empty = {"tool_calls": [], "tokens": {"in": 0, "out": 0}}
    if not ID_RE.match(user_id) or not ID_RE.match(thread_id):
        return {"reply": "Please provide a valid user_id and thread_id (1-128 letters, digits, or _ - . @ :).", **empty}
    if not message:
        return {"reply": "Your message was empty. Ask me to research keywords, write an article, or check performance.", **empty}
    if len(message) > 6000:
        return {"reply": "That message is too long (max 6000 characters). Please shorten it.", **empty}
    if not _rate_ok(user_id):
        return {"reply": "You're sending messages too quickly. Please wait a few seconds and try again.", **empty}

    # Thread key is namespaced by user, so two users with the same thread_id never share history.
    cfg = {"configurable": {"thread_id": f"{user_id}::{thread_id}", "user_id": user_id},
           "recursion_limit": RECURSION_LIMIT}
    hid = str(uuid.uuid4())
    t0 = time.perf_counter()
    reply, tool_calls, err, blocked = "", [], None, False
    tin = tout = 0
    async with _locks[cfg["configurable"]["thread_id"]]:
        with get_usage_metadata_callback() as cb:
            try:
                result = await asyncio.wait_for(
                    graph.ainvoke({"messages": [HumanMessage(content=message, id=hid)]}, cfg), timeout=110)
                msgs = result["messages"]
                start = next((i for i, m in enumerate(msgs) if getattr(m, "id", None) == hid), len(msgs) - 1)
                new = msgs[start + 1:]
                for m in new:
                    if isinstance(m, AIMessage):
                        tool_calls += [{"name": tc["name"], "args": tc["args"]} for tc in m.tool_calls]
                ai = [m for m in new if isinstance(m, AIMessage)]
                blocked = bool(ai and ai[-1].name == "guard")
                reply = next((text_of(m) for m in reversed(ai) if text_of(m).strip()), "")
                if not reply:
                    reply = "Done." if tool_calls else "Sorry, I couldn't produce a reply. Please rephrase."
            except GraphRecursionError:
                err = "recursion_limit"
                reply = "That task needed too many steps. Please break it into smaller requests."
            except asyncio.TimeoutError:
                err = "timeout"
                reply = "That took too long to complete. Please try again or ask for something smaller."
            except Exception as e:  # model/API/db errors never crash the endpoint
                err = f"{type(e).__name__}: {str(e)[:300]}"
                log.exception("chat failed")
                reply = "Sorry, I ran into a temporary problem. Please try again in a moment."
            for usage in cb.usage_metadata.values():
                tin += int(usage.get("input_tokens", 0))
                tout += int(usage.get("output_tokens", 0))
    latency = int((time.perf_counter() - t0) * 1000)
    try:
        await db.execute(
            """INSERT INTO rf_chat_logs (user_id, thread_id, message, reply, tool_calls, tokens_in, tokens_out,
               latency_ms, blocked, error) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            user_id, thread_id, message[:4000], reply[:4000], _json(tool_calls), tin, tout, latency, blocked, err)
    except Exception:
        log.exception("log write failed")
    return {"reply": reply, "tool_calls": tool_calls, "tokens": {"in": tin, "out": tout}}


def _json(o):
    import json
    return json.dumps(o, default=str)


# ====================================================================== grading endpoints
@app.get("/health", response_class=PlainTextResponse)
async def health():
    return "ok"


@app.get("/", response_class=PlainTextResponse)
async def root():
    return "RankForge Agent API. POST /chat, GET /health"


@app.post("/chat")
async def chat(body: ChatIn):
    return await run_chat(body.user_id, body.thread_id, body.message)


@app.get("/go/{link_id}")
async def go(link_id: int):
    row = await db.fetchone("UPDATE rf_links SET clicks=clicks+1 WHERE id=%s RETURNING url, user_id, article_id", link_id)
    if not row:
        return RedirectResponse(SITE_URL, status_code=302)
    await db.execute("INSERT INTO rf_events (user_id, article_id, kind) VALUES (%s,%s,'click')",
                     row["user_id"], row["article_id"])
    return RedirectResponse(row["url"], status_code=302)


# ====================================================================== website auth
class AuthIn(BaseModel):
    username: str
    password: str


def _hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(h).decode()


def _check_pw(pw: str, stored: str) -> bool:
    try:
        salt_b64, _ = stored.split("$", 1)
        return hmac.compare_digest(_hash_pw(pw, base64.b64decode(salt_b64)), stored)
    except Exception:
        return False


def _token(user_id: str) -> str:
    exp = str(int(time.time()) + 30 * 86400)
    payload = f"{user_id}|{exp}"
    sig = hmac.new(AUTH_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}|{sig}".encode()).decode()


def current_user(authorization: str = Header(default="")) -> str:
    try:
        raw = base64.urlsafe_b64decode(authorization.removeprefix("Bearer ").strip().encode()).decode()
        user_id, exp, sig = raw.rsplit("|", 2)
        good = hmac.new(AUTH_SECRET.encode(), f"{user_id}|{exp}".encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, good) and int(exp) > time.time():
            return user_id
    except Exception:
        pass
    raise HTTPException(401, "Not signed in")


@app.post("/api/auth/signup")
async def signup(body: AuthIn):
    u = body.username.strip().lower()
    if not re.fullmatch(r"[a-z0-9_-]{3,32}", u):
        raise HTTPException(400, "Username must be 3-32 characters: a-z, 0-9, _ or -")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await db.fetchone("SELECT 1 FROM rf_users WHERE user_id=%s", u):
        raise HTTPException(409, "Username already taken")
    await db.execute("INSERT INTO rf_users (user_id, password_hash) VALUES (%s,%s)", u, _hash_pw(body.password))
    return {"token": _token(u), "user_id": u}


@app.post("/api/auth/login")
async def login(body: AuthIn):
    u = body.username.strip().lower()
    row = await db.fetchone("SELECT password_hash FROM rf_users WHERE user_id=%s", u)
    if not row or not _check_pw(body.password, row["password_hash"] or ""):
        raise HTTPException(401, "Wrong username or password")
    return {"token": _token(u), "user_id": u}


# ====================================================================== customer workspace
class MeChatIn(BaseModel):
    thread_id: str
    message: str


ARTICLE_COLS = """a.id, a.title, a.slug, a.keyword, a.status, a.word_count, a.views, a.meta_description,
                  a.created_at, a.published_at, COALESCE(SUM(l.clicks),0)::int AS clicks"""


def _with_url(a: dict) -> dict:
    a["url"] = f"{SITE_URL}/site/{a.get('user_id') or ''}/{a['slug']}" if a.get("status") == "published" else None
    return a


async def _stats(uid: str) -> dict:
    row = await db.fetchone(
        """SELECT (SELECT COUNT(*) FROM rf_articles WHERE user_id=%s)::int AS articles,
                  (SELECT COUNT(*) FROM rf_articles WHERE user_id=%s AND status='published')::int AS published,
                  (SELECT COALESCE(SUM(views),0) FROM rf_articles WHERE user_id=%s)::int AS views,
                  (SELECT COALESCE(SUM(clicks),0) FROM rf_links WHERE user_id=%s)::int AS clicks,
                  (SELECT COUNT(*) FROM rf_keywords WHERE user_id=%s)::int AS keywords_researched,
                  (SELECT COUNT(*) FROM rf_chat_logs WHERE user_id=%s)::int AS chats,
                  (SELECT COALESCE(SUM(tokens_in),0) FROM rf_chat_logs WHERE user_id=%s)::int AS tokens_in,
                  (SELECT COALESCE(SUM(tokens_out),0) FROM rf_chat_logs WHERE user_id=%s)::int AS tokens_out""",
        *([uid] * 8))
    return row


@app.get("/api/me")
async def me(uid: str = Depends(current_user)):
    return {"user_id": uid, "memory": await db.get_memory(uid), "stats": await _stats(uid)}


@app.post("/api/me/chat")
async def me_chat(body: MeChatIn, uid: str = Depends(current_user)):
    return await run_chat(uid, body.thread_id, body.message)


@app.get("/api/me/threads")
async def me_threads(uid: str = Depends(current_user)):
    return await db.fetch(
        """SELECT thread_id, (array_agg(message ORDER BY id))[1] AS title, MAX(created_at) AS last_at,
                  COUNT(*)::int AS messages
           FROM rf_chat_logs WHERE user_id=%s GROUP BY thread_id ORDER BY MAX(created_at) DESC LIMIT 50""", uid)


@app.get("/api/me/threads/{thread_id}")
async def me_thread(thread_id: str, uid: str = Depends(current_user)):
    state = await graph.aget_state({"configurable": {"thread_id": f"{uid}::{thread_id}"}})
    out, pending = [], []
    for m in (state.values or {}).get("messages", []):
        if isinstance(m, HumanMessage):
            out.append({"role": "user", "content": m.content if isinstance(m.content, str) else text_of(m),
                        "tool_calls": []})
            pending = []
        elif isinstance(m, AIMessage):
            pending += [{"name": tc["name"], "args": tc["args"]} for tc in m.tool_calls]
            t = text_of(m)
            if t.strip():
                out.append({"role": "assistant", "content": t, "tool_calls": pending})
                pending = []
    return {"thread_id": thread_id, "messages": out}


@app.get("/api/me/articles")
async def me_articles(uid: str = Depends(current_user)):
    rows = await db.fetch(f"""SELECT {ARTICLE_COLS}, a.user_id FROM rf_articles a
                              LEFT JOIN rf_links l ON l.article_id=a.id WHERE a.user_id=%s
                              GROUP BY a.id ORDER BY a.id DESC""", uid)
    return [_with_url(r) for r in rows]


@app.get("/api/me/articles/{article_id}")
async def me_article(article_id: int, uid: str = Depends(current_user)):
    a = await db.fetchone("SELECT * FROM rf_articles WHERE id=%s AND user_id=%s", article_id, uid)
    if not a:
        raise HTTPException(404, "Article not found")
    a["links"] = await db.fetch("SELECT id, anchor, url, clicks FROM rf_links WHERE article_id=%s ORDER BY id", article_id)
    a["clicks"] = sum(link["clicks"] for link in a["links"])
    return _with_url(a)


@app.get("/api/me/keywords")
async def me_keywords(uid: str = Depends(current_user)):
    return await db.fetch("SELECT id, seed, results, created_at FROM rf_keywords WHERE user_id=%s ORDER BY id DESC LIMIT 50", uid)


@app.get("/api/me/ranks")
async def me_ranks(uid: str = Depends(current_user)):
    return await db.fetch("SELECT keyword, domain, position, checked_at FROM rf_ranks WHERE user_id=%s ORDER BY checked_at DESC LIMIT 100", uid)


@app.get("/api/me/performance")
async def me_performance(uid: str = Depends(current_user)):
    daily = await db.fetch(
        """SELECT to_char(d, 'YYYY-MM-DD') AS date,
                  COUNT(e.id) FILTER (WHERE e.kind='view')::int AS views,
                  COUNT(e.id) FILTER (WHERE e.kind='click')::int AS clicks
           FROM generate_series(current_date - 29, current_date, interval '1 day') d
           LEFT JOIN rf_events e ON e.user_id=%s AND e.created_at::date = d::date
           GROUP BY d ORDER BY d""", uid)
    arts = await db.fetch(
        """SELECT a.id, a.title, a.views, COALESCE(SUM(l.clicks),0)::int AS clicks FROM rf_articles a
           LEFT JOIN rf_links l ON l.article_id=a.id WHERE a.user_id=%s GROUP BY a.id ORDER BY a.views DESC""", uid)
    for a in arts:
        a["ctr_pct"] = round(100 * a["clicks"] / a["views"], 1) if a["views"] else 0.0
    return {"daily": daily, "articles": arts}


@app.get("/api/me/memory")
async def me_memory(uid: str = Depends(current_user)):
    return await db.get_memory(uid)


@app.delete("/api/me/memory/{key}")
async def me_memory_delete(key: str, uid: str = Depends(current_user)):
    await db.delete_memory(uid, key)
    return {"ok": True}


# ====================================================================== public affiliate site
async def _site_meta(uid: str) -> dict:
    mem = await db.get_memory(uid)
    return {"site_name": mem.get("site_name") or f"{uid}'s picks", "niche": mem.get("niche")}


@app.get("/api/public/sites")
async def public_sites():
    rows = await db.fetch(
        """SELECT user_id, COUNT(*)::int AS published, MAX(published_at) AS last_published
           FROM rf_articles WHERE status='published' GROUP BY user_id ORDER BY MAX(published_at) DESC LIMIT 50""")
    for r in rows:
        r.update(await _site_meta(r["user_id"]))
    return rows


@app.get("/api/public/site/{uid}")
async def public_site(uid: str):
    arts = await db.fetch(
        """SELECT title, slug, meta_description, keyword, word_count, published_at FROM rf_articles
           WHERE user_id=%s AND status='published' ORDER BY published_at DESC""", uid)
    return {"user_id": uid, **(await _site_meta(uid)), "articles": arts}


@app.get("/api/public/site/{uid}/{slug}")
async def public_article(uid: str, slug: str):
    a = await db.fetchone(
        """UPDATE rf_articles SET views=views+1 WHERE user_id=%s AND slug=%s AND status='published'
           RETURNING id, title, slug, meta_description, content_md, keyword, word_count, published_at, user_id""",
        uid, slug)
    if not a:
        raise HTTPException(404, "Not found")
    await db.execute("INSERT INTO rf_events (user_id, article_id, kind) VALUES (%s,%s,'view')", uid, a["id"])
    return {**a, **(await _site_meta(uid))}


# ====================================================================== admin
def admin(x_admin_key: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_admin_key, ADMIN_KEY):
        raise HTTPException(401, "Bad admin key")


def _cost(tin: int, tout: int) -> float:
    return round(tin / 1e6 * PRICE_IN + tout / 1e6 * PRICE_OUT, 6)


@app.get("/api/admin/overview", dependencies=[Depends(admin)])
async def admin_overview():
    t = await db.fetchone(
        """SELECT (SELECT COUNT(DISTINCT user_id) FROM (SELECT user_id FROM rf_chat_logs UNION SELECT user_id FROM rf_users
                   UNION SELECT user_id FROM rf_articles) u)::int AS users,
                  (SELECT COUNT(*) FROM rf_articles)::int AS articles,
                  (SELECT COUNT(*) FROM rf_articles WHERE status='published')::int AS published,
                  (SELECT COALESCE(SUM(views),0) FROM rf_articles)::int AS views,
                  (SELECT COALESCE(SUM(clicks),0) FROM rf_links)::int AS clicks,
                  COUNT(*)::int AS chats, COALESCE(SUM(tokens_in),0)::int AS tokens_in,
                  COALESCE(SUM(tokens_out),0)::int AS tokens_out,
                  COUNT(*) FILTER (WHERE blocked)::int AS blocked,
                  COUNT(*) FILTER (WHERE error IS NOT NULL)::int AS errors,
                  COALESCE(AVG(latency_ms),0)::int AS avg_latency_ms
           FROM rf_chat_logs""")
    t["cost_usd"] = _cost(t["tokens_in"], t["tokens_out"])
    daily = await db.fetch(
        """SELECT to_char(created_at::date,'YYYY-MM-DD') AS date, COUNT(*)::int AS chats,
                  SUM(tokens_in)::int AS tokens_in, SUM(tokens_out)::int AS tokens_out
           FROM rf_chat_logs WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 1""")
    for d in daily:
        d["cost_usd"] = _cost(d["tokens_in"], d["tokens_out"])
    tools = await db.fetch(
        """SELECT tc->>'name' AS name, COUNT(*)::int AS count FROM rf_chat_logs, jsonb_array_elements(tool_calls) tc
           GROUP BY 1 ORDER BY 2 DESC""")
    return {"totals": t, "daily": daily, "tool_usage": tools}


@app.get("/api/admin/users", dependencies=[Depends(admin)])
async def admin_users():
    rows = await db.fetch(
        """WITH u AS (SELECT user_id FROM rf_chat_logs UNION SELECT user_id FROM rf_users UNION SELECT user_id FROM rf_articles)
           SELECT u.user_id,
             (SELECT COUNT(*) FROM rf_articles a WHERE a.user_id=u.user_id)::int AS articles,
             (SELECT COUNT(*) FROM rf_articles a WHERE a.user_id=u.user_id AND status='published')::int AS published,
             (SELECT COALESCE(SUM(views),0) FROM rf_articles a WHERE a.user_id=u.user_id)::int AS views,
             (SELECT COALESCE(SUM(clicks),0) FROM rf_links l WHERE l.user_id=u.user_id)::int AS clicks,
             (SELECT COUNT(*) FROM rf_chat_logs c WHERE c.user_id=u.user_id)::int AS chats,
             (SELECT COALESCE(SUM(tokens_in),0) FROM rf_chat_logs c WHERE c.user_id=u.user_id)::int AS tokens_in,
             (SELECT COALESCE(SUM(tokens_out),0) FROM rf_chat_logs c WHERE c.user_id=u.user_id)::int AS tokens_out,
             (SELECT MAX(created_at) FROM rf_chat_logs c WHERE c.user_id=u.user_id) AS last_active
           FROM u ORDER BY last_active DESC NULLS LAST LIMIT 200""")
    for r in rows:
        r["cost_usd"] = _cost(r["tokens_in"], r["tokens_out"])
    return rows


@app.get("/api/admin/logs", dependencies=[Depends(admin)])
async def admin_logs(limit: int = 50, user_id: str | None = None):
    limit = max(1, min(limit, 500))
    if user_id:
        return await db.fetch("SELECT * FROM rf_chat_logs WHERE user_id=%s ORDER BY id DESC LIMIT %s", user_id, limit)
    return await db.fetch("SELECT * FROM rf_chat_logs ORDER BY id DESC LIMIT %s", limit)


@app.get("/api/admin/articles", dependencies=[Depends(admin)])
async def admin_articles():
    return await db.fetch(
        """SELECT a.id, a.user_id, a.title, a.keyword, a.status, a.views, a.word_count, a.created_at,
                  COALESCE(SUM(l.clicks),0)::int AS clicks
           FROM rf_articles a LEFT JOIN rf_links l ON l.article_id=a.id GROUP BY a.id ORDER BY a.id DESC LIMIT 300""")
