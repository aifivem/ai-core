import { callExport } from "@aifivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aifivem/shared";

/** ak47_qb_vehiclekeys client exports by plate (second argument: a local vehicle) (untested on ai-core). */
export const ak47QbVehicleKeys: VehicleKeysClientAdapter = {
  resource: "ak47_qb_vehiclekeys",
  give: (vehicle, plate) =>
    void callExport(
      "ak47_qb_vehiclekeys",
      "GiveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle),
    ),
  remove: (vehicle, plate) =>
    void callExport(
      "ak47_qb_vehiclekeys",
      "RemoveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle),
    ),
};
