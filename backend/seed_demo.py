"""Seed demo workspaces so the website, public affiliate sites and dashboards have data.

usage: python seed_demo.py [site_user_id ...]      (no args = all sites; re-seeding a site replaces it)

Articles are written by the real Writer agent (one Haiku call each, about $0.0015). Affiliate links
go through the real click tracker. The 30 days of views/clicks/rank history are SIMULATED demo traffic.
All demo users have password demo1234.
"""
import asyncio
import json
import random
import sys
from datetime import datetime, timedelta, timezone

from app import db
from app import tools as T
from app.main import _hash_pw


def amz(q: str) -> str:
    return "https://www.amazon.com/s?k=" + q.replace(" ", "+")


SITES = {
    "demo": {
        "memory": {"site_name": "TrailPicks", "niche": "budget hiking gear", "audience": "beginner hikers",
                   "tone": "friendly and practical", "affiliate_program": "Amazon Associates",
                   "domain": "trailpicks.example", "brand_color": "#2f6f4e",
                   "tagline": "Trail-tested gear that doesn't cost a fortune",
                   "about": "TrailPicks helps new hikers buy the right gear the first time. We compare specs, read owner reviews, and only recommend gear we'd take on our own weekend trips."},
        "articles": [
            ("best budget hiking boots", "Waterproof options under $150; cover Merrell Moab 3, Columbia Newton Ridge Plus, KEEN Targhee", ["Merrell Moab 3", "Columbia Newton Ridge Plus", "KEEN Targhee"]),
            ("ultralight tent for beginners", "Freestanding vs trekking-pole tents; cover Naturehike Cloud-Up 2, REI Co-op Trail Hut 2", ["Naturehike Cloud-Up 2", "REI Co-op Trail Hut 2"]),
            ("how to layer clothes for winter hiking", "Base, mid, shell layers; mention merino wool base layer, fleece jacket, rain shell", ["merino wool base layer", "fleece jacket"]),
        ],
    },
    "brewlab": {
        "memory": {"site_name": "BrewLab", "niche": "home coffee brewing gear", "audience": "home baristas on a budget",
                   "tone": "nerdy but approachable", "affiliate_program": "Amazon Associates", "brand_color": "#8a4b2a",
                   "tagline": "Better coffee at home, one brew at a time",
                   "about": "BrewLab is run by home baristas who obsess over grind size and water temperature, so you don't have to. Every guide is built around gear that is easy to buy and easy to use."},
        "articles": [
            ("best burr coffee grinder under 100", "Conical vs flat burrs; cover Baratza Encore, OXO Brew Conical Burr Grinder, Fellow Opus", ["Baratza Encore", "OXO Brew Conical Burr Grinder", "Fellow Opus"]),
            ("pour over coffee guide for beginners", "Ratios, grind, bloom; mention Hario V60, gooseneck kettle, coffee scale", ["Hario V60", "gooseneck kettle"]),
            ("french press vs aeropress", "Taste, cleanup, travel; mention AeroPress Original, Bodum Chambord", ["AeroPress Original", "Bodum Chambord"]),
        ],
    },
    "deskwise": {
        "memory": {"site_name": "DeskWise", "niche": "home office and ergonomic desk setups", "audience": "remote workers",
                   "tone": "clear and practical", "affiliate_program": "Amazon Associates", "brand_color": "#3554b8",
                   "tagline": "Work-from-home setups that are kind to your back",
                   "about": "DeskWise reviews chairs, desks and accessories for people who work from home. We focus on ergonomics first and looks second."},
        "articles": [
            ("best ergonomic office chair under 300", "Lumbar support, adjustability; cover Branch Ergonomic Chair, HON Ignition 2.0, Sihoo M57", ["Branch Ergonomic Chair", "HON Ignition 2.0", "Sihoo M57"]),
            ("standing desk benefits and setup tips", "Height, alternating sitting/standing, anti-fatigue mat; mention FlexiSpot E7, anti-fatigue mat", ["FlexiSpot E7", "anti-fatigue mat"]),
            ("how to reduce eye strain working from home", "Lighting, monitor distance, 20-20-20 rule; mention monitor light bar, BenQ ScreenBar", ["BenQ ScreenBar"]),
        ],
    },
    "pawpicks": {
        "memory": {"site_name": "PawPicks", "niche": "dog gear and supplies", "audience": "first-time dog owners",
                   "tone": "warm and reassuring", "affiliate_program": "Chewy affiliate program", "brand_color": "#b8457a",
                   "tagline": "Honest gear picks for happy dogs and their humans",
                   "about": "PawPicks helps new dog owners skip the guesswork. We compare harnesses, beds and toys on safety, durability and value."},
        "articles": [
            ("best no pull dog harness", "Front-clip vs back-clip; cover Ruffwear Front Range Harness, PetSafe Easy Walk Harness", ["Ruffwear Front Range Harness", "PetSafe Easy Walk Harness"]),
            ("orthopedic dog bed for older dogs", "Memory foam, washable covers; cover Big Barker bed, Furhaven orthopedic bed", ["Big Barker", "Furhaven orthopedic bed"]),
            ("puppy essentials checklist", "Crate, leash, toys, food bowls; mention KONG Classic, Midwest iCrate", ["KONG Classic", "Midwest iCrate"]),
        ],
    },
}


