# price-monitor

Agent SDK bot that **monitors and compares prices** across Amazon, Walmart,
and Target demo catalog data, keeps a durable watchlist, and drafts buy
plans (never real checkouts).

## What it does

- Search products and compare in-stock offers across three retailers
- Watch items with optional target prices (`ctx.host.kv`)
- Daily schedule scan (`bot/schedules/daily-scan.md`)
- Draft-only ordering with human approval (`draft_order`)

## Defaults used for this scaffold

AskQuestion was unavailable in this environment, so these defaults were applied:

- **Purpose:** domain assistant over tools (commerce ops)
- **Name / location:** `price-monitor` at `~/price-monitor`
- **Model:** `grok-4.7` with `reasoning_effort=high`, `fast=true`
- **Channels:** playground + HTTP + daily schedule
- **MCP:** none (swap `bot/lib/catalog.ts` for live APIs)
- **Capabilities:** server tools, skill, schedule, evals, memory hook

## Local commands

```bash
cd ~/price-monitor
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk tool call search_products --dir . --input '{"query":"ninja cream"}' --json
npx @grok/agent-sdk dev
# playground: http://127.0.0.1:3000/playground
```

Live retailer APIs are intentionally not scraped. Replace the demo catalog
with official product / pricing APIs before production use.
