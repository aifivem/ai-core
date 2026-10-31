import { callExport } from "@aicore-fivem/lib/server";
import type { FuelAdapter } from "@aicore-fivem/shared";
import { fuelBag } from "../bags";

/**
 * Codem xFuel V2 (docs): syncs the level on the `fuel` bag and has the server export `SetFuel(vehicle, level)`. It
 * `provide`s LegacyFuel, so it comes before LegacyFuel in the registry.
 */
export const codemXFuelV2: FuelAdapter = {
  resource: "codem-xfuelv2",
  get: (vehicle) => fuelBag.get(vehicle) ?? null,
  set: (vehicle, level) =>
    void callExport("codem-xfuelv2", "SetFuel", vehicle, level),
};
