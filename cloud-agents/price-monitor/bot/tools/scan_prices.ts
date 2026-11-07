import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { compareProduct, findProduct } from "../lib/catalog.js";
import { loadWatchlist, saveWatchlist } from "../lib/store.js";

export default defineTool({
  description: prompt`
    Scan every watchlist item (or one productId) against current demo offers.
    Marks hits when the best in-stock price is at or below the target price.
    Updates lastBest* fields on the watchlist. Call on schedule ticks and
    when the user asks "any deals?" or "check my watchlist".
  `,
  effect: "idempotent",
  execution: "server",
  inputSchema: z.object({
    productId: z
      .string()
      .optional()
      .describe("Optional: scan only this watchlist product"),
  }),
  async execute({ productId }, ctx) {
    const items = await loadWatchlist(ctx.host.kv);
    const scoped = productId
      ? items.filter((i) => i.productId === productId.trim())
      : items;

    if (scoped.length === 0) {
      return {
        ok: true as const,
        scanned: 0,
        hits: [],
        items: [],
        message: productId
          ? `No watchlist entry for ${productId}.`
          : "Watchlist is empty. Add items with manage_watchlist.",
      };
    }

    const now = new Date();
    type Quote = {
      productId: string;
      title: string;
      retailer: string;
      priceUsd: number;
      targetPriceUsd: number | null;
      underTarget: boolean;
      url: string;
    };
    const quotes: Quote[] = [];

    const updated = items.map((item) => {
      if (productId && item.productId !== productId.trim()) return item;
      const product = findProduct(item.productId);
      if (!product) return item;
      const cmp = compareProduct(product, now);
      const preferred = new Set(item.preferredRetailers);
      const offers = cmp.offers.filter((o) => preferred.has(o.retailer));
      const best =
        offers.length === 0
          ? null
          : offers.reduce((a, b) => (a.priceUsd <= b.priceUsd ? a : b));
      if (best) {
        const underTarget =
          item.targetPriceUsd != null && best.priceUsd <= item.targetPriceUsd;
        quotes.push({
          productId: item.productId,
          title: item.title,
          retailer: best.retailer,
          priceUsd: best.priceUsd,
          targetPriceUsd: item.targetPriceUsd,
          underTarget,
          url: best.url,
        });
        return {
          ...item,
          lastBestPriceUsd: best.priceUsd,
          lastBestRetailer: best.retailer,
          lastCheckedAt: now.toISOString(),
        };
      }
      return { ...item, lastCheckedAt: now.toISOString() };
    });

    await saveWatchlist(ctx.host.kv, updated);

    const hits = quotes.filter((q) => q.underTarget);
    return {
      ok: true as const,
      scanned: scoped.length,
      observedAt: now.toISOString(),
      hits,
      quotes,
      targetHitCount: hits.length,
      items: updated.filter((i) =>
        productId ? i.productId === productId.trim() : true,
      ),
      dataSource: "demo-catalog",
    };
  },
});
