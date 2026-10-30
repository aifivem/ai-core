import { callExport } from "@aicore-fivem/lib/server";
import type { InventoryAdapter, InventoryRef } from "@aicore-fivem/shared";
import { definition, definitions, isTrue, number, rows, stack } from "../parse";

/**
 * tgiann-inventory (server/exports.lua, shared/shared.lua of 2.4.1). Stacks are `{ slot, name, amount, info }`
 * keyed by slot; `AddItem` / `RemoveItem` take `(inv, item, amount, slot, info)` and accept a stash name as `inv`.
 * Usable items: tgiann-inventory calls the framework (`ESX.UseItem` / QB `CanUseItem`), which ai-core's bridge answers.
 */

const RESOURCE = "tgiann-inventory";

const call = (name: string, ...args: unknown[]): unknown => callExport(RESOURCE, name, ...args);

/** `Items(name)` asserts on an unknown item: a missing item is null here, not an error. */
function item(name: string): unknown {
  try {
    return call("Items", name);
  } catch {
    return null;
  }
}

const itemsOf = (ref: InventoryRef): unknown => (typeof ref === "number" ? call("GetPlayerItems", ref) : call("GetInventoryItems", ref));

export const tgiannInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "2.4.1",
  addItem: (ref, name, count, metadata, slot) => isTrue(call("AddItem", ref, name, count, slot, metadata)),
  removeItem: (ref, name, count, metadata, slot) => isTrue(call("RemoveItem", ref, name, count, slot, metadata)),
  getItemCount: (ref, name, metadata) => number(call("GetItemCount", ref, name, metadata)),
  canCarryItem: (ref, name, count) => isTrue(call("CanCarryItem", ref, name, count)),
  getItems: (ref) => {
    const labels = new Map<string, string>();
    const labelOf = (name: string): string => {
      let text = labels.get(name);
      if (text === undefined) labels.set(name, (text = definition(item(name), name)?.label ?? name));
      return text;
    };
    return rows(itemsOf(ref)).flatMap((row) => stack(row, labelOf) ?? []);
  },
  clearInventory: (ref) => void call("ClearInventory", ref),
  registerStash: (stash) => void call("RegisterStash", stash.name, stash.label, stash.slots, stash.maxWeight, undefined, stash.jobs.length ? stash.jobs : undefined),
  openInventory: (source, ref) => {
    if (typeof ref === "number") call("ForceOpenInventoryById", source, ref);
    else call("ForceOpenInventory", source, "stash", ref);
    return true;
  },
  getItemDefinition: (name) => definition(item(name), name),
  getItemDefinitions: () => definitions(call("Items")),
};
