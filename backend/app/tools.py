"""RankForge agent tools.

Every tool reads user_id from the server-side RunnableConfig (never from LLM arguments),
so the model cannot touch another user's data even if it tries.
"""
import asyncio
import html
import json
import re
from typing import Annotated
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from . import db
from .config import API_URL, SITE_URL
from .guard import is_affirmative
from .llm import text_of, writer_llm

UA = {"User-Agent": "Mozilla/5.0 (compatible; RankForgeBot/1.0; +https://github.com/rankforge)"}
HTTP_TIMEOUT = httpx.Timeout(8.0, connect=5.0)


def _uid(config: RunnableConfig) -> str:
    return config["configurable"]["user_id"]


def _j(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:70] or "article"


def _last_human_text(state: dict) -> str:
    for m in reversed(state.get("messages", [])):
        if isinstance(m, HumanMessage):
            return m.content if isinstance(m.content, str) else text_of(m)
    return ""


async def _own_article(user_id: str, article_id: int) -> dict | None:
    return await db.fetchone("SELECT * FROM rf_articles WHERE id=%s AND user_id=%s", article_id, user_id)


# ---------------------------------------------------------------- 1. keyword research
COMMERCIAL = re.compile(r"\b(best|top|review|reviews|vs|versus|cheap|cheapest|buy|price|deal|deals|alternative|alternatives|coupon|discount|under \$?\d+|for sale)\b", re.I)
INFO = re.compile(r"\b(how|what|why|when|guide|tips|ideas|tutorial|meaning|benefits|examples?)\b", re.I)


async def _suggest(client: httpx.AsyncClient, q: str) -> list[str]:
    try:
        r = await client.get(
            "https://suggestqueries.google.com/complete/search",
            params={"client": "firefox", "hl": "en", "q": q},
        )
        r.raise_for_status()
        return list(r.json()[1])
    except Exception:
        try:
            r = await client.get("https://duckduckgo.com/ac/", params={"q": q, "type": "list"})
            r.raise_for_status()
            return list(r.json()[1])
        except Exception:
            return []


@tool
async def keyword_research(seed_keyword: str, config: RunnableConfig) -> str:
    """Research real keyword ideas for a seed topic using live search autocomplete data.
    Returns keywords with search intent, estimated difficulty (0-100) and an opportunity score."""
    seed = seed_keyword.strip()[:80]
    variants = [seed, f"best {seed}", f"how to {seed}", f"{seed} vs", f"{seed} for"]
    async with httpx.AsyncClient(headers=UA, timeout=HTTP_TIMEOUT) as client:
        lists = await asyncio.gather(*[_suggest(client, v) for v in variants])
    seen, rows = set(), []
    for kw in [s for lst in lists for s in lst]:
        k = kw.lower().strip()
        if not k or k in seen:
            continue
        seen.add(k)
        words = len(k.split())
        intent = "commercial" if COMMERCIAL.search(k) else "informational" if INFO.search(k) else "mixed"
        difficulty = max(10, min(90, 75 - 9 * (words - 2) + (8 if intent == "commercial" else 0)))
        opportunity = round((100 - difficulty) * (1.3 if intent == "commercial" else 1.0))
        rows.append({"keyword": k, "intent": intent, "difficulty_est": difficulty, "opportunity": opportunity})
    rows.sort(key=lambda r: -r["opportunity"])
    rows = rows[:12]
    if not rows:
        return _j({"seed": seed, "keywords": [], "note": "Autocomplete sources unavailable right now; try again."})
    await db.execute(
        "INSERT INTO rf_keywords (user_id, seed, results) VALUES (%s, %s, %s)",
        _uid(config), seed, _j(rows),
    )
    return _j({"seed": seed, "source": "live search autocomplete", "keywords": rows,
               "note": "difficulty is an estimate from query length and intent"})


# ---------------------------------------------------------------- 2. fact check
def _strip_html(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s or ""))


