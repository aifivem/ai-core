import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { stacksOf } from "../stacks";

/**
 * codem-inventory (codem.gitbook.io mInventory Remake "Client Exports"): only `GetItemList` and `getUserInventory`
 * (the player's stacks: `name`, `amount`) are exported; the own inventory opens only with its key.
 */
const RESOURCE = "codem-inventory";

/** The sum of the player's `getUserInventory` stacks of an item. */
function countOf(item: string): number {
  const items: unknown = callExport(RESOURCE, "getUserInventory");
  let have = 0;
  if (isRecord(items) || Array.isArray(items))
    for (const row of Object.values(items))
      if (isRecord(row) && row.name === item && typeof row.amount === "number")
        have += row.amount;
  return have;
}
export const codemInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => undefined,
  hasItem: (item, count) => countOf(item) >= count,
  itemCount: (item) => countOf(item),
  currentWeapon: () => null,
  // No change event is known: item count events stay silent with it
  items: () => stacksOf(callExport(RESOURCE, "getUserInventory")),
};
