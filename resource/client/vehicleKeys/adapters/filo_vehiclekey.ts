import { callExport } from "@aifivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aifivem/shared";

/** filo_vehiclekey client exports by plate (untested on ai-core). */
export const filoVehicleKey: VehicleKeysClientAdapter = {
  resource: "filo_vehiclekey",
  give: (_vehicle, plate) =>
    void callExport("filo_vehiclekey", "GiveKeys", plate),
  remove: (_vehicle, plate) =>
    void callExport("filo_vehiclekey", "RemoveKeys", plate),
};
