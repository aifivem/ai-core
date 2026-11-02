import { callExport } from "@aifivem/lib/server";
import type { VehicleKeysAdapter } from "@aifivem/shared";

/** mVehicle: `AddTemporalVehicle(source, vehicle)`; it has no way to take keys back (untested on ai-core). */
export const mVehicle: VehicleKeysAdapter = {
  resource: "mVehicle",
  give: (source, t) =>
    void (
      t.vehicle !== null &&
      callExport("mVehicle", "AddTemporalVehicle", source, t.vehicle)
    ),
  remove: () => undefined,
};
