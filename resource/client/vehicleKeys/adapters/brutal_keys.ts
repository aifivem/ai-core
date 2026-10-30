import { callExport } from "@aicore-fivem/lib/client"
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared"

/** Brutal keys client exports by plate (untested on ai-core). */
export const brutalKeys: VehicleKeysClientAdapter = {
  resource: "brutal_keys",
  give: (_vehicle, plate) =>
    void callExport("brutal_keys", "addVehicleKey", plate, "car"),
  remove: (_vehicle, plate) =>
    void callExport("brutal_keys", "removeKey", plate, true),
}
