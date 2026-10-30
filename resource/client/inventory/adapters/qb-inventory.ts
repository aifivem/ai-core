import type { InventoryClientAdapter } from "@aicore-fivem/shared"
import { callExport } from "@aicore-fivem/lib/client"

/** qb-inventory 2.2.3 (client/main.lua): the own inventory opens through its `inventory` command. */
const RESOURCE = "qb-inventory"
export const qbInventory: InventoryClientAdapter = {
  resource: RESOURCE,
  openInventory: () => ExecuteCommand("inventory"),
  hasItem: (item, count) =>
    callExport(RESOURCE, "HasItem", item, count) === true,
}
