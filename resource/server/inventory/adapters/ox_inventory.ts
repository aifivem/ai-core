import { callExport } from "@aicore-fivem/lib/server";
import type { InventoryAdapter } from "@aicore-fivem/shared";
import {
  definition,
  definitions,
  first,
  isTrue,
  number,
  rows,
  stack,
} from "../parse";

/**
 * ox_inventory (modules/inventory/server.lua, server.lua, modules/items/server.lua of 2.48.1). `AddItem` /
 * `RemoveItem` answer `success, response`. Usable items: ox_inventory calls the framework (`ESX.UseItem`,
 * Qbox `CanUseItem`), which ai-core's bridge answers.
 */

const RESOURCE = "ox_inventory";
const call = (name: string, ...args: unknown[]): unknown =>
  callExport(RESOURCE, name, ...args);

export const oxInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "2.48.1",
  addItem: (ref, item, count, metadata, slot) =>
    isTrue(call("AddItem", ref, item, count, metadata, slot)),
  removeItem: (ref, item, count, metadata, slot) =>
    isTrue(call("RemoveItem", ref, item, count, metadata, slot)),
  getItemCount: (ref, item, metadata) =>
    number(call("GetItemCount", ref, item, metadata)),
  canCarryItem: (ref, item, count, metadata) =>
    isTrue(call("CanCarryItem", ref, item, count, metadata)),
  getItems: (ref) =>
    rows(call("GetInventoryItems", ref)).flatMap(
      (row) => stack(row, (name) => name) ?? [],
    ),
  clearInventory: (ref) => void call("ClearInventory", ref),
  registerStash: (stash) =>
    void call(
      "RegisterStash",
      stash.name,
      stash.label,
      stash.slots,
      stash.maxWeight,
      undefined,
      stash.jobs.length
        ? Object.fromEntries(stash.jobs.map((job) => [job, 0]))
        : undefined,
    ),
  // forceOpenInventory answers the opened inventory's id, nothing when it could not open.
  openInventory: (source, ref) =>
    first(
      call(
        "forceOpenInventory",
        source,
        typeof ref === "number" ? "player" : "stash",
        ref,
      ),
    ) != null,
  getItemDefinition: (name) => definition(call("Items", name), name),
  getItemDefinitions: () => definitions(call("Items")),
};