async def seed_site(uid: str, spec: dict) -> None:
    cfg = {"configurable": {"user_id": uid}}
    for t in ("rf_articles", "rf_events", "rf_ranks", "rf_keywords", "rf_memory"):
        await db.execute(f"DELETE FROM {t} WHERE user_id=%s", uid)
    await db.execute("""INSERT INTO rf_users (user_id, password_hash) VALUES (%s,%s)
                        ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash""", uid, _hash_pw("demo1234"))
    for k, v in spec["memory"].items():
        await db.set_memory(uid, k, v)
    await T.keyword_research.ainvoke({"seed_keyword": spec["memory"]["niche"]}, cfg)
    domain = spec["memory"].get("domain") or f"{uid}.example"

    for idx, (kw, notes, products) in enumerate(spec["articles"]):
        res = json.loads(await T.write_article.ainvoke({"keyword": kw, "word_count": 750, "notes": notes}, cfg))
        aid = res["article_id"]
        for p in products:
            await T.add_affiliate_link.ainvoke({"article_id": aid, "anchor_text": p, "url": amz(p)}, cfg)
        days_ago = 26 - idx * 4 + random.randint(-2, 2)
        await db.execute("UPDATE rf_articles SET status='published', published_at=%s WHERE id=%s",
                         datetime.now(timezone.utc) - timedelta(days=days_ago), aid)
        # simulated demo traffic, inserted in bulk: views grow after publishing, ~6% click-through
        base = random.uniform(3, 7)
        await db.execute(
            """INSERT INTO rf_events (user_id, article_id, kind, created_at)
               SELECT %s, %s, 'view', now() - (d || ' days')::interval - (random() * interval '20 hours')
               FROM generate_series(0, %s) d, generate_series(1, 60) n
               WHERE n <= greatest(0, round(%s + (%s - d) * 0.8 + (random() * 6 - 3)))""",
            uid, aid, days_ago, base, days_ago)
        await db.execute(
            """INSERT INTO rf_events (user_id, article_id, kind, created_at)
               SELECT user_id, article_id, 'click', created_at FROM rf_events
               WHERE article_id=%s AND kind='view' AND random() < 0.06""", aid)
        counts = await db.fetchone(
            """SELECT COUNT(*) FILTER (WHERE kind='view')::int AS v, COUNT(*) FILTER (WHERE kind='click')::int AS c
               FROM rf_events WHERE article_id=%s""", aid)
        await db.execute("UPDATE rf_articles SET views=%s WHERE id=%s", counts["v"], aid)
        links = await db.fetch("SELECT id FROM rf_links WHERE article_id=%s ORDER BY id", aid)
        remaining = counts["c"]
        for i, link in enumerate(links):
            share = remaining if i == len(links) - 1 else int(remaining * random.uniform(0.4, 0.7))
            remaining -= share
            await db.execute("UPDATE rf_links SET clicks=%s WHERE id=%s", share, link["id"])
        start = random.randint(30, 45)
        for w in range(4):
            await db.execute("INSERT INTO rf_ranks (user_id, keyword, domain, position, checked_at) VALUES (%s,%s,%s,%s,%s)",
                             uid, kw, domain, max(1, start - w * random.randint(5, 9)),
                             datetime.now(timezone.utc) - timedelta(days=21 - w * 7))
        print(f"  {uid}: {res['title']} | {counts['v']} views, {counts['c']} clicks")


async def main():
    await db.init_pool()
    targets = sys.argv[1:] or list(SITES)
    for uid in targets:
        print("seeding", uid)
        await seed_site(uid, SITES[uid])


asyncio.run(main())
