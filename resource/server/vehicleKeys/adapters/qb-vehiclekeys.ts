import { callExport } from "@aicore-fivem/lib/server"
import type { VehicleKeysAdapter } from "@aicore-fivem/shared"

/** qb-vehiclekeys server exports `GiveKeys(source, plate)` / `RemoveKeys(source, plate)` (untested on ai-core). */
export const qbVehicleKeys: VehicleKeysAdapter = {
  resource: "qb-vehiclekeys",
  give: (source, t) =>
    void callExport("qb-vehiclekeys", "GiveKeys", source, t.plate),
  remove: (source, t) =>
    void callExport("qb-vehiclekeys", "RemoveKeys", source, t.plate),
}
