import type { MenuRequest } from "@aicore-fivem/shared";

/** Browser preview only: `?view=menu` shows a job menu. */
export const MENU_MOCK: MenuRequest | undefined =
  new URLSearchParams(window.location.search).get("view") === "menu"
    ? {
        title: "Police",
        items: [
          { id: "cuff", label: "Cuff", icon: "lock", description: "The closest player" },
          { id: "escort", label: "Escort", icon: "user" },
          { id: "search", label: "Search", icon: "box-open" },
          { id: "fine", label: "Write a fine", icon: "money-bill-wave" },
          { id: "impound", label: "Impound the vehicle", icon: "car-rear", disabled: true },
        ],
      }
    : undefined;
