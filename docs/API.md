# RankForge Agent API contract

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://<space>.hf.space`). All JSON. CORS open.

## Grading endpoints (open, no login)
| Method | Path | Body / Response |
|---|---|---|
| POST | `/chat` | body `{"user_id","thread_id","message"}` → `{"reply": str, "tool_calls": [{"name": str, "args": obj}], "tokens": {"in": int, "out": int}}` |
| GET | `/health` | plain text `ok` |
| GET | `/go/{link_id}` | 302 redirect to the affiliate URL, records a click |

## Website auth
| POST | `/api/auth/signup` | `{"username","password"}` → `{"token","user_id"}` (409 if taken; username 3-32 chars `[a-z0-9_-]`) |
| POST | `/api/auth/login` | `{"username","password"}` → `{"token","user_id"}` (401 on bad creds) |

## Customer workspace — header `Authorization: Bearer <token>`
| GET | `/api/me` | `{"user_id", "memory": {key: value}, "stats": {"articles","published","views","clicks","keywords_researched","chats","tokens_in","tokens_out"}}` |
| POST | `/api/me/chat` | `{"thread_id","message"}` → same shape as `/chat` |
| GET | `/api/me/threads` | `[{"thread_id","title","last_at","messages"}]` (title = first user message, truncated) |
| GET | `/api/me/threads/{thread_id}` | `{"thread_id","messages":[{"role":"user"\|"assistant","content": str,"tool_calls":[{"name","args"}]}]}` |
| GET | `/api/me/articles` | `[{"id","title","slug","keyword","status":"draft"\|"published","word_count","views","clicks","meta_description","created_at","published_at","url"}]` |
| GET | `/api/me/articles/{id}` | article + `"content_md"`, `"links":[{"id","anchor","url","clicks"}]`, `"fact_checks":[{"claim","status","sources"}]` |
| GET | `/api/me/keywords` | `[{"id","seed","created_at","results":[{"keyword","intent","difficulty_est","opportunity"}]}]` |
| GET | `/api/me/ranks` | `[{"keyword","domain","position": int\|null,"checked_at"}]` |
| GET | `/api/me/performance` | `{"daily":[{"date":"YYYY-MM-DD","views","clicks"}] (last 30 days), "articles":[{"id","title","views","clicks","ctr_pct"}]}` |
| DELETE | `/api/me/memory/{key}` | `{"ok":true}` |

## Public affiliate site (no auth) — server-rendered pages on Vercel
| GET | `/api/public/sites` | `[{"user_id","site_name","published","last_published"}]` |
| GET | `/api/public/site/{user_id}` | `{"user_id","site_name","niche","articles":[{"title","slug","meta_description","keyword","word_count","published_at"}]}` |
| GET | `/api/public/site/{user_id}/{slug}` | `{"title","slug","meta_description","content_md","keyword","word_count","published_at","user_id","site_name"}` — counts a view. 404 if not published. |

Affiliate links inside `content_md` already point at `{API}/go/{id}` (tracked). Render markdown links as normal `<a rel="sponsored nofollow" target="_blank">`.

## Admin dashboard — header `X-Admin-Key: <ADMIN_KEY>`
| GET | `/api/admin/overview` | `{"totals":{"users","articles","published","views","clicks","chats","tokens_in","tokens_out","cost_usd","blocked","errors","avg_latency_ms"},"daily":[{"date","chats","tokens_in","tokens_out","cost_usd"}],"tool_usage":[{"name","count"}]}` |
| GET | `/api/admin/users` | `[{"user_id","articles","published","views","clicks","chats","tokens_in","tokens_out","cost_usd","last_active"}]` |
| GET | `/api/admin/logs?limit=50&user_id=` | `[{"id","user_id","thread_id","message","reply","tool_calls","tokens_in","tokens_out","latency_ms","blocked","error","created_at"}]` |
| GET | `/api/admin/articles` | `[{"id","user_id","title","keyword","status","views","clicks","word_count","created_at"}]` |
| 401 on wrong key. |

## Agent tool names (for UI chips / icons)
`keyword_research`, `fact_check`, `write_article`, `list_articles`, `get_article`, `add_affiliate_link`, `publish_article`, `delete_article`, `get_performance`, `check_ranking`
