import type { InventoryStack } from "@aicore-fivem/shared";
import { isRecord } from "@aicore-fivem/lib/shared";

/**
 * An inventory's client item list (an array or a slot-keyed table) as ai-core's stacks: `count` or `amount`,
 * `metadata` or `info` (ox, QB and tgiann shapes); rows without a name, count or slot are skipped.
 */
export function stacksOf(list: unknown): InventoryStack[] | null {
  if (!isRecord(list) && !Array.isArray(list)) return null;
  const stacks: InventoryStack[] = [];
  for (const row of Object.values(list)) {
    if (!isRecord(row) || typeof row.name !== "string") continue;
    const count = typeof row.count === "number" ? row.count : row.amount;
    if (typeof count !== "number" || count <= 0 || typeof row.slot !== "number")
      continue;
    const metadata = isRecord(row.metadata)
      ? row.metadata
      : isRecord(row.info)
        ? row.info
        : {};
    stacks.push({
      name: row.name,
      label: typeof row.label === "string" ? row.label : row.name,
      count,
      slot: row.slot,
      metadata,
    });
  }
  return stacks;
}
