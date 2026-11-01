import type { InventoryClientAdapter } from "@aicore-fivem/shared";
import { callExport } from "@aicore-fivem/lib/client";
import { toHeldWeapon } from "../heldWeapon";
import { stacksOf } from "../stacks";

/** ox_inventory 2.48.1 (client.lua, modules/inventory/client.lua): `openInventory()` without a type opens the player's own. */
const RESOURCE = "ox_inventory";
const countOf = (item: string): number => {
  const have: unknown = callExport(RESOURCE, "GetItemCount", item);
  return typeof have === "number" ? have : 0;
};

export const oxInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => void callExport(RESOURCE, "openInventory"),
  hasItem: (item, count) => countOf(item) >= count,
  itemCount: (item) => countOf(item),
  currentWeapon: () =>
    toHeldWeapon(
      callExport(RESOURCE, "getCurrentWeapon"),
      (name) => `nui://${RESOURCE}/web/images/${name}.png`,
    ),
  // `GetPlayerItems()` is its slot-keyed client inventory; `ox_inventory:itemCount (name, total)` on every change
  items: () => stacksOf(callExport(RESOURCE, "GetPlayerItems")),
  onChange: (listener) => on("ox_inventory:itemCount", listener),
};
