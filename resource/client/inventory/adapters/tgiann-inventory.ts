import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";

/** tgiann-inventory 2.4.1 (client/exports.lua): `OpenInventory()` without a type opens the player's own. */
const RESOURCE = "tgiann-inventory";
export const tgiannInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => void callExport(RESOURCE, "OpenInventory"),
  hasItem: (item, count) =>
    callExport(RESOURCE, "HasItem", item, count) === true,
  // No client export for the held weapon item.
  currentWeapon: () => null,
};
