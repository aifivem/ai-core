import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { CarryItem } from "@aicore-fivem/shared";
import { inventory } from "./active";
import { amount, meta, name, ref, slot } from "./args";

/** Item exports: add, remove, count, carry, list and clear. */

registerExport(
  "AddItem",
  (
    inv: unknown,
    item: unknown,
    count?: unknown,
    metadata?: unknown,
    at?: unknown,
  ) => {
    const [r, i, n] = [ref(inv), name(item), amount(count)];
    return (
      r !== null &&
      i !== null &&
      n !== null &&
      inventory.call(
        "AddItem",
        (a) => a.addItem(r, i, n, meta(metadata), slot(at)),
        false,
      )
    );
  },
);
registerExport(
  "RemoveItem",
  (
    inv: unknown,
    item: unknown,
    count?: unknown,
    metadata?: unknown,
    at?: unknown,
  ) => {
    const [r, i, n] = [ref(inv), name(item), amount(count)];
    return (
      r !== null &&
      i !== null &&
      n !== null &&
      inventory.call(
        "RemoveItem",
        (a) => a.removeItem(r, i, n, meta(metadata), slot(at)),
        false,
      )
    );
  },
);
const count = (inv: unknown, item: unknown, metadata?: unknown): number => {
  const [r, i] = [ref(inv), name(item)];
  return r !== null && i !== null
    ? inventory.call(
        "GetItemCount",
        (a) => a.getItemCount(r, i, meta(metadata)),
        0,
      )
    : 0;
};
registerExport("GetItemCount", count);
registerExport("HasItem", (inv: unknown, item: unknown, need?: unknown) => {
  const n = amount(need);
  return n !== null && count(inv, item) >= n;
});
registerExport(
  "CanCarryItem",
  (inv: unknown, item: unknown, count?: unknown, metadata?: unknown) => {
    const [r, i, n] = [ref(inv), name(item), amount(count)];
    return (
      r !== null &&
      i !== null &&
      n !== null &&
      inventory.call(
        "CanCarryItem",
        (a) => a.canCarryItem(r, i, n, meta(metadata)),
        false,
      )
    );
  },
);
registerExport("CanCarryItems", (inv: unknown, items: unknown) => {
  const r = ref(inv);
  if (r === null || !Array.isArray(items)) return false;
  const list: CarryItem[] = [];
  for (const raw of items) {
    if (!isRecord(raw)) return false;
    const [i, n] = [name(raw.name), amount(raw.count ?? raw.amount)];
    if (i === null || n === null) return false;
    list.push({ name: i, count: n, metadata: meta(raw.metadata ?? raw.info) });
  }
  return inventory.call(
    "CanCarryItems",
    (a) =>
      a.canCarryItems
        ? a.canCarryItems(r, list)
        : list.every((it) => a.canCarryItem(r, it.name, it.count, it.metadata)),
    false,
  );
});
registerExport("GetItems", (inv: unknown) => {
  const r = ref(inv);
  return r === null ? [] : inventory.call("GetItems", (a) => a.getItems(r), []);
});
registerExport("ClearInventory", (inv: unknown) => {
  const r = ref(inv);
  if (r !== null)
    inventory.call("ClearInventory", (a) => a.clearInventory(r), undefined);
});
