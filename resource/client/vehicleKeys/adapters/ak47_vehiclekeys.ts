import { callExport } from "@aifivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aifivem/shared";

/** ak47_vehiclekeys client exports by plate (second argument: a local vehicle) (untested on ai-core). */
export const ak47VehicleKeys: VehicleKeysClientAdapter = {
  resource: "ak47_vehiclekeys",
  give: (vehicle, plate) =>
    void callExport(
      "ak47_vehiclekeys",
      "GiveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle),
    ),
  remove: (vehicle, plate) =>
    void callExport(
      "ak47_vehiclekeys",
      "RemoveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle),
    ),
};
