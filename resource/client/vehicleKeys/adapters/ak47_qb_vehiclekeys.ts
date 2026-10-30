import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

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
