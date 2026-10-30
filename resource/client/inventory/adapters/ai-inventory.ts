import { resourceExport } from "@aicore-fivem/lib/client";
import type { InventoryClientAdapter } from "@aicore-fivem/shared";

/** ai-inventory's own client exports. */
export const aiInventory: InventoryClientAdapter = {
  resource: "ai-inventory",
  openInventory: () => resourceExport("ai-inventory").OpenSelf(),
  hasItem: (item, count) =>
    resourceExport("ai-inventory").HasItem(item, count) === true,
};
