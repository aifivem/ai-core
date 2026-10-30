import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

/** cd_garage keys: its client event `cd_garage:AddKeys (plate)`; it has no way to take keys back (untested on ai-core). */
export const cdGarage: VehicleKeysAdapter = {
  resource: "cd_garage",
  give: (source, t) => emitNet("cd_garage:AddKeys", source, t.plate),
  remove: () => undefined,
};
