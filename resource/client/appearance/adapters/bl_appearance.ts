import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "bl_appearance";

/**
 * bl_appearance 1.3.5 (src/client/appearance/setters.ts): `SetPedAppearance(ped, appearance)` dresses any ped (the
 * player's own through its player path). Its `GetPedAppearance` answers a promise, so `read` is left out.
 */
export const blAppearance: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "1.3.5",
  apply: (ped, data) =>
    void callExport(RESOURCE, "SetPedAppearance", ped, data),
};
