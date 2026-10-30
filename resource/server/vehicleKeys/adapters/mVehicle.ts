import { callExport } from "@aicore-fivem/lib/server";
import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

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
