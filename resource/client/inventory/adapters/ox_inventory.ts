import type { InventoryClientAdapter } from "@aicore-fivem/shared"
import { callExport } from "@aicore-fivem/lib/client"

/** ox_inventory 2.48.1 (client.lua, modules/inventory/client.lua): `openInventory()` without a type opens the player's own. */
const RESOURCE = "ox_inventory"
export const oxInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => void callExport(RESOURCE, "openInventory"),
  hasItem: (item, count) => {
    const have: unknown = callExport(RESOURCE, "GetItemCount", item)
    return typeof have === "number" && have >= count
  },
}
