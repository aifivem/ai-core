import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "tgiann-clothing";

/**
 * tgiann-clothing (4.x): `SetPedAppearance(ped, skin)` dresses any ped (the player's own through its saved-skin path),
 * `GetPedSkinData(ped)` reads one.
 */
export const tgiannClothing: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "4.1.0",
  apply: (ped, data) =>
    void callExport(RESOURCE, "SetPedAppearance", ped, data),
  read: (ped) => callExport(RESOURCE, "GetPedSkinData", ped),
};
