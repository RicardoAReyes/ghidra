import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description:
    "Compares a known catalog item across Amazon, Walmart, and Target.",
  async test(t) {
    await t.send(
      'Compare prices for product id "sku-ninja-creami" across Amazon, Walmart, and Target. Use tools.',
    );
    t.succeeded();
    t.calledTool("compare_prices");
  },
});
