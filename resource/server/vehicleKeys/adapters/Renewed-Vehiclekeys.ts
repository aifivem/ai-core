import { callExport } from "@aifivem/lib/server";
import type { VehicleKeysAdapter } from "@aifivem/shared";

/** Renewed-Vehiclekeys server exports `addKey(source, plate)` / `removeKey(source, plate)` (untested on ai-core). */
export const renewedVehicleKeys: VehicleKeysAdapter = {
  resource: "Renewed-Vehiclekeys",
  give: (source, t) =>
    void callExport("Renewed-Vehiclekeys", "addKey", source, t.plate),
  remove: (source, t) =>
    void callExport("Renewed-Vehiclekeys", "removeKey", source, t.plate),
};
