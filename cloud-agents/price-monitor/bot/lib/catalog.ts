/**
 * Demo catalog for Amazon / Walmart / Target price comparison.
 *
 * Swap `getLiveOffers` for official retailer or aggregator APIs
 * (product Advertising APIs, affiliate feeds, Keepa-style history)
 * when you attach credentials. Do not scrape retailer storefronts.
 */

export type Retailer = "amazon" | "walmart" | "target";

export type CatalogProduct = {
  id: string;
  title: string;
  brand: string;
  category: string;
  upc?: string;
  keywords: string[];
  /** Base shelf prices in USD by retailer. */
  basePrices: Partial<Record<Retailer, number>>;
  /** Typical shipping / fulfillment notes. */
  notes: Partial<Record<Retailer, string>>;
  inStock: Partial<Record<Retailer, boolean>>;
};

export type Offer = {
  retailer: Retailer;
  productId: string;
  title: string;
  priceUsd: number;
  inStock: boolean;
  shippingNote: string;
  url: string;
  observedAt: string;
};

export const RETAILERS: Retailer[] = ["amazon", "walmart", "target"];

export const CATALOG: CatalogProduct[] = [
  {
    id: "sku-airpods-pro-2",
    title: "Apple AirPods Pro (2nd generation) USB-C",
    brand: "Apple",
    category: "electronics",
    upc: "194253405721",
    keywords: ["airpods", "airpods pro", "apple earbuds", "wireless earbuds"],
    basePrices: { amazon: 189.99, walmart: 199.0, target: 199.99 },
    notes: {
      amazon: "Prime 1–2 day",
      walmart: "Shipping or pickup",
      target: "Order Pickup / Same Day",
    },
    inStock: { amazon: true, walmart: true, target: true },
  },
  {
    id: "sku-dyson-v15",
    title: "Dyson V15 Detect Cordless Vacuum",
    brand: "Dyson",
    category: "home",
    upc: "885609027157",
    keywords: ["dyson", "vacuum", "cordless vacuum", "v15"],
    basePrices: { amazon: 649.99, walmart: 699.0, target: 749.99 },
    notes: {
      amazon: "Ships from Amazon",
      walmart: "Free shipping $35+",
      target: "Limited stock in select stores",
    },
    inStock: { amazon: true, walmart: true, target: false },
  },
  {
    id: "sku-lego-icons-10316",
    title: "LEGO Icons Rivendell 10316",
    brand: "LEGO",
    category: "toys",
    upc: "673419377348",
    keywords: ["lego", "rivendell", "lotr", "icons 10316"],
    basePrices: { amazon: 469.99, walmart: 499.0, target: 499.99 },
    notes: {
      amazon: "Sold by Amazon",
      walmart: "Online only",
      target: "Ship to home",
    },
    inStock: { amazon: true, walmart: false, target: true },
  },
  {
    id: "sku-kindle-paperwhite",
    title: "Amazon Kindle Paperwhite (16 GB)",
    brand: "Amazon",
    category: "electronics",
    upc: "840307201282",
    keywords: ["kindle", "paperwhite", "ebook reader"],
    basePrices: { amazon: 139.99, walmart: 149.0, target: 149.99 },
    notes: {
      amazon: "Prime eligible",
      walmart: "2-day shipping",
      target: "Store aisle: Electronics",
    },
    inStock: { amazon: true, walmart: true, target: true },
  },
  {
    id: "sku-ninja-creami",
    title: "Ninja Creami Deluxe Ice Cream Maker",
    brand: "Ninja",
    category: "kitchen",
    upc: "622356595580",
    keywords: ["ninja", "creami", "ice cream maker"],
    basePrices: { amazon: 199.99, walmart: 179.0, target: 229.99 },
    notes: {
      amazon: "Frequently returned item",
      walmart: "Rollback candidate",
      target: "Circle offers may apply",
    },
    inStock: { amazon: true, walmart: true, target: true },
  },
  {
    id: "sku-bounty-select",
    title: "Bounty Select-A-Size Paper Towels 12 Mega Rolls",
    brand: "Bounty",
    category: "grocery",
    upc: "037000947486",
    keywords: ["bounty", "paper towels", "mega rolls"],
    basePrices: { amazon: 32.97, walmart: 28.48, target: 29.99 },
    notes: {
      amazon: "Subscribe & Save eligible",
      walmart: "Rollback",
      target: "Drive Up available",
    },
    inStock: { amazon: true, walmart: true, target: true },
  },
];

const RETAILER_HOST: Record<Retailer, string> = {
  amazon: "https://www.amazon.com/dp/demo",
  walmart: "https://www.walmart.com/ip/demo",
  target: "https://www.target.com/p/demo",
};

/** Deterministic day-scale price drift so scheduled scans look alive. */
export function quotePrice(
  product: CatalogProduct,
  retailer: Retailer,
  at: Date = new Date(),
): number | null {
  const base = product.basePrices[retailer];
  if (base == null) return null;
  const day = Math.floor(at.getTime() / 86_400_000);
  const seed = hash(`${product.id}:${retailer}:${day}`);
  // ±6% wobble, then snap to .99 endings for shelf realism.
  const factor = 0.94 + (seed % 1201) / 10000;
  const raw = base * factor;
  return Math.round(raw) - 0.01;
}

export function toOffer(
  product: CatalogProduct,
  retailer: Retailer,
  at: Date = new Date(),
): Offer | null {
  const priceUsd = quotePrice(product, retailer, at);
  if (priceUsd == null) return null;
  const inStock = product.inStock[retailer] ?? false;
  return {
    retailer,
    productId: product.id,
    title: product.title,
    priceUsd,
    inStock,
    shippingNote: product.notes[retailer] ?? "",
    url: `${RETAILER_HOST[retailer]}/${product.id}`,
    observedAt: at.toISOString(),
  };
}

export function searchCatalog(query: string, limit = 8): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG.slice(0, limit);
  const scored = CATALOG.map((p) => {
    const hay = [p.id, p.title, p.brand, p.category, p.upc ?? "", ...p.keywords]
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const token of q.split(/\s+/)) {
      if (hay.includes(token)) score += 1;
      if (p.id === token) score += 5;
    }
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.p);
}

export function findProduct(productId: string): CatalogProduct | undefined {
  const id = productId.trim().toLowerCase();
  return CATALOG.find(
    (p) =>
      p.id.toLowerCase() === id ||
      (p.upc != null && p.upc === productId.trim()),
  );
}

export function compareProduct(
  product: CatalogProduct,
  at: Date = new Date(),
): {
  productId: string;
  title: string;
  brand: string;
  offers: Offer[];
  bestDeal: Offer | null;
} {
  const offers = RETAILERS.map((r) => toOffer(product, r, at)).filter(
    (o): o is Offer => o != null && o.inStock,
  );
  const bestDeal =
    offers.length === 0
      ? null
      : offers.reduce((a, b) => (a.priceUsd <= b.priceUsd ? a : b));
  return {
    productId: product.id,
    title: product.title,
    brand: product.brand,
    offers,
    bestDeal,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
