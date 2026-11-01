import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { UsableItemHandler } from "@aicore-fivem/shared";
import { inventory } from "./active";
import { name, ref, slot } from "./args";

/** Usable items, item definitions, weights and stack metadata. */

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
/** A player's carried weight and limit (grams); null when the active inventory does not tell them. */
registerExport("GetInventoryWeight", (source: unknown) =>
  typeof source === "number"
    ? inventory.call(
        "GetInventoryWeight",
        (a) => a.getWeight?.(source) ?? null,
        null,
      )
    : null,
);
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
registerExport("GetUsableItems", () => inventory.usableNames());
registerExport(
  "SetItemMetadata",
  (inv: unknown, at: unknown, metadata: unknown) => {
    const [r, s] = [ref(inv), slot(at)];
    return (
      r !== null &&
      s !== undefined &&
      isRecord(metadata) &&
      inventory.call(
        "SetItemMetadata",
        (a) => a.setMetadata(r, s, { ...metadata }),
        false,
      )
    );
  },
);
registerExport("SetMaxWeight", (source: unknown, grams: unknown) => {
  if (
    typeof source !== "number" ||
    typeof grams !== "number" ||
    !Number.isFinite(grams) ||
    grams < 0
  )
    return false;
  const limit = Math.floor(grams);
  return inventory.call(
    "SetMaxWeight",
    (a) => a.setMaxWeight(source, limit),
    false,
  );
});
