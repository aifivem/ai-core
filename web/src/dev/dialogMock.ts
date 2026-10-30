import type { MenuRequest } from "@aicore-fivem/shared";
import type { ItemPickerData } from "../features/dialogs/ItemPicker";

/** Browser preview only: `?view=menu` shows a job menu. */
export const MENU_MOCK: MenuRequest | undefined =
  new URLSearchParams(window.location.search).get("view") === "menu"
    ? {
        title: "Police",
        items: [
          {
            id: "cuff",
            label: "Cuff",
            icon: "lock",
            description: "The closest player",
          },
          { id: "escort", label: "Escort", icon: "user" },
          { id: "search", label: "Search", icon: "box-open" },
          { id: "fine", label: "Write a fine", icon: "money-bill-wave" },
          {
            id: "impound",
            label: "Impound the vehicle",
            icon: "car-rear",
            disabled: true,
          },
        ],
      }
    : undefined;

/** Browser preview only: `?view=items` shows the admin item picker. */
export const ITEMS_MOCK: ItemPickerData | undefined =
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
        })),
        texts: {
          search: "Search items",
          count: "Count",
          empty: "No item matches",
          hint: "Click an item to take it",
        },
      }
    : undefined;
