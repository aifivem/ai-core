import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";
import { toHeldWeapon } from "../heldWeapon";

/** qs-inventory (quasar-store.com/docs/inventory): the own inventory opens through its `inventory` command. */
const RESOURCE = "qs-inventory";
export const qsInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => ExecuteCommand("inventory"),
  hasItem: (item, count) => {
    const have: unknown = callExport(RESOURCE, "Search", item);
    return typeof have === "number" && have >= count;
  },
  // `GetCurrentWeapon()` answers the held weapon item, or an empty table.
  currentWeapon: () =>
    toHeldWeapon(
      callExport(RESOURCE, "GetCurrentWeapon"),
      (name) => `nui://${RESOURCE}/html/images/${name}.png`,
    ),
};