@tool
async def fact_check(claim: str, config: RunnableConfig, article_id: int | None = None) -> str:
    """Fact-check a factual claim against Wikipedia. Returns evidence passages and sources;
    you judge whether they support the claim. Pass article_id to log the check on that article."""
    api = "https://en.wikipedia.org/w/api.php"
    async with httpx.AsyncClient(headers=UA, timeout=HTTP_TIMEOUT) as client:
        try:
            r = await client.get(api, params={"action": "query", "list": "search", "srsearch": claim[:250],
                                              "format": "json", "srlimit": 3})
            hits = r.json().get("query", {}).get("search", [])
            titles = [h["title"] for h in hits]
            evidence = []
            if titles:
                r2 = await client.get(api, params={"action": "query", "prop": "extracts", "exintro": 1,
                                                   "explaintext": 1, "exchars": 700, "titles": "|".join(titles[:2]),
                                                   "format": "json"})
                pages = r2.json().get("query", {}).get("pages", {})
                for p in pages.values():
                    evidence.append({"source": p.get("title"),
                                     "url": "https://en.wikipedia.org/wiki/" + quote_plus(p.get("title", "").replace(" ", "_")),
                                     "extract": (p.get("extract") or "")[:700]})
            for h in hits[2:]:
                evidence.append({"source": h["title"], "snippet": _strip_html(h.get("snippet"))})
        except Exception as e:
            return _j({"claim": claim, "error": f"Wikipedia unavailable: {type(e).__name__}"})
    status = "evidence_found" if evidence else "no_evidence_found"
    if article_id:
        uid = _uid(config)
        if await _own_article(uid, article_id):
            await db.execute(
                "UPDATE rf_articles SET fact_checks = fact_checks || %s::jsonb WHERE id=%s AND user_id=%s",
                _j([{"claim": claim, "status": status, "sources": [e["source"] for e in evidence]}]), article_id, uid,
            )
    return _j({"claim": claim, "status": status, "evidence": evidence})


# ---------------------------------------------------------------- 3. writer agent
WRITER_SYSTEM = """You are RankForge's SEO Writer agent. Write an original, genuinely helpful, SEO-optimized article in Markdown.
Rules:
- Use the target keyword in the first 100 words, in at least one H2, and naturally elsewhere (no stuffing).
- Structure: short intro, 4-6 H2 sections (H3 where useful), bullet lists where they help, a "## FAQ" with 3 questions (### Q) and answers, and a "## Conclusion" with a call to action.
- Never invent statistics, prices, dates, studies or quotes. Speak generally if unsure.
- If products fit the topic, name real product types or well-known brands so affiliate links can be added later.
- Respect the requested tone, audience and length.
Output EXACTLY this format and nothing else:
TITLE: <title, max 60 characters, includes keyword>
META: <meta description, max 155 characters>
---
<markdown body, no H1>"""


