import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";

/**
 * origen_inventory (from envi-bridge, prp-bridge, codem-lib): `Search("count", item)` counts an item; no export is
 * known that opens the player's own inventory or gives the held weapon.
 */
const RESOURCE = "origen_inventory";
const countOf = (item: string): number => {
  const have: unknown = callExport(RESOURCE, "Search", "count", item);
  return typeof have === "number" ? have : 0;
};

export const origenInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => undefined,
  hasItem: (item, count) => countOf(item) >= count,
  itemCount: (item) => countOf(item),
  currentWeapon: () => null,
};
