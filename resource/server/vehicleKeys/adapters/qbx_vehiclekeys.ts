import { callExport } from "@aicore-fivem/lib/server"
import type { VehicleKeysAdapter } from "@aicore-fivem/shared"

/** Qbox's qbx_vehiclekeys server exports take the vehicle entity (untested on ai-core). */
export const qbxVehicleKeys: VehicleKeysAdapter = {
  resource: "qbx_vehiclekeys",
  give: (source, t) =>
    void (
      t.vehicle !== null &&
      callExport("qbx_vehiclekeys", "GiveKeys", source, t.vehicle)
    ),
  remove: (source, t) =>
    void (
      t.vehicle !== null &&
      callExport("qbx_vehiclekeys", "RemoveKeys", source, t.vehicle)
    ),
}
