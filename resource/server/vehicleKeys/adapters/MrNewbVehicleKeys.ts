import { callExport } from "@aifivem/lib/server";
import type { VehicleKeysAdapter } from "@aifivem/shared";

/** MrNewbVehicleKeys server exports `GiveKeysByPlate(source, plate)` / `RemoveKeysByPlate(source, plate)` (untested on ai-core). */
export const mrNewbVehicleKeys: VehicleKeysAdapter = {
  resource: "MrNewbVehicleKeys",
  give: (source, t) =>
    void callExport("MrNewbVehicleKeys", "GiveKeysByPlate", source, t.plate),
  remove: (source, t) =>
    void callExport("MrNewbVehicleKeys", "RemoveKeysByPlate", source, t.plate),
};
