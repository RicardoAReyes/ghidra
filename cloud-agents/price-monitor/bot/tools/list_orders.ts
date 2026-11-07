import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadOrders } from "../lib/store.js";

export default defineTool({
  description: prompt`
    List draft purchase plans stored by draft_order.
    Use when the user asks what they planned to buy or for order history.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({
    status: z.enum(["draft", "approved", "cancelled", "all"]).optional(),
  }),
  async execute({ status }, ctx) {
    const orders = await loadOrders(ctx.host.kv);
    const filtered =
      !status || status === "all"
        ? orders
        : orders.filter((o) => o.status === status);
    return {
      count: filtered.length,
      orders: filtered,
    };
  },
});
