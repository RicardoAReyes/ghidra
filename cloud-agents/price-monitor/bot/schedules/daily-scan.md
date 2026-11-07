---
cron: "0 14 * * *"
---

Run a morning price scan for the commerce watchlist.

1. Call `scan_prices` with no productId (full watchlist).
2. Summarize target hits first, then other current best prices.
3. For each target hit, include retailer, price, and checkout URL.
4. If the watchlist is empty, say so in one sentence and stop.
5. Do not draft orders on this schedule unless a prior user instruction
   in this task prompt explicitly requested it (it does not).
