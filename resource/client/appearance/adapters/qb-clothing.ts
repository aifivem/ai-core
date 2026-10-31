import { cache, callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";
import { qbOutfit } from "../qbOutfit";

const RESOURCE = "qb-clothing";

/**
 * qb-clothing 1.2.0 (client.lua): its local event `qb-clothing:client:loadPlayerClothing (skin, ped)` dresses any
 * ped; it has no export that reads a ped's look and no barber event (barbers are its own zones). Menus
 * `qb-clothing:client:openMenu` (the full editor) and `openOutfitMenu`, job outfits `loadOutfit ({ outfitData })`,
 * export `reloadSkin`.
 */
export const qbClothing: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "1.2.0",
  apply: (ped, data) =>
    emit("qb-clothing:client:loadPlayerClothing", data, ped),
  openMenu: (menu) => {
    if (menu === "barber") return false;
    TriggerEvent(
      menu === "clothing"
        ? "qb-clothing:client:openMenu"
        : "qb-clothing:client:openOutfitMenu",
    );
    return true;
  },
  wearOutfit: (outfit) =>
    TriggerEvent("qb-clothing:client:loadOutfit", qbOutfit(cache.ped, outfit)),
  reloadSkin: () => void callExport(RESOURCE, "reloadSkin"),
};
