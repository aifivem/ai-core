import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** is_vehiclekeys client exports by plate (untested on ai-core). */
export const isVehicleKeys: VehicleKeysClientAdapter = {
  resource: "is_vehiclekeys",
  give: (_vehicle, plate) =>
    void callExport("is_vehiclekeys", "GiveKey", plate),
  remove: (_vehicle, plate) =>
    void callExport("is_vehiclekeys", "RemoveKey", plate),
};
