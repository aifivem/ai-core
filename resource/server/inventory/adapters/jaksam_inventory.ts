import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { InventoryAdapter, ItemDefinition } from "@aicore-fivem/shared";
import { definition, isTrue, number, rows, stack } from "../parse";

/**
 * jaksam_inventory (jaksam1074; calls read from the bridges that support it: envi-bridge 0.5.3, codem-lib; no version
 * published). Lower-case exports that take a player source or a stash id. Items are defined with `stackable` instead
 * of `unique`. It has no server export that opens an inventory for a player (only its client `openInventory`).
 * Usable items: the framework's, which ai-core's bridge answers.
 */

const RESOURCE = "jaksam_inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

/** jaksam's static item: `stackable: false` is a unique item. */
const item = (raw: unknown, name: string): ItemDefinition | null =>
  isRecord(raw)
    ? definition({ ...raw, stack: raw.stackable !== false }, name)
    : null;

export const jaksamInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "",
  addItem: (ref, name, count, metadata, slot) =>
    isTrue(call("addItem", ref, name, count, metadata, slot)),
  removeItem: (ref, name, count, metadata, slot) =>
    isTrue(call("removeItem", ref, name, count, metadata, slot)),
  getItemCount: (ref, name, metadata) =>
    number(call("getTotalItemAmount", ref, name, metadata)),
  canCarryItem: (ref, name, count) =>
    isTrue(call("canCarryItem", ref, name, count)),
  getItems: (ref) => {
    const inv: unknown = call("getInventory", ref);
    return rows(isRecord(inv) ? inv.items : undefined).flatMap(
      (row) => stack(row, (name) => name) ?? [],
    );
  },
  clearInventory: (ref) => void call("clearInventory", ref),
  registerStash: (stash) =>
    void call("registerStash", {
      id: stash.name,
      label: stash.label,
      maxWeight: stash.maxWeight,
      maxSlots: stash.slots,
    }),
  openInventory: () => false,
  getItemDefinition: (name) => item(call("getStaticItem", name), name),
  getItemDefinitions: () => {
    const list: unknown = call("getStaticItemsList");
    const out: Record<string, ItemDefinition> = {};
    if (isRecord(list))
      for (const [name, raw] of Object.entries(list)) {
        const def = item(raw, name);
        if (def) out[name] = def;
      }
    return out;
  },
};
