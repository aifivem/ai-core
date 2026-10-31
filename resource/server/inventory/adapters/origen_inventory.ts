import { callExport } from "@aicore-fivem/lib/server";
import type { InventoryAdapter, InventoryRef } from "@aicore-fivem/shared";
import { definition, definitions, isTrue, number, rows, stack } from "../parse";

/**
 * origen_inventory (Origen Network; its docs site is offline, calls read from the bridges that support it: envi-bridge
 * 0.5.3, prp-bridge 1.1.5, codem-lib, p_bridge 1.2.5; no version published). ox_inventory-like exports that take a
 * player source or a stash id. It has no server export that opens an inventory for a player (only its client
 * `openInventory`) and none that clears one, so a clear removes every stack. Usable items: the framework's, which
 * ai-core's bridge answers.
 */

const RESOURCE = "origen_inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

const stacksOf = (ref: InventoryRef) =>
  rows(call("getInventoryItems", ref)).flatMap(
    (row) => stack(row, (name) => name) ?? [],
  );

export const origenInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "",
  addItem: (ref, item, count, metadata, slot) =>
    isTrue(call("addItem", ref, item, count, metadata, slot)),
  removeItem: (ref, item, count, metadata, slot) =>
    isTrue(call("removeItem", ref, item, count, metadata, slot)),
  getItemCount: (ref, item, metadata) =>
    number(call("getItemCount", ref, item, metadata)),
  canCarryItem: (ref, item, count) =>
    isTrue(call("canCarryItem", ref, item, count)),
  getItems: stacksOf,
  clearInventory: (ref) => {
    for (const s of stacksOf(ref))
      call("removeItem", ref, s.name, s.count, undefined, s.slot);
  },
  // Job locks are not passed: the shape of origen's `groups` argument is not documented.
  registerStash: (stash) =>
    void call(
      "RegisterStash",
      stash.name,
      stash.label,
      stash.slots,
      stash.maxWeight,
    ),
  openInventory: () => false,
  getItemDefinition: (name) => definition(call("Items", name), name),
  getItemDefinitions: () => definitions(call("Items")),
};
