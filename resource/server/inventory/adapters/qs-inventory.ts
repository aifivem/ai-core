import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  InventoryAdapter,
  InventoryRef,
  StashDefinition,
} from "@aicore-fivem/shared";
import {
  type ImageOf,
  definition,
  definitions,
  first,
  isTrue,
  number,
  rows,
  stack,
} from "../parse";

/**
 * qs-inventory (Quasar, docs "Commands and Exports" at quasar-store.com/docs/inventory; no version published).
 * Player calls take the source; a stash `<name>` lives as `Stash_<name>`. qs-inventory has no server export that only
 * registers a stash: its `RegisterStash(source, id, slots, weight, label)` opens it for that player, so the definitions
 * are kept here and used when one opens. Another player's inventory opens through the `qb-inventory` export names it
 * answers (`OpenInventoryById`). Usable items: qs-inventory registers its own with the framework, ai-core's bridge
 * answers framework item use.
 */

const RESOURCE = "qs-inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

const qsImage: ImageOf = (name, image) =>
  `nui://${RESOURCE}/html/images/${image || `${name}.png`}`;

/** The stashes ai-core registered, by name (qs-inventory gets them at opening). */
const stashes = new Map<string, StashDefinition>();
const stashId = (name: string) => `Stash_${name}`;
/** qs-inventory's stash exports answer false when they refuse. */
const notRefused = (value: unknown) => first(value) !== false;

const stacksOf = (ref: InventoryRef) =>
  rows(
    typeof ref === "number"
      ? call("GetInventory", ref)
      : call("GetStashItems", stashId(ref)),
  ).flatMap((row) => stack(row, (name) => name) ?? []);

export const qsInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "",
  addItem: (ref, item, count, metadata, slot) => {
    if (typeof ref === "number")
      return isTrue(call("AddItem", ref, item, count, slot, metadata));
    const stash = stashes.get(ref);
    return notRefused(
      call(
        "AddItemIntoStash",
        stashId(ref),
        item,
        count,
        slot,
        metadata ?? {},
        stash?.slots,
        stash?.maxWeight,
      ),
    );
  },
  removeItem: (ref, item, count, metadata, slot) =>
    typeof ref === "number"
      ? isTrue(call("RemoveItem", ref, item, count, slot, metadata))
      : notRefused(call("RemoveItemIntoStash", stashId(ref), item, count)),
  // GetItemTotalAmount takes no metadata.
  getItemCount: (ref, item) =>
    typeof ref === "number"
      ? number(call("GetItemTotalAmount", ref, item))
      : stacksOf(ref).reduce(
          (sum, s) => (s.name === item ? sum + s.count : sum),
          0,
        ),
  canCarryItem: (ref, item, count) =>
    typeof ref === "number"
      ? isTrue(call("CanCarryItem", ref, item, count))
      : isTrue(call("StashCanCarryItem", stashId(ref), item, count)),
  getItems: stacksOf,
  clearInventory: (ref) =>
    void (typeof ref === "number"
      ? call("ClearInventory", ref)
      : call("ClearOtherInventory", "stash", stashId(ref))),
  registerStash: (stash) => void stashes.set(stash.name, stash),
  openInventory: (source, ref) => {
    if (typeof ref === "number") {
      callExport("qb-inventory", "OpenInventoryById", source, ref);
      return true;
    }
    const stash = stashes.get(ref);
    if (!stash) return false;
    call(
      "RegisterStash",
      source,
      stash.name,
      stash.slots,
      stash.maxWeight,
      stash.label,
    );
    return true;
  },
  getItemDefinition: (name) => {
    const list: unknown = call("GetItemList");
    return isRecord(list) ? definition(list[name], name, qsImage) : null;
  },
  getItemDefinitions: () => definitions(call("GetItemList"), qsImage),
};
