import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** mm_carkeys key items by plate (untested on ai-core). */
export const mmCarkeys: VehicleKeysClientAdapter = {
  resource: "mm_carkeys",
  give: (vehicle, plate) =>
    void callExport("mm_carkeys", "GiveKeyItem", plate, vehicle),
  remove: (_vehicle, plate) =>
    void callExport("mm_carkeys", "RemoveKeyItem", plate),
};
