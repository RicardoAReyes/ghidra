import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { compareProduct, searchCatalog } from "../lib/catalog.js";

export default defineTool({
  description: prompt`
    Search the multi-retailer product catalog (Amazon, Walmart, Target demo data).
    Use this when the user names an item vaguely and you need product ids,
    titles, and a quick best-price hint before comparing or watching.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({
    query: z.string().min(1).describe("Product name, brand, UPC, or keyword"),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  async execute({ query, limit }) {
    const products = searchCatalog(query, limit ?? 8).map((p) => {
      const cmp = compareProduct(p);
      return {
        productId: p.id,
        title: p.title,
        brand: p.brand,
        category: p.category,
        upc: p.upc ?? null,
        bestDeal: cmp.bestDeal
          ? {
              retailer: cmp.bestDeal.retailer,
              priceUsd: cmp.bestDeal.priceUsd,
              inStock: cmp.bestDeal.inStock,
            }
          : null,
        offerCount: cmp.offers.length,
      };
    });
    return {
      query,
      count: products.length,
      products,
      dataSource: "demo-catalog",
      note: "Prices are simulated demo quotes. Wire official APIs for production.",
    };
  },
});
