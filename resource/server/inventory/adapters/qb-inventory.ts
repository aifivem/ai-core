import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { InventoryAdapter, InventoryRef } from "@aicore-fivem/shared";
import { isTrue, number, rows, stack } from "../parse";

/**
 * qb-inventory (server/functions.lua of 2.2.3). Player items live in qb-core's `PlayerData.items`; other inventories
 * are read with `GetInventory(id)`. Item definitions come from qb-core's shared items, which ai-core does not keep,
 * so this adapter answers none (docs/compat/inventory.md). Usable items: qb-inventory calls QB `CanUseItem`, which
 * ai-core's bridge answers.
 */

const RESOURCE = "qb-inventory";
const call = (name: string, ...args: unknown[]): unknown => callExport(RESOURCE, name, ...args);

function itemsOf(ref: InventoryRef): unknown {
  if (typeof ref === "string") {
    const inventory = call("GetInventory", ref);
    return isRecord(inventory) ? inventory.items : undefined;
  }
  const player = callExport("qb-core", "GetPlayer", ref);
  return isRecord(player) && isRecord(player.PlayerData) ? player.PlayerData.items : undefined;
}

const stacksOf = (ref: InventoryRef) => rows(itemsOf(ref)).flatMap((row) => stack(row, (name) => name) ?? []);

export const qbInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "2.2.3",
  addItem: (ref, item, count, metadata, slot) => isTrue(call("AddItem", ref, item, count, slot, metadata)),
  // qb-inventory's RemoveItem takes no metadata: the slot picks a stack.
  removeItem: (ref, item, count, _metadata, slot) => isTrue(call("RemoveItem", ref, item, count, slot)),
  getItemCount: (ref, item) =>
    typeof ref === "number" ? number(call("GetItemCount", ref, item)) : stacksOf(ref).reduce((sum, s) => (s.name === item ? sum + s.count : sum), 0),
  canCarryItem: (ref, item, count) => isTrue(call("CanAddItem", ref, item, count)),
  getItems: stacksOf,
  clearInventory: (ref) => void (typeof ref === "number" ? call("ClearInventory", ref) : call("ClearStash", ref)),
  // qb-inventory has no job lock on stashes: `jobs` is not enforced.
  registerStash: (stash) => void call("CreateInventory", stash.name, { label: stash.label, maxweight: stash.maxWeight, slots: stash.slots }),
  openInventory: (source, ref) => {
    if (typeof ref === "number") call("OpenInventoryById", source, ref);
    else call("OpenInventory", source, ref);
    return true;
  },
  getItemDefinition: () => null,
  getItemDefinitions: () => ({}),
};
