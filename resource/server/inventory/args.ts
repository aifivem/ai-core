import { isRecord } from "@aicore-fivem/lib/shared";
import type { InventoryRef, ShopProduct } from "@aicore-fivem/shared";

/** Arguments of the inventory exports, from other resources. */

export const ref = (v: unknown): InventoryRef | null =>
  typeof v === "number" || (typeof v === "string" && v !== "") ? v : null;
export const name = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null;
/** A whole positive amount; 1 when left out. */
export const amount = (v: unknown): number | null =>
  v == null
    ? 1
    : typeof v === "number" && Number.isFinite(v) && v >= 1
      ? Math.floor(v)
      : null;
export const meta = (v: unknown) => (isRecord(v) ? v : undefined);
export const slot = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;

/** Shop products from another resource: `{ name, price }` with a whole price of 0 or more, at most 200. */
export function products(v: unknown): ShopProduct[] {
  if (!Array.isArray(v)) return [];
  const list: ShopProduct[] = [];
  for (const row of (v as unknown[]).slice(0, 200)) {
    if (!isRecord(row)) continue;
    const item = name(row.name);
    const price = row.price;
    if (
      item !== null &&
      typeof price === "number" &&
      Number.isInteger(price) &&
      price >= 0
    )
      list.push({ name: item, price });
  }
  return list;
}
