import type { InventoryAdapter } from "@aicore-fivem/shared";
import { aiInventory } from "./adapters/ai-inventory";
import { codemInventory } from "./adapters/codem-inventory";
import { coreInventory } from "./adapters/core_inventory";
import { jaksamInventory } from "./adapters/jaksam_inventory";
import { origenInventory } from "./adapters/origen_inventory";
import { oxInventory } from "./adapters/ox_inventory";
import { qbInventory } from "./adapters/qb-inventory";
import { qsInventory } from "./adapters/qs-inventory";
import { tgiannInventory } from "./adapters/tgiann-inventory";

/**
 * Every supported inventory, in detection order: `auto` uses the first one running. ai-inventory comes first
 * because it `provide`s ox_inventory and qb-inventory (those names read started while it runs).
 * A new inventory = one file in `adapters/`, one line here and its name in `names.ts`.
 */
export const INVENTORIES: readonly InventoryAdapter[] = [
  aiInventory,
  tgiannInventory,
  oxInventory,
  qbInventory,
  qsInventory,
  codemInventory,
  coreInventory,
  origenInventory,
  jaksamInventory,
];
