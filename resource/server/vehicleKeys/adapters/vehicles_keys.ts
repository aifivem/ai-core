import { callExport } from "@aicore-fivem/lib/server"
import type { VehicleKeysAdapter } from "@aicore-fivem/shared"

/** Jaksam's vehicles_keys: temporary keys by player id and plate (untested on ai-core). */
export const jaksamVehicleKeys: VehicleKeysAdapter = {
  resource: "vehicles_keys",
  give: (source, t) =>
    void callExport(
      "vehicles_keys",
      "giveVehicleKeysToPlayerId",
      source,
      t.plate,
      "temporary"
    ),
  remove: (source, t) =>
    void callExport("vehicles_keys", "removeKeysFromPlayerId", source, t.plate),
}
