import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";
import { toHeldWeapon } from "../heldWeapon";

/** tgiann-inventory 2.4.1 (client/exports.lua): `OpenInventory()` without a type opens the player's own. */
const RESOURCE = "tgiann-inventory";
export const tgiannInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => void callExport(RESOURCE, "OpenInventory"),
  hasItem: (item, count) =>
    callExport(RESOURCE, "HasItem", item, count) === true,
  itemCount: (item) => {
    const have: unknown = callExport(RESOURCE, "GetItemCount", item);
    return typeof have === "number" ? have : 0;
  },
  // `GetCurrentWeapon` answers two values (the held weapon item, the drop copy): the first is the item.
  currentWeapon: () => {
    const held: unknown = callExport(RESOURCE, "GetCurrentWeapon");
    return toHeldWeapon(Array.isArray(held) ? held[0] : held);
  },
};
