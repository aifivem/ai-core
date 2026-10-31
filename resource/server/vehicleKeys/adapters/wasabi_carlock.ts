import { callExport } from "@aicore-fivem/lib/server";
import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

/** wasabi_carlock server exports `GiveKey` / `RemoveKey` / `HasKey` (source, plate) (its docs; untested on ai-core). */
export const wasabiCarlock: VehicleKeysAdapter = {
  resource: "wasabi_carlock",
  give: (source, t) =>
    void callExport("wasabi_carlock", "GiveKey", source, t.plate),
  remove: (source, t) =>
    void callExport("wasabi_carlock", "RemoveKey", source, t.plate),
  has: (source, t) =>
    callExport("wasabi_carlock", "HasKey", source, t.plate) === true,
};
