import type { Retailer } from "./catalog.js";

export type WatchItem = {
  productId: string;
  title: string;
  targetPriceUsd: number | null;
  preferredRetailers: Retailer[];
  addedAt: string;
  lastBestPriceUsd: number | null;
  lastBestRetailer: Retailer | null;
  lastCheckedAt: string | null;
};

export type DraftOrder = {
  orderId: string;
  productId: string;
  title: string;
  retailer: Retailer;
  priceUsd: number;
  quantity: number;
  status: "draft" | "approved" | "cancelled";
  createdAt: string;
  note: string;
};

type Kv = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
};

const WATCHLIST_KEY = "commerce:watchlist";
const ORDERS_KEY = "commerce:orders";

function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

export async function loadWatchlist(kv: Kv): Promise<WatchItem[]> {
  return asArray<WatchItem>(await kv.get(WATCHLIST_KEY));
}

export async function saveWatchlist(kv: Kv, items: WatchItem[]): Promise<void> {
  await kv.put(WATCHLIST_KEY, items);
}

export async function loadOrders(kv: Kv): Promise<DraftOrder[]> {
  return asArray<DraftOrder>(await kv.get(ORDERS_KEY));
}

export async function saveOrders(kv: Kv, orders: DraftOrder[]): Promise<void> {
  await kv.put(ORDERS_KEY, orders);
}

export function newOrderId(): string {
  return `ord-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;
}
