import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "illenium-appearance";

/** illenium-appearance 5.7.0 (game/util.lua): `setPedAppearance(ped, appearance)`, `getPedAppearance(ped)`. */
export const illeniumAppearance: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "5.7.0",
  apply: (ped, data) =>
    void callExport(RESOURCE, "setPedAppearance", ped, data),
  read: (ped) => callExport(RESOURCE, "getPedAppearance", ped),
};
