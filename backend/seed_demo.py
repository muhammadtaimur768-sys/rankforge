"""Seed a demo workspace (user 'demo' / password 'demo1234') so the website and dashboard have data.

Articles are written by the real Writer agent (3 Haiku calls, about $0.004 total). The 30 days of
views/clicks are SIMULATED demo traffic, labelled as such in the README.
usage: python seed_demo.py
"""
import asyncio
import json
import random
from datetime import datetime, timedelta, timezone

from app import db
from app import tools as T
from app.main import _hash_pw

USER = "demo"
ARTICLES = [
    ("best budget hiking boots", "Waterproof options under $150, Merrell Moab 3, Columbia Newton Ridge", [("Merrell Moab 3", "https://www.amazon.com/s?k=merrell+moab+3"), ("Columbia Newton Ridge", "https://www.amazon.com/s?k=columbia+newton+ridge")]),
    ("ultralight tent for beginners", "Compare freestanding vs trekking-pole tents, mention Naturehike Cloud-Up 2", [("Naturehike Cloud-Up 2", "https://www.amazon.com/s?k=naturehike+cloud+up+2")]),
    ("how to layer clothes for winter hiking", "Base, mid, shell layers; mention merino wool base layer", [("merino wool", "https://www.amazon.com/s?k=merino+wool+base+layer")]),
]


async def main():
    await db.init_pool()
    cfg = {"configurable": {"user_id": USER}}
    await db.execute("DELETE FROM rf_articles WHERE user_id=%s", USER)
    await db.execute("DELETE FROM rf_events WHERE user_id=%s", USER)
    await db.execute("DELETE FROM rf_ranks WHERE user_id=%s", USER)
    await db.execute("DELETE FROM rf_keywords WHERE user_id=%s", USER)
    await db.execute("INSERT INTO rf_users (user_id, password_hash) VALUES (%s,%s) ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash",
                     USER, _hash_pw("demo1234"))
    for k, v in {"site_name": "TrailPicks", "niche": "budget hiking gear", "audience": "beginner hikers",
                 "tone": "friendly and practical", "affiliate_program": "Amazon Associates", "domain": "trailpicks.example"}.items():
        await db.set_memory(USER, k, v)

    print(await T.keyword_research.ainvoke({"seed_keyword": "budget hiking gear"}, cfg))
    for kw, notes, links in ARTICLES:
        res = json.loads(await T.write_article.ainvoke({"keyword": kw, "word_count": 650, "notes": notes}, cfg))
        aid = res["article_id"]
        for anchor, url in links:
            await T.add_affiliate_link.ainvoke({"article_id": aid, "anchor_text": anchor, "url": url}, cfg)
        await T.fact_check.ainvoke({"claim": "Merino wool regulates body temperature", "article_id": aid}, cfg)
        days_ago = random.randint(18, 28)
        await db.execute("UPDATE rf_articles SET status='published', published_at=%s WHERE id=%s",
                         datetime.now(timezone.utc) - timedelta(days=days_ago), aid)
        # simulated demo traffic
        views = clicks = 0
        for d in range(days_ago, -1, -1):
            day = datetime.now(timezone.utc) - timedelta(days=d, hours=random.randint(0, 20))
            v = max(0, int(random.gauss(4 + (days_ago - d) * 0.9, 3)))
            c = sum(1 for _ in range(v) if random.random() < 0.07)
            views += v; clicks += c
            for _ in range(v):
                await db.execute("INSERT INTO rf_events (user_id, article_id, kind, created_at) VALUES (%s,%s,'view',%s)", USER, aid, day)
            for _ in range(c):
                await db.execute("INSERT INTO rf_events (user_id, article_id, kind, created_at) VALUES (%s,%s,'click',%s)", USER, aid, day)
        await db.execute("UPDATE rf_articles SET views=%s WHERE id=%s", views, aid)
        link = await db.fetchone("SELECT id FROM rf_links WHERE article_id=%s ORDER BY id LIMIT 1", aid)
        await db.execute("UPDATE rf_links SET clicks=%s WHERE id=%s", clicks, link["id"])
        for i, pos in enumerate([38, 24, 17, 11]):
            await db.execute("INSERT INTO rf_ranks (user_id, keyword, domain, position, checked_at) VALUES (%s,%s,%s,%s,%s)",
                             USER, kw, "trailpicks.example", pos + random.randint(-3, 3), datetime.now(timezone.utc) - timedelta(days=21 - i * 7))
        print("seeded", res["title"], views, "views", clicks, "clicks")


asyncio.run(main())
