import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { compareProduct, findProduct, RETAILERS } from "../lib/catalog.js";

export default defineTool({
  description: prompt`
    Compare live demo prices for one product across Amazon, Walmart, and Target.
    Prefer productId from search_products. Returns in-stock offers, the best deal,
    and savings versus the most expensive stocked offer.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({
    productId: z
      .string()
      .min(1)
      .describe("Catalog product id (e.g. sku-ninja-creami) or UPC"),
  }),
  async execute({ productId }) {
    const product = findProduct(productId);
    if (!product) {
      return {
        ok: false as const,
        error: `Unknown productId "${productId}". Call search_products first.`,
        retailers: RETAILERS,
      };
    }
    const cmp = compareProduct(product);
    const max = cmp.offers.reduce(
      (m, o) => Math.max(m, o.priceUsd),
      cmp.bestDeal?.priceUsd ?? 0,
    );
    return {
      ok: true as const,
      productId: cmp.productId,
      title: cmp.title,
      brand: cmp.brand,
      offers: cmp.offers,
      bestDeal: cmp.bestDeal,
      savingsVsHighestUsd:
        cmp.bestDeal && max > cmp.bestDeal.priceUsd
          ? Number((max - cmp.bestDeal.priceUsd).toFixed(2))
          : 0,
      missingRetailers: RETAILERS.filter(
        (r) => !cmp.offers.some((o) => o.retailer === r),
      ),
      dataSource: "demo-catalog",
    };
  },
});
