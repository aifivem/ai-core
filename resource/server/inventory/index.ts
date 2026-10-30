import { GlobalKey, isResourceStarted, registerExport, stateString } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  CORE,
  INVENTORY_STATE_KEY,
  type InventoryRef,
  type UsableItemHandler,
} from "@aicore-fivem/shared";
import { panel, settings } from "../content";
import { log } from "../log";
import { InventoryLayer } from "./layer";
import { INVENTORIES } from "./registry";

/**
 * ai-core's inventory exports: every script (lib `inventory`) and the bridge call these, the active inventory
 * answers through its adapter (`registry.ts`). The choice follows the panel setting and inventory starts / stops.
 */

const activeInventory = new GlobalKey(INVENTORY_STATE_KEY, stateString);

export const inventory = new InventoryLayer(INVENTORIES, {
  isStarted: isResourceStarted,
  version: (resource) => GetResourceMetadata(resource, "version", 0) || "?",
  announce: (resource) => {
    activeInventory.set(resource ?? undefined);
    emit(CORE.inventoryChangedEvent, resource);
  },
  log,
});

inventory.setChoice(settings.inventory);
panel.onChange("settings", () => inventory.setChoice(settings.inventory));

const candidates = new Set(INVENTORIES.map((adapter) => adapter.resource));
on(
  "onServerResourceStart",
  (resource: string) => candidates.has(resource) && inventory.select(),
);
on("onResourceStop", (resource: string) => {
  if (!candidates.has(resource)) return;
  inventory.select(resource);
  // Names the stopping resource `provide`s may still read started during its stop event.
  setTimeout(() => inventory.select(), 0);
});

const ref = (v: unknown): InventoryRef | null =>
  typeof v === "number" || (typeof v === "string" && v !== "") ? v : null;
const name = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : null;
/** A whole positive amount; 1 when left out. */
const amount = (v: unknown): number | null =>
  v == null
    ? 1
    : typeof v === "number" && Number.isFinite(v) && v >= 1
      ? Math.floor(v)
      : null;
const meta = (v: unknown) => (isRecord(v) ? v : undefined);
const slot = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined;

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
registerExport("GetItems", (inv: unknown) => {
  const r = ref(inv);
  return r === null ? [] : inventory.call("GetItems", (a) => a.getItems(r), []);
});
registerExport("ClearInventory", (inv: unknown) => {
  const r = ref(inv);
  if (r !== null)
    inventory.call("ClearInventory", (a) => a.clearInventory(r), undefined);
});
registerExport(
  "RegisterStash",
  (
    id: unknown,
    label: unknown,
    slots: unknown,
    maxWeight: unknown,
    jobs?: unknown,
  ) => {
    const n = name(id);
    if (n === null) return;
    inventory.registerStash({
      name: n,
      label: typeof label === "string" ? label : n,
      slots: typeof slots === "number" && slots > 0 ? Math.floor(slots) : 50,
      maxWeight:
        typeof maxWeight === "number" && maxWeight > 0 ? maxWeight : 100_000,
      jobs: Array.isArray(jobs)
        ? jobs.filter((j): j is string => typeof j === "string")
        : [],
    });
  },
);
registerExport("OpenInventory", (source: unknown, inv: unknown) => {
  const r = ref(inv);
  return (
    typeof source === "number" &&
    r !== null &&
    inventory.call("OpenInventory", (a) => a.openInventory(source, r), false)
  );
});
registerExport("RegisterUsableItem", (item: unknown, handler: unknown) => {
  const n = name(item);
  // A function from another resource arrives as a callable reference.
  if (n !== null && typeof handler === "function")
    inventory.registerUsableItem(n, handler as UsableItemHandler);
});
registerExport("GetItemDefinition", (item: unknown) => {
  const n = name(item);
  return n === null
    ? null
    : inventory.call("GetItemDefinition", (a) => a.getItemDefinition(n), null);
});
registerExport("GetItemDefinitions", () =>
  inventory.call("GetItemDefinitions", (a) => a.getItemDefinitions(), {}),
);
registerExport("UseItem", (source: unknown, item: unknown, data?: unknown) => {
  const n = name(item);
  return typeof source === "number" && n !== null
    ? inventory.useItem(source, n, data)
    : false;
});
registerExport(
  "IsUsableItem",
  (item: unknown) => typeof item === "string" && inventory.isUsable(item),
);
