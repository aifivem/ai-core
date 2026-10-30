import { resourceExport } from "@aicore-fivem/lib/server";
import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

/** ai-vehiclekeys: ai-core's own key script (it also `provide`s qbx_vehiclekeys). */
const keys = () => resourceExport("ai-vehiclekeys");

export const aiVehicleKeys: VehicleKeysAdapter = {
  resource: "ai-vehiclekeys",
  give: (source, t) => keys().GiveKeys(source, t.plate),
  remove: (source, t) => keys().RemoveKeys(source, t.plate),
  has: (source, t) => keys().HasKeys(source, t.plate),
};
