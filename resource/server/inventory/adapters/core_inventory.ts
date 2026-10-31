import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  InventoryAdapter,
  InventoryRef,
  InventoryStack,
} from "@aicore-fivem/shared";
import { definition, definitions, isTrue, number, stack } from "../parse";

/**
 * core_inventory (C8RE, docs "Exports & API" at docs.c8re.store/core-inventory/exports; no version published).
 * Inventories are named `<type>-<id>`; a player source resolves to the player's own. ai-core's stash `<name>` is
 * `stash-<name>` of core_inventory's `stash` type, whose slots and size come from its own `Config.Inventories` (the
 * stash definition's `slots` / `maxWeight` / `jobs` are not used); it is created when first opened or filled.
 * `removeItem` takes neither metadata nor a slot. Usable items: the framework's, which ai-core's bridge answers.
 */

const RESOURCE = "core_inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

const inv = (ref: InventoryRef) =>
  typeof ref === "number" ? ref : `stash-${ref}`;

/** Stash labels by name, shown when one opens. */
const labels = new Map<string, string>();

/** `getInventory(inv).content` is keyed by slot; its items carry no slot field. */
function stacksOf(ref: InventoryRef): InventoryStack[] {
  const data: unknown = call("getInventory", inv(ref));
  const content = isRecord(data) ? data.content : undefined;
  const entries = Array.isArray(content)
    ? content.map((row, i) => [String(i + 1), row] as const)
    : isRecord(content)
      ? Object.entries(content)
      : [];
  return entries.flatMap(([slot, row]) =>
    isRecord(row) ? (stack({ slot, ...row }, (name) => name) ?? []) : [],
  );
}

export const coreInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "",
  addItem: (ref, item, count, metadata) =>
    isTrue(call("addItem", inv(ref), item, count, metadata)),
  removeItem: (ref, item, count) =>
    isTrue(call("removeItem", inv(ref), item, count)),
  getItemCount: (ref, item) => number(call("getItemCount", inv(ref), item)),
  canCarryItem: (ref, item, count, metadata) =>
    isTrue(call("canCarry", inv(ref), item, count, metadata)),
  getItems: stacksOf,
  clearInventory: (ref) => void call("clearInventory", inv(ref)),
  registerStash: (stash) => void labels.set(stash.name, stash.label),
  openInventory: (source, ref) => {
    if (typeof ref === "number") call("openOtherPlayerInventory", source, ref);
    else
      call(
        "openInventory",
        source,
        inv(ref),
        "stash",
        labels.get(ref) ?? ref,
        undefined,
        true,
      );
    return true;
  },
  getItemDefinition: (name) => {
    const list: unknown = call("getItemsList");
    return isRecord(list) ? definition(list[name], name) : null;
  },
  getItemDefinitions: () => definitions(call("getItemsList")),
};
