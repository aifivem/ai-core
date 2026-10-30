import { callExport } from "@aicore-fivem/lib/client"
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared"

/** ic3d_vehiclekeys key items by plate (untested on ai-core). */
export const ic3dVehicleKeys: VehicleKeysClientAdapter = {
  resource: "ic3d_vehiclekeys",
  give: (_vehicle, plate) =>
    void callExport("ic3d_vehiclekeys", "ClientInventoryKeys", "add", plate),
  remove: (_vehicle, plate) =>
    void callExport("ic3d_vehiclekeys", "ClientInventoryKeys", "remove", plate),
}
