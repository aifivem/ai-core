import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** LifeSaver_KeySystem client exports by plate and model name (untested on ai-core). */
export const lifeSaverKeys: VehicleKeysClientAdapter = {
  resource: "LifeSaver_KeySystem",
  give: (vehicle, plate) => void callExport("LifeSaver_KeySystem", "AddCarkey", plate, GetDisplayNameFromVehicleModel(GetEntityModel(vehicle))),
  remove: (vehicle, plate) => void callExport("LifeSaver_KeySystem", "RemoveCarkey", plate, GetDisplayNameFromVehicleModel(GetEntityModel(vehicle))),
};
