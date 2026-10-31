import { callExport } from "@aicore-fivem/lib/client";
import type {
  AppearanceClientAdapter,
  ClothingMenu,
  OutfitPiece,
} from "@aicore-fivem/shared";

const RESOURCE = "tgiann-clothing";

const MENUS: Record<ClothingMenu, string> = {
  clothing: "OpenClothingShop",
  barber: "OpenBarberShop",
  // The outfit stash with clothing as items, else the saved outfits menu.
  outfits: "OpenOutfitChanger",
};

/** tgiann outfit parts: `{ [id]: { collection, index, texture } }` (the id may be text, it reads `tonumber(id)`). */
const parts = (pieces: OutfitPiece[]) =>
  Object.fromEntries(
    pieces.map((p) => [
      String(p.id),
      { collection: p.collection, index: p.index, texture: p.texture },
    ]),
  );

/**
 * tgiann-clothing 4.1.0 (client/exports.lua, client/compat/illenium.lua): `SetPedAppearance(ped, skin)` dresses any
 * ped (the player's own through its saved-skin path), `GetPedSkinData(ped)` reads one; menus `OpenClothingShop`,
 * `OpenBarberShop`, `OpenOutfitChanger`; job outfits `ChangeScriptClothe({ components, props })` (collection
 * addressed, its own outfit kept to go back to) and `ChangeScriptClothe(nil)`; reload through its
 * `illenium-appearance:client:reloadSkin` handler (`ForceRefreshSkin`).
 */
export const tgiannClothing: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "4.1.0",
  apply: (ped, data) =>
    void callExport(RESOURCE, "SetPedAppearance", ped, data),
  read: (ped) => callExport(RESOURCE, "GetPedSkinData", ped),
  openMenu: (menu) => (callExport(RESOURCE, MENUS[menu]), true),
  wearOutfit: (outfit) =>
    void callExport(RESOURCE, "ChangeScriptClothe", {
      components: parts(outfit.components),
      props: parts(outfit.props),
    }),
  reloadSkin: () => {
    if (callExport(RESOURCE, "ScriptClotheIsActive") === true)
      callExport(RESOURCE, "ChangeScriptClothe", null);
    else TriggerEvent("illenium-appearance:client:reloadSkin");
  },
};
