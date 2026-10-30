import { callExport, resourceExport } from "@aicore-fivem/lib/client";
import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { toHeldWeapon } from "../heldWeapon";

/** ai-inventory's own client exports; the held weapon through the ox_inventory name it answers. */
const inv = resourceExport("ai-inventory");

export const aiInventory: InventoryClientAdapter = {
  resource: "ai-inventory",
  openInventory: () => inv.OpenSelf(),
  hasItem: (item, count) => inv.HasItem(item, count) === true,
  currentWeapon: () =>
    toHeldWeapon(callExport("ox_inventory", "getCurrentWeapon")),
};
