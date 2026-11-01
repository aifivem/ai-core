import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { InventoryAdapter } from "@aicore-fivem/shared";
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

/** ox_inventory pictures: `web/images/<name>.png` unless the item names its own file. */
const oxImage: ImageOf = (name, image) =>
  `nui://ox_inventory/web/images/${image || `${name}.png`}`;

/**
 * ox_inventory (modules/inventory/server.lua, server.lua, modules/items/server.lua of 2.48.1). `AddItem` /
 * `RemoveItem` answer `success, response`. Usable items: ox_inventory calls the framework (`ESX.UseItem`,
 * Qbox `CanUseItem`), which ai-core's bridge answers. Shops (modules/shops/server.lua): `RegisterShop(type, { name,
 * inventory })` without locations; its server cannot force a shop open, its client net event
 * `ox_inventory:openInventory ('shop', { type })` opens one. `SetMetadata(inv, slot, metadata)` and
 * `SetMaxWeight(inv, weight)` answer nothing: the slot and the inventory are checked first (`GetSlot`, `GetInventory`).
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
  getItemDefinition: (name) => definition(call("Items", name), name, oxImage),
  getItemDefinitions: () => definitions(call("Items"), oxImage),
  getWeight: (source) => {
    const inv = first(call("GetInventory", source));
    return isRecord(inv) &&
      typeof inv.weight === "number" &&
      typeof inv.maxWeight === "number"
      ? { weight: inv.weight, maxWeight: inv.maxWeight }
      : null;
  },
  setMetadata: (ref, slot, metadata) => {
    if (first(call("GetSlot", ref, slot)) == null) return false;
    call("SetMetadata", ref, slot, metadata);
    return true;
  },
  setMaxWeight: (source, grams) => {
    if (!isRecord(first(call("GetInventory", source)))) return false;
    call("SetMaxWeight", source, grams);
    return true;
  },
  registerShop: (shop) =>
    void call("RegisterShop", shop.name, {
      name: shop.label,
      inventory: shop.items.map((p) => ({ name: p.name, price: p.price })),
    }),
  openShop: (source, name) => {
    TriggerClientEvent("ox_inventory:openInventory", source, "shop", {
      type: name,
    });
    return true;
  },
};
