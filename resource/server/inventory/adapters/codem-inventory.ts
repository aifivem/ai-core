import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { InventoryAdapter, InventoryRef } from "@aicore-fivem/shared";
import { players } from "../../player/registry";
import {
  type ImageOf,
  definition,
  definitions,
  isTrue,
  number,
  rows,
  stack,
} from "../parse";

/**
 * codem-inventory (CodeM mInventory Remake, docs "Server Exports" on codem.gitbook.io; no version published).
 * Player calls take the source; stashes are read with `GetStashItems(id)` and written whole with `UpdateStash`.
 * codem-inventory has no server export to add to or remove from a stash, register one, open one for a player or check
 * carry weight (its `AddItem` checks weight itself). Usable items: the framework's, which ai-core's bridge answers.
 */

const RESOURCE = "codem-inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

const codemImage: ImageOf = (name, image) =>
  `nui://${RESOURCE}/html/itemimages/${image || `${name}.png`}`;

/** `GetInventory(identifier, source)`: the identifier is the framework id, the citizenid on ai-core's bridges. */
const stacksOf = (ref: InventoryRef) =>
  rows(
    typeof ref === "number"
      ? call("GetInventory", players.get(ref)?.citizenid, ref)
      : call("GetStashItems", ref),
  ).flatMap((row) => stack(row, (name) => name) ?? []);

export const codemInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "",
  addItem: (ref, item, count, metadata, slot) =>
    typeof ref === "number" &&
    isTrue(call("AddItem", ref, item, count, slot, metadata)),
  // RemoveItem takes no metadata: the slot picks a stack.
  removeItem: (ref, item, count, _metadata, slot) =>
    typeof ref === "number" &&
    isTrue(call("RemoveItem", ref, item, count, slot)),
  getItemCount: (ref, item) =>
    typeof ref === "number"
      ? number(call("GetItemsTotalAmount", ref, item))
      : stacksOf(ref).reduce(
          (sum, s) => (s.name === item ? sum + s.count : sum),
          0,
        ),
  canCarryItem: () => true,
  getItems: stacksOf,
  clearInventory: (ref) =>
    void (typeof ref === "number"
      ? call("ClearInventory", ref)
      : call("UpdateStash", ref, {})),
  registerStash: () => undefined,
  openInventory: () => false,
  getItemDefinition: (name) => {
    const list: unknown = call("GetItemList");
    return isRecord(list) ? definition(list[name], name, codemImage) : null;
  },
  getItemDefinitions: () => definitions(call("GetItemList"), codemImage),
};
