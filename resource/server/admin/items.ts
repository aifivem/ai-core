import { isAdmin, isOnline, onClientCallback } from "@aicore-fivem/lib/server";
import { ITEM_PICKER_CALLBACK, type ItemPickerData } from "@aicore-fivem/shared";
import { inventory } from "../inventory";

// The item picker of admin tools (lib `itemPicker`): every item of the active inventory sorted by label, and the
// target's carried weight so the list can stop at the limit (the give itself is checked again by the inventory).
onClientCallback(
  ITEM_PICKER_CALLBACK,
  {
    guards: [isAdmin()],
    rate: { count: 2, windowMs: 2000 },
    args: ([target]) => [
      typeof target === "number" && Number.isInteger(target) ? target : null,
    ],
  },
  (source, target): ItemPickerData => {
    const who = target !== null && isOnline(target) ? target : source;
    const items = Object.entries(
      inventory.call("GetItemDefinitions", (a) => a.getItemDefinitions(), {}),
    )
      .map(([name, d]) => ({
        name,
        label: d.label || name,
        image: d.image,
        weight: d.weight,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const room = inventory.call(
      "GetWeight",
      (a) => a.getWeight?.(who) ?? null,
      null,
    );
    return { items, room };
  },
);
