import type { InventoryAdapter } from "@aicore-fivem/shared"
import { aiInventory } from "./adapters/ai-inventory"
import { oxInventory } from "./adapters/ox_inventory"
import { qbInventory } from "./adapters/qb-inventory"
import { tgiannInventory } from "./adapters/tgiann-inventory"

/**
 * Every supported inventory, in detection order: `auto` uses the first one running. ai-inventory comes first
 * because it `provide`s ox_inventory and qb-inventory (those names read started while it runs).
 * A new inventory = one file in `adapters/` and one line here.
 */
export const INVENTORIES: readonly InventoryAdapter[] = [
  aiInventory,
  tgiannInventory,
  oxInventory,
  qbInventory,
]
