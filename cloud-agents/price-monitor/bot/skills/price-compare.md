# Compare and recommend a buy

Use this when the user wants the cheapest place to buy something, or
whether to wait for a target price.

## Steps

1. Call `search_products` with their query.
2. If multiple hits, pick the closest match and confirm the `productId`.
3. Call `compare_prices` with that id.
4. Recommend the `bestDeal` when in stock. Mention `missingRetailers`.
5. If they give a max budget, call `manage_watchlist` with
   `action: "add"` and `targetPriceUsd`.
6. Only call `draft_order` when they explicitly want a draft purchase plan.

## Reply checklist

- Best retailer and price
- Delta vs other stocked retailers
- Stock / shipping note
- Next action: watch, draft, or wait
