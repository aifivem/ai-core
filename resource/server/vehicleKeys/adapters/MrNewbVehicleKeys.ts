import { callExport } from "@aicore-fivem/lib/server"
import type { VehicleKeysAdapter } from "@aicore-fivem/shared"

/** MrNewbVehicleKeys server exports `GiveKeysByPlate(source, plate)` / `RemoveKeysByPlate(source, plate)` (untested on ai-core). */
export const mrNewbVehicleKeys: VehicleKeysAdapter = {
  resource: "MrNewbVehicleKeys",
  give: (source, t) =>
    void callExport("MrNewbVehicleKeys", "GiveKeysByPlate", source, t.plate),
  remove: (source, t) =>
    void callExport("MrNewbVehicleKeys", "RemoveKeysByPlate", source, t.plate),
}
