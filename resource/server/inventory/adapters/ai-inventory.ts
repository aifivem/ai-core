import { resourceExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import { CORE, type InventoryAdapter } from "@aicore-fivem/shared";
import { definition, definitions, stack, type ImageOf } from "../parse";

/** ai-inventory, the default inventory (own exports, `@aicore-fivem/shared` `AiInventoryServerExports`). */

const RESOURCE = "ai-inventory";
const inv = resourceExport(RESOURCE);
const imageOf: ImageOf = (_name, image) =>
  image ? `nui://${RESOURCE}/dist/web/images/${image}` : undefined;

export const aiInventory: InventoryAdapter = {
  resource: RESOURCE,
  version: "0.1.0",
  addItem: (ref, item, count, metadata, slot) =>
    inv.AddItem(ref, item, count, metadata, slot) === true,
  removeItem: (ref, item, count, metadata, slot) =>
    inv.RemoveItem(ref, item, count, metadata, slot) === true,
  getItemCount: (ref, item, metadata) =>
    Number(inv.GetItemCount(ref, item, metadata)) || 0,
  canCarryItem: (ref, item, count, metadata) =>
    inv.CanCarryItem(ref, item, count, metadata) === true,
  getItems: (ref) => {
    const list: unknown = inv.GetItems(ref);
    return Array.isArray(list)
      ? list.filter(isRecord).flatMap((row) => stack(row, (name) => name) ?? [])
      : [];
  },
  clearInventory: (ref) => inv.ClearInventory(ref),
  registerStash: (stash) =>
    inv.RegisterStash(
      stash.name,
      stash.label,
      stash.slots,
      stash.maxWeight,
      stash.jobs,
    ),
  openInventory: (source, ref) => inv.OpenInventory(source, ref) === true,
  getItemDefinition: (name) => definition(inv.Items(name), name, imageOf),
  getItemDefinitions: () => definitions(inv.Items(), imageOf),
  getWeight: (source) => {
    const w: unknown = inv.GetWeight(source);
    return isRecord(w) &&
      typeof w.weight === "number" &&
      typeof w.maxWeight === "number"
      ? { weight: w.weight, maxWeight: w.maxWeight }
      : null;
  },
  registerUsableItem: (name, handler) => inv.RegisterUsableItem(name, handler),
  registerShop: (shop) => inv.RegisterShop(shop.name, shop.label, shop.items),
  openShop: (source, name) => inv.OpenShop(source, name) === true,
};

// ai-inventory's use event carries the needs an item gives; scripts listen to ai-core's event only.
on(
  "ai-inventory:usedItem",
  (
    source: number,
    name: string,
    _slot: number,
    _metadata: unknown,
    status: unknown,
  ) => {
    emit(CORE.itemUsedEvent, source, name, isRecord(status) ? status : null);
  },
);
