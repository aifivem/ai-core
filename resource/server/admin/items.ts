import { isAdmin, onClientCallback } from "@aicore-fivem/lib/server";
import { ITEM_PICKER_CALLBACK, type PickerItem } from "@aicore-fivem/shared";
import { inventory } from "../inventory";

// The item picker of admin tools (lib `itemPicker`): every item of the active inventory, sorted by label.
onClientCallback(
  ITEM_PICKER_CALLBACK,
  (): PickerItem[] =>
    Object.entries(
      inventory.call("GetItemDefinitions", (a) => a.getItemDefinitions(), {}),
    )
      .map(([name, d]) => ({ name, label: d.label || name, image: d.image }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  { guards: [isAdmin()], rate: { count: 2, windowMs: 2000 } },
);
