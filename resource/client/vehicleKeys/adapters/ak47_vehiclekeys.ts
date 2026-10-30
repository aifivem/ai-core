import { callExport } from "@aicore-fivem/lib/client"
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared"

/** ak47_vehiclekeys client exports by plate (second argument: a local vehicle) (untested on ai-core). */
export const ak47VehicleKeys: VehicleKeysClientAdapter = {
  resource: "ak47_vehiclekeys",
  give: (vehicle, plate) =>
    void callExport(
      "ak47_vehiclekeys",
      "GiveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle)
    ),
  remove: (vehicle, plate) =>
    void callExport(
      "ak47_vehiclekeys",
      "RemoveKey",
      plate,
      !NetworkGetEntityIsNetworked(vehicle)
    ),
}
