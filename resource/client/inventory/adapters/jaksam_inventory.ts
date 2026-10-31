import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";

/**
 * jaksam_inventory (from envi-bridge, codem-lib): `getTotalItemAmount(item)` counts an item; no export is known that
 * opens the player's own inventory or gives the held weapon.
 */
const RESOURCE = "jaksam_inventory";
export const jaksamInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => undefined,
  hasItem: (item, count) => {
    const have: unknown = callExport(RESOURCE, "getTotalItemAmount", item);
    return typeof have === "number" && have >= count;
  },
  currentWeapon: () => null,
};
