import { cache, callExport } from "@aicore-fivem/lib/client";
import type {
  AppearanceClientAdapter,
  ClothingMenu,
} from "@aicore-fivem/shared";
import { qbOutfit } from "../qbOutfit";

const RESOURCE = "illenium-appearance";

const MENUS: Record<ClothingMenu, string> = {
  clothing: "illenium-appearance:client:openClothingShop",
  barber: "illenium-appearance:client:OpenBarberShop",
  outfits: "illenium-appearance:client:openOutfitMenu",
};

/**
 * illenium-appearance 5.7.0 (game/util.lua, client/client.lua, client/outfits.lua): `setPedAppearance(ped,
 * appearance)`, `getPedAppearance(ped)`; menus and job outfits are its client events (`loadJobOutfit` takes QB's
 * `{ outfitData }`), `reloadSkin` with `bypassChecks` true skips its cooldown.
 */
export const illeniumAppearance: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "5.7.0",
  apply: (ped, data) =>
    void callExport(RESOURCE, "setPedAppearance", ped, data),
  read: (ped) => callExport(RESOURCE, "getPedAppearance", ped),
  openMenu: (menu) => (TriggerEvent(MENUS[menu]), true),
  wearOutfit: (outfit) =>
    TriggerEvent(
      "illenium-appearance:client:loadJobOutfit",
      qbOutfit(cache.ped, outfit),
    ),
  reloadSkin: () => TriggerEvent("illenium-appearance:client:reloadSkin", true),
};
