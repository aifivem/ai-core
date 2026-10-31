import type { ItemPickerMessage } from "../features/dialogs/ItemPicker";

/** Browser preview only: `?view=items` shows the admin item picker. */
export const ITEMS_MOCK: ItemPickerMessage | undefined =
  new URLSearchParams(window.location.search).get("view") === "items"
    ? {
        title: "Items",
        items: [
          "bandage",
          "bread",
          "burger",
          "cola",
          "lockpick",
          "phone",
          "radio",
          "water",
          "weapon_pistol",
          "armour",
          "parachute",
          "scrapmetal",
          "money",
          "id_card",
        ].map((name) => ({
          name,
          label: name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
          weight: name === "weapon_pistol" ? 1200 : 250,
        })),
        room: { weight: 12_000, maxWeight: 80_000 },
        texts: {
          search: "Search items",
          empty: "No item matches",
          hint: "Click adds 1, Ctrl + click 10, Shift + click 100",
          list: "To take",
          listEmpty: "Click items on the left to add them here",
          take: "Take items",
          weight: "Weight",
          heavy: "That would go over the weight limit",
        },
      }
    : undefined;
