import { callExport } from "@aicore-fivem/lib/server";
import type { VehicleKeysAdapter } from "@aicore-fivem/shared";

/** Qbox's qbx_vehiclekeys server exports `GiveKeys` / `RemoveKeys` / `HasKeys` (source, vehicle entity) (read from its source, 1.0.3; untested on ai-core). A plate alone counts as held. */
export const qbxVehicleKeys: VehicleKeysAdapter = {
  resource: "qbx_vehiclekeys",
  give: (source, t) =>
    void (
      t.vehicle !== null &&
      callExport("qbx_vehiclekeys", "GiveKeys", source, t.vehicle)
    ),
  remove: (source, t) =>
    void (
      t.vehicle !== null &&
      callExport("qbx_vehiclekeys", "RemoveKeys", source, t.vehicle)
    ),
  has: (source, t) =>
    t.vehicle === null ||
    callExport("qbx_vehiclekeys", "HasKeys", source, t.vehicle) === true,
};
