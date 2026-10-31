import type { MenuRequest } from "@aicore-fivem/shared";
import type { ItemPickerMessage } from "../features/dialogs/ItemPicker";
import type { MinigameMessage } from "../features/dialogs/Minigames";

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

const minigameView = new URLSearchParams(window.location.search).get("view");
const MINIGAME_TEXTS = {
  move: "Move the pick",
  turn: "Turn the lock",
  press: "Press on the green",
  cancel: "Give up",
  picks: "Picks",
};
/** Browser preview only: `?view=skillcheck` or `?view=lockpick`. */
export const MINIGAME_MOCK: MinigameMessage | undefined =
  minigameView === "skillcheck"
    ? {
        kind: "skillCheck",
        stages: [
          { area: 50, speed: 0.6 },
          { area: 40, speed: 0.85 },
          { area: 25, speed: 1 },
        ],
        keys: ["w", "a", "s", "d"],
        texts: MINIGAME_TEXTS,
      }
    : minigameView === "lockpick"
      ? { kind: "lockpick", pins: 3, area: 11, picks: 3, texts: MINIGAME_TEXTS }
      : undefined;
