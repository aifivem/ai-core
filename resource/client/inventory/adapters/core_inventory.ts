import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";
import { toHeldWeapon } from "../heldWeapon";

/** core_inventory (docs.c8re.store/core-inventory/exports): `openInventory()` opens the player's own, `getItemCount(item)` counts. */
const RESOURCE = "core_inventory";
export const coreInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => void callExport(RESOURCE, "openInventory"),
  hasItem: (item, count) =>
    callExport(RESOURCE, "hasItem", item, count) === true,
  itemCount: (item) => {
    const have: unknown = callExport(RESOURCE, "getItemCount", item);
    return typeof have === "number" ? have : 0;
  },
  currentWeapon: () => toHeldWeapon(callExport(RESOURCE, "getWeaponEquiped")),
  // No client item list export is known.
  items: () => null,
};
