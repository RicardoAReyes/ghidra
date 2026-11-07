import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { findProduct, RETAILERS, type Retailer } from "../lib/catalog.js";
import {
  loadWatchlist,
  saveWatchlist,
  type WatchItem,
} from "../lib/store.js";

const retailerSchema = z.enum(["amazon", "walmart", "target"]);

export default defineTool({
  description: prompt`
    Manage the durable price watchlist stored in host kv.
    Actions: list, add, update (target price / preferred retailers), remove.
    Use after the user wants ongoing monitoring for an item.
  `,
  effect: "idempotent",
  execution: "server",
  inputSchema: z.object({
    action: z.enum(["list", "add", "update", "remove"]),
    productId: z.string().optional(),
    targetPriceUsd: z.number().positive().optional(),
    clearTargetPrice: z.boolean().optional(),
    preferredRetailers: z.array(retailerSchema).optional(),
  }),
  async execute(input, ctx) {
    const items = await loadWatchlist(ctx.host.kv);

    if (input.action === "list") {
      return { ok: true as const, count: items.length, items };
    }

    const productId = input.productId?.trim();
    if (!productId) {
      return {
        ok: false as const,
        error: "productId is required for add, update, and remove.",
      };
    }

    if (input.action === "remove") {
      const next = items.filter((i) => i.productId !== productId);
      if (next.length === items.length) {
        return { ok: false as const, error: `Not on watchlist: ${productId}` };
      }
      await saveWatchlist(ctx.host.kv, next);
      return { ok: true as const, removed: productId, count: next.length };
    }

    const product = findProduct(productId);
    if (!product) {
      return {
        ok: false as const,
        error: `Unknown productId "${productId}". Call search_products first.`,
      };
    }

    const existing = items.find((i) => i.productId === product.id);
    const preferred: Retailer[] =
      input.preferredRetailers?.length
        ? input.preferredRetailers
        : existing?.preferredRetailers ?? [...RETAILERS];

    let targetPriceUsd: number | null =
      input.targetPriceUsd ?? existing?.targetPriceUsd ?? null;
    if (input.clearTargetPrice) targetPriceUsd = null;

    const row: WatchItem = {
      productId: product.id,
      title: product.title,
      targetPriceUsd,
      preferredRetailers: preferred,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      lastBestPriceUsd: existing?.lastBestPriceUsd ?? null,
      lastBestRetailer: existing?.lastBestRetailer ?? null,
      lastCheckedAt: existing?.lastCheckedAt ?? null,
    };

    const next = existing
      ? items.map((i) => (i.productId === product.id ? row : i))
      : [...items, row];
    await saveWatchlist(ctx.host.kv, next);

    return {
      ok: true as const,
      action: existing ? "updated" : "added",
      item: row,
      count: next.length,
    };
  },
});
