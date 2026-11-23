"""Run tests.json against a deployed (or local) RankForge API and print a markdown benchmark table.

usage: python scripts/benchmark.py https://<space>.hf.space [--runs 1]
Uses only the stdlib so it runs anywhere.
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

PRICE_IN, PRICE_OUT = 0.10, 0.50  # Haiku 5.5 $/1M tokens


def post(base: str, body: dict) -> tuple[dict, float]:
    req = urllib.request.Request(f"{base}/chat", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
    return data, time.perf_counter() - t0


def main():
    base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:7860"
    runs = int(sys.argv[sys.argv.index("--runs") + 1]) if "--runs" in sys.argv else 1
    suffix = str(int(time.time()))[-5:]  # fresh user/thread ids per benchmark run
    tests = json.loads((Path(__file__).parent.parent / "tests.json").read_text())
    rows, tot_in, tot_out, lat = [], 0, 0, []
    for run in range(runs):
        for t in tests:
            used, tin, tout, secs, reply, ok_fmt = [], 0, 0, 0.0, "", True
            for s in t["steps"]:
                body = {**s, "user_id": f"{s['user_id']}_{suffix}{run}", "thread_id": f"{s['thread_id']}_{suffix}{run}"}
                try:
                    d, dt = post(base, body)
                except Exception as e:
                    d, dt, ok_fmt = {"reply": f"ERROR {e}", "tool_calls": [], "tokens": {"in": 0, "out": 0}}, 0, False
                ok_fmt &= isinstance(d.get("reply"), str) and isinstance(d.get("tool_calls"), list) and "in" in d.get("tokens", {})
                used += [c["name"] for c in d.get("tool_calls", [])]
                tin += d["tokens"]["in"]; tout += d["tokens"]["out"]; secs += dt; reply = d["reply"]
                lat.append(dt)
            tools_ok = all(x in used for x in t["expected_tools"]) and (t["expected_tools"] or not used or t["category"] != "safety")
            text_ok = True
            if "reply_must_match" in t:
                text_ok &= bool(re.search(t["reply_must_match"], reply))
            if "reply_must_not_match" in t:
                text_ok &= not re.search(t["reply_must_not_match"], reply)
            passed = ok_fmt and tools_ok and text_ok
            tot_in += tin; tot_out += tout
            rows.append((t["id"], t["name"], t["category"], "PASS" if passed else "FAIL", ",".join(used) or "-",
                         tin, tout, round(secs, 1), reply[:90].replace("\n", " ").replace("|", "/")))
    print("| # | Test | Category | Result | Tools called | Tokens in | Tokens out | Latency (s) |")
    print("|---|---|---|---|---|---|---|---|")
    for r in rows:
        print(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]} | {r[7]} |")
    passed = sum(1 for r in rows if r[3] == "PASS")
    lat.sort()
    cost = tot_in / 1e6 * PRICE_IN + tot_out / 1e6 * PRICE_OUT
    print(f"\n**Passed {passed}/{len(rows)}** · requests {len(lat)} · median latency {lat[len(lat)//2]:.1f}s · "
          f"p95 {lat[int(len(lat)*0.95)-1]:.1f}s · tokens {tot_in} in / {tot_out} out · cost ${cost:.4f} "
          f"(${cost/max(len(lat),1):.5f}/request)")
    if "--verbose" in sys.argv:
        for r in rows:
            print(r[0], r[3], "→", r[8])


if __name__ == "__main__":
    main()
