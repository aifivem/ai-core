import { callExport } from "@aicore-fivem/lib/server";
import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

/** wasabi_carlock server exports `GiveKey(source, plate)` / `RemoveKey(source, plate)` (its docs; untested on ai-core). */
export const wasabiCarlock: VehicleKeysAdapter = {
  resource: "wasabi_carlock",
  give: (source, t) => void callExport("wasabi_carlock", "GiveKey", source, t.plate),
  remove: (source, t) => void callExport("wasabi_carlock", "RemoveKey", source, t.plate),
};
