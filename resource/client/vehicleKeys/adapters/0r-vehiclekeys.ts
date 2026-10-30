import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** 0r-vehiclekeys client exports by plate (untested on ai-core). */
export const zeroRVehicleKeys: VehicleKeysClientAdapter = {
  resource: "0r-vehiclekeys",
  give: (_vehicle, plate) => void callExport("0r-vehiclekeys", "GiveKeys", plate),
  remove: (_vehicle, plate) => void callExport("0r-vehiclekeys", "RemoveKeys", plate),
};
