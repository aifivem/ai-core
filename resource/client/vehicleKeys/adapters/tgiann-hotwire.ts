import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** tgiann-hotwire: the key goes to the player of this client; it has no way to take it back (untested on ai-core). */
export const tgiannHotwire: VehicleKeysClientAdapter = {
  resource: "tgiann-hotwire",
  give: (vehicle, _plate) => void callExport("tgiann-hotwire", "GiveKeyVehicle", vehicle, true),
  remove: () => undefined,
};
