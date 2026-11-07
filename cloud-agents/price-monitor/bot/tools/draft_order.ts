import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { compareProduct, findProduct, type Retailer } from "../lib/catalog.js";
import { loadOrders, newOrderId, saveOrders } from "../lib/store.js";

export default defineTool({
  description: prompt`
    Create a DRAFT purchase plan for a product at a chosen retailer.
    This never places a real order with Amazon, Walmart, or Target.
    It records intent in durable kv so the user can approve later.
    Requires human approval before the draft is stored.
  `,
  effect: "write",
  execution: "server",
  needsApproval: true,
  inputSchema: z.object({
    productId: z.string().min(1),
    retailer: z.enum(["amazon", "walmart", "target"]).optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    note: z.string().max(500).optional(),
  }),
  dryRunResult: ({ productId, retailer, quantity }) => ({
    ok: true as const,
    dryRun: true as const,
    order: {
      orderId: "dry-run",
      productId,
      retailer: retailer ?? "amazon",
      quantity: quantity ?? 1,
      status: "draft" as const,
    },
  }),
  async execute({ productId, retailer, quantity, note }, ctx) {
    const product = findProduct(productId);
    if (!product) {
      return {
        ok: false as const,
        error: `Unknown productId "${productId}". Call search_products first.`,
      };
    }
    const cmp = compareProduct(product);
    let chosenRetailer: Retailer | undefined = retailer;
    let offer = chosenRetailer
      ? cmp.offers.find((o) => o.retailer === chosenRetailer)
      : cmp.bestDeal ?? undefined;

    if (!offer) {
      return {
        ok: false as const,
        error: chosenRetailer
          ? `${product.title} is not in stock at ${chosenRetailer}.`
          : `${product.title} has no in-stock offers right now.`,
        offers: cmp.offers,
      };
    }

    chosenRetailer = offer.retailer;
    const order = {
      orderId: newOrderId(),
      productId: product.id,
      title: product.title,
      retailer: chosenRetailer,
      priceUsd: offer.priceUsd,
      quantity: quantity ?? 1,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      note:
        note ??
        `Draft only — open ${offer.url} to buy manually. Agent does not checkout.`,
    };

    const orders = await loadOrders(ctx.host.kv);
    orders.unshift(order);
    await saveOrders(ctx.host.kv, orders.slice(0, 100));

    return {
      ok: true as const,
      order,
      lineTotalUsd: Number((order.priceUsd * order.quantity).toFixed(2)),
      checkoutUrl: offer.url,
      warning:
        "No real purchase was made. This is a draft plan only.",
    };
  },
});
