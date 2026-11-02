import { callExport } from "@aifivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aifivem/shared";

/** mk_vehiclekeys client exports by vehicle (untested on ai-core). */
export const mkVehicleKeys: VehicleKeysClientAdapter = {
  resource: "mk_vehiclekeys",
  give: (vehicle, _plate) =>
    void callExport("mk_vehiclekeys", "AddKey", vehicle),
  remove: (vehicle, _plate) =>
    void callExport("mk_vehiclekeys", "RemoveKey", vehicle),
};
