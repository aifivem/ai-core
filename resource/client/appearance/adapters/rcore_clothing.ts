import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "rcore_clothing";

/**
 * rcore_clothing (from tgiann-multichar 2.2.1 client/editable.lua): `setPedSkin(ped, skin)` dresses any ped; its
 * `getPlayerSkin` reads only the local player, so `read` is left out.
 */
export const rcoreClothing: AppearanceClientAdapter = {
  resource: RESOURCE,
  apply: (ped, data) => void callExport(RESOURCE, "setPedSkin", ped, data),
};
