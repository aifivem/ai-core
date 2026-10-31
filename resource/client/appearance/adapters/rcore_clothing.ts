import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "rcore_clothing";

/**
 * rcore_clothing (documentation.rcore.cz api/client and configs, no version published): `setPedSkin(ped, skin)`
 * dresses any ped; its `getPlayerSkin` reads only the local player, so `read` is left out. Menus are its events
 * `rcore_clothing:openShop (shopType)` (the default config's `binco` and `barber` types; without a shop config the
 * barber shows every category) and `openChangingRoom`; reload is its server event `rcore_clothing:reloadSkin`. Its job
 * outfits are its own changing rooms (`openJobChangingRoom`), so `wearOutfit` is left out.
 */
export const rcoreClothing: AppearanceClientAdapter = {
  resource: RESOURCE,
  apply: (ped, data) => void callExport(RESOURCE, "setPedSkin", ped, data),
  openMenu: (menu) => {
    if (menu === "outfits") TriggerEvent("rcore_clothing:openChangingRoom");
    else
      TriggerEvent(
        "rcore_clothing:openShop",
        menu === "clothing" ? "binco" : "barber",
      );
    return true;
  },
  reloadSkin: () => emitNet("rcore_clothing:reloadSkin"),
};