@tool
async def write_article(keyword: str, config: RunnableConfig, title: str | None = None,
                        word_count: int = 700, tone: str | None = None, notes: str | None = None) -> str:
    """Delegate to the Writer agent: writes a full SEO article for a target keyword and saves it as a DRAFT.
    word_count 300-1500. Returns the article id and a short preview (not the whole article)."""
    uid = _uid(config)
    word_count = max(300, min(1500, int(word_count or 700)))
    mem = await db.get_memory(uid)
    ctx = "; ".join(f"{k}: {v}" for k, v in mem.items()) or "none"
    prompt = (f"Target keyword: {keyword}\nTitle idea: {title or 'your choice'}\nLength: about {word_count} words\n"
              f"Tone: {tone or mem.get('tone', 'friendly, expert')}\nSite/user context: {ctx}\nExtra notes: {notes or 'none'}")
    resp = await writer_llm.ainvoke([SystemMessage(WRITER_SYSTEM), HumanMessage(prompt)], config=config)
    raw = text_of(resp).strip()
    m_title = re.search(r"^TITLE:\s*(.+)$", raw, re.M)
    m_meta = re.search(r"^META:\s*(.+)$", raw, re.M)
    body = raw.split("---", 1)[1].strip() if "---" in raw else raw
    final_title = (m_title.group(1).strip() if m_title else (title or keyword.title()))[:120]
    meta = (m_meta.group(1).strip() if m_meta else "")[:200]
    base = _slugify(final_title)
    slug, n = base, 2
    while await db.fetchone("SELECT 1 FROM rf_articles WHERE user_id=%s AND slug=%s", uid, slug):
        slug, n = f"{base}-{n}", n + 1
    words = len(re.findall(r"\w+", body))
    row = await db.fetchone(
        """INSERT INTO rf_articles (user_id, slug, title, keyword, meta_description, content_md, word_count)
           VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        uid, slug, final_title, keyword, meta, body, words,
    )
    return _j({"article_id": row["id"], "title": final_title, "status": "draft", "word_count": words,
               "meta_description": meta, "preview": body[:240] + "...",
               "next_steps": "offer fact-check, affiliate links, or publishing (publishing needs user confirmation)"})


# ---------------------------------------------------------------- 4/5. read articles
@tool
async def list_articles(config: RunnableConfig, status: str = "all") -> str:
    """List the user's articles (status: all, draft or published) with id, title, keyword, views and clicks."""
    uid = _uid(config)
    q = """SELECT a.id, a.title, a.keyword, a.status, a.word_count, a.views,
                  COALESCE(SUM(l.clicks),0)::int AS clicks, a.created_at::date AS created
           FROM rf_articles a LEFT JOIN rf_links l ON l.article_id=a.id
           WHERE a.user_id=%s {f} GROUP BY a.id ORDER BY a.id DESC LIMIT 25"""
    if status in ("draft", "published"):
        rows = await db.fetch(q.format(f="AND a.status=%s"), uid, status)
    else:
        rows = await db.fetch(q.format(f=""), uid)
    return _j({"count": len(rows), "articles": rows})


@tool
async def get_article(article_id: int, config: RunnableConfig) -> str:
    """Get one of the user's articles (title, status, meta, links, fact checks, and content)."""
    a = await _own_article(_uid(config), article_id)
    if not a:
        return _j({"error": f"No article {article_id} in your workspace."})
    links = await db.fetch("SELECT anchor, url, clicks FROM rf_links WHERE article_id=%s", article_id)
    url = f"{SITE_URL}/site/{a['user_id']}/{a['slug']}" if a["status"] == "published" else None
    return _j({"article_id": a["id"], "title": a["title"], "keyword": a["keyword"], "status": a["status"],
               "url": url, "meta_description": a["meta_description"], "word_count": a["word_count"],
               "fact_checks": a["fact_checks"], "affiliate_links": links, "content": a["content_md"][:2500]})


# ---------------------------------------------------------------- 6. affiliate links
@tool
async def add_affiliate_link(article_id: int, anchor_text: str, url: str, config: RunnableConfig) -> str:
    """Insert a click-tracked affiliate link into an article. Links the first mention of anchor_text,
    or adds it to a 'Recommended' section if the text isn't found. url must start with http(s)://."""
    uid = _uid(config)
    a = await _own_article(uid, article_id)
    if not a:
        return _j({"error": f"No article {article_id} in your workspace."})
    if not re.match(r"^https?://[^\s]+\.[^\s]+$", url.strip()):
        return _j({"error": "Invalid URL. Ask the user for a full affiliate URL starting with https://"})
    link = await db.fetchone(
        "INSERT INTO rf_links (user_id, article_id, anchor, url) VALUES (%s,%s,%s,%s) RETURNING id",
        uid, article_id, anchor_text.strip(), url.strip(),
    )
    tracked = f"{API_URL}/go/{link['id']}"
    content = a["content_md"]
    # match the first occurrence not already inside a markdown link
    pattern = re.compile(r"(?<!\[)\b" + re.escape(anchor_text.strip()) + r"\b(?![^\[]*\])", re.I)
    m = pattern.search(content)
    if m:
        content = content[: m.start()] + f"[{m.group(0)}]({tracked})" + content[m.end():]
        placement = "inline at first mention"
    else:
        if "## Recommended" not in content:
            content += "\n\n## Recommended"
        content += f"\n- [{anchor_text.strip()}]({tracked})"
        placement = "added to Recommended section"
    await db.execute("UPDATE rf_articles SET content_md=%s WHERE id=%s AND user_id=%s", content, article_id, uid)
    return _j({"ok": True, "link_id": link["id"], "tracked_url": tracked, "placement": placement})


# ---------------------------------------------------------------- 7/8. risky actions (confirmation gated)
def _needs_confirmation(confirmed: bool, state: dict) -> bool:
    return not (confirmed and is_affirmative(_last_human_text(state)))


@tool
async def publish_article(article_id: int, config: RunnableConfig,
                          state: Annotated[dict, InjectedState], confirmed: bool = False) -> str:
    """RISKY: publish an article live on the user's public site. Always call first with confirmed=false;
    only use confirmed=true after the user explicitly replied yes in their latest message."""
    uid = _uid(config)
    a = await _own_article(uid, article_id)
    if not a:
        return _j({"error": f"No article {article_id} in your workspace."})
    if a["status"] == "published":
        return _j({"ok": True, "already_published": True, "url": f"{SITE_URL}/site/{uid}/{a['slug']}"})
    if _needs_confirmation(confirmed, state):
        await db.execute("INSERT INTO rf_pending (user_id, action, article_id) VALUES (%s,'publish',%s) "
                         "ON CONFLICT DO NOTHING", uid, article_id)
        return _j({"status": "CONFIRMATION_REQUIRED",
                   "ask_user": f'Publish "{a["title"]}" (id {article_id}) live on your public site? Reply "yes" to confirm.'})
    await db.execute("UPDATE rf_articles SET status='published', published_at=now() WHERE id=%s AND user_id=%s",
                     article_id, uid)
    await db.execute("DELETE FROM rf_pending WHERE user_id=%s AND article_id=%s", uid, article_id)
    return _j({"ok": True, "status": "published", "url": f"{SITE_URL}/site/{uid}/{a['slug']}"})


@tool
async def delete_article(article_id: int, config: RunnableConfig,
                         state: Annotated[dict, InjectedState], confirmed: bool = False) -> str:
    """RISKY, irreversible: delete an article. Always call first with confirmed=false;
    only use confirmed=true after the user explicitly replied yes in their latest message."""
    uid = _uid(config)
    a = await _own_article(uid, article_id)
    if not a:
        return _j({"error": f"No article {article_id} in your workspace."})
    if _needs_confirmation(confirmed, state):
        await db.execute("INSERT INTO rf_pending (user_id, action, article_id) VALUES (%s,'delete',%s) "
                         "ON CONFLICT DO NOTHING", uid, article_id)
        return _j({"status": "CONFIRMATION_REQUIRED",
                   "ask_user": f'Permanently delete "{a["title"]}" (id {article_id})? This cannot be undone. Reply "yes" to confirm.'})
    await db.execute("DELETE FROM rf_articles WHERE id=%s AND user_id=%s", article_id, uid)
    await db.execute("DELETE FROM rf_pending WHERE user_id=%s AND article_id=%s", uid, article_id)
    return _j({"ok": True, "deleted": article_id})


# ---------------------------------------------------------------- 9. performance
@tool
async def get_performance(config: RunnableConfig, article_id: int | None = None) -> str:
    """Get tracked traffic for the user's articles: views, affiliate clicks, CTR, and latest rank checks."""
    uid = _uid(config)
    rows = await db.fetch(
        """SELECT a.id, a.title, a.keyword, a.status, a.views, COALESCE(SUM(l.clicks),0)::int AS clicks
           FROM rf_articles a LEFT JOIN rf_links l ON l.article_id=a.id
           WHERE a.user_id=%s AND (%s::int IS NULL OR a.id=%s::int) GROUP BY a.id ORDER BY a.views DESC LIMIT 20""",
        uid, article_id, article_id,
    )
    for r in rows:
        r["ctr_pct"] = round(100 * r["clicks"] / r["views"], 1) if r["views"] else 0.0
    ranks = await db.fetch(
        """SELECT DISTINCT ON (keyword, domain) keyword, domain, position, checked_at::date AS date
           FROM rf_ranks WHERE user_id=%s ORDER BY keyword, domain, checked_at DESC LIMIT 10""", uid)
    last7 = await db.fetch(
        """SELECT kind, COUNT(*)::int AS n FROM rf_events
           WHERE user_id=%s AND created_at > now() - interval '7 days' GROUP BY kind""", uid)
    return _j({"articles": rows, "rankings": ranks, "last_7_days": {r["kind"]: r["n"] for r in last7}})


# ---------------------------------------------------------------- 10. rank tracking
def _ddg_urls(page: str) -> list[str]:
    urls = []
    for href in re.findall(r'class="result__a"[^>]*href="([^"]+)"', page):
        href = html.unescape(href)
        if "uddg=" in href:
            href = unquote(parse_qs(urlparse(href).query).get("uddg", [""])[0])
        urls.append(href)
    return urls


def _bing_urls(page: str) -> list[str]:
    return [html.unescape(u) for u in re.findall(r'<li class="b_algo"[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', page, re.S)]


@tool
async def check_ranking(keyword: str, domain: str, config: RunnableConfig) -> str:
    """Check where a domain ranks in live web search results for a keyword (top ~30). Saves the result for tracking."""
    domain = re.sub(r"^https?://", "", domain.strip().lower()).split("/")[0].removeprefix("www.")
    urls, engine = [], None
    async with httpx.AsyncClient(headers={**UA, "User-Agent": "Mozilla/5.0"}, timeout=HTTP_TIMEOUT,
                                 follow_redirects=True) as client:
        try:
            r = await client.post("https://html.duckduckgo.com/html/", data={"q": keyword})
            urls, engine = _ddg_urls(r.text), "duckduckgo"
        except Exception:
            pass
        if not urls:
            try:
                r = await client.get("https://www.bing.com/search", params={"q": keyword, "count": 30})
                urls, engine = _bing_urls(r.text), "bing"
            except Exception:
                pass
    if not urls:
        return _j({"keyword": keyword, "domain": domain, "error": "Search engines unavailable right now; try later."})
    position = next((i + 1 for i, u in enumerate(urls) if domain in urlparse(u).netloc.lower()), None)
    await db.execute("INSERT INTO rf_ranks (user_id, keyword, domain, position) VALUES (%s,%s,%s,%s)",
                     _uid(config), keyword, domain, position)
    top = [urlparse(u).netloc for u in urls[:5]]
    return _j({"keyword": keyword, "domain": domain, "engine": engine, "results_checked": len(urls),
               "position": position, "ranking": position is not None, "top_5_domains": top})


ALL_TOOLS = [keyword_research, fact_check, write_article, list_articles, get_article,
             add_affiliate_link, publish_article, delete_article, get_performance, check_ranking]
