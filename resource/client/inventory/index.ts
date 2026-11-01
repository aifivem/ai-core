import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  CLIENT_ITEM_COUNT_EVENT,
  CORE,
  INVENTORY_STATE_KEY,
  type InventoryStack,
} from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapterFollower";
import { aiInventory } from "./adapters/ai-inventory";
import { codemInventory } from "./adapters/codem-inventory";
import { coreInventory } from "./adapters/core_inventory";
import { jaksamInventory } from "./adapters/jaksam_inventory";
import { origenInventory } from "./adapters/origen_inventory";
import { oxInventory } from "./adapters/ox_inventory";
import { qbInventory } from "./adapters/qb-inventory";
import { qsInventory } from "./adapters/qs-inventory";
import { tgiannInventory } from "./adapters/tgiann-inventory";
import "./definitions";

const ADAPTERS = [
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

/** The client half of the inventory layer: follows the inventory the server picked (GlobalState). */
const inventory = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(INVENTORY_STATE_KEY, stateString),
  createLogger("ai-core"),
);

registerExport("OpenInventory", () =>
  inventory.call("openInventory", (a) => a.openInventory(), undefined),
);
registerExport(
  "HasItem",
  (item: unknown, count?: unknown) =>
    typeof item === "string" &&
    inventory.call(
      "hasItem",
      (a) =>
        a.hasItem(item, typeof count === "number" && count > 0 ? count : 1),
      false,
    ),
);
registerExport("GetItemCount", (item: unknown) =>
  typeof item === "string"
    ? inventory.call("itemCount", (a) => a.itemCount(item), null)
    : null,
);
registerExport("GetCurrentWeapon", () =>
  inventory.call("currentWeapon", (a) => a.currentWeapon(), null),
);
registerExport("GetItems", () =>
  inventory.call("items", (a) => a.items(), null),
);

/**
 * Item count events (`CLIENT_ITEM_COUNT_EVENT`): the active inventory says something changed, the totals are read
 * once at the end of the tick (inventories report one change per item) and only the items whose total moved are sent.
 */
let counts = new Map<string, number>();
let queued = false;

function totals(stacks: InventoryStack[]): Map<string, number> {
  const next = new Map<string, number>();
  for (const s of stacks) next.set(s.name, (next.get(s.name) ?? 0) + s.count);
  return next;
}

function flush(): void {
  queued = false;
  const stacks = inventory.call("items", (a) => a.items(), null);
  if (!stacks) return;
  const next = totals(stacks);
  for (const [item, count] of next) {
    const previous = counts.get(item) ?? 0;
    if (count !== previous)
      emit(CLIENT_ITEM_COUNT_EVENT, item, count, previous);
  }
  for (const [item, previous] of counts)
    if (!next.has(item)) emit(CLIENT_ITEM_COUNT_EVENT, item, 0, previous);
  counts = next;
}

for (const adapter of ADAPTERS)
  adapter.onChange?.(() => {
    if (inventory.active !== adapter || queued) return;
    queued = true;
    setTimeout(flush, 0);
  });
// A new character starts from nothing: its first counts arrive as changes from 0
on(CORE.clientPlayerUnloadedEvent, () => {
  counts = new Map();
});
