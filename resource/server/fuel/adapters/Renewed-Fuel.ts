import { callExport } from "@aifivem/lib/server";
import type { FuelAdapter } from "@aifivem/shared";
import { fuelBag } from "../bags";

/** Renewed-Fuel (docs): server reads the `fuel` bag, sets with its server export `SetFuel(vehicle, amount, fuelType?)`. */
export const renewedFuel: FuelAdapter = {
  resource: "Renewed-Fuel",
  get: (vehicle) => fuelBag.get(vehicle) ?? null,
  set: (vehicle, level) =>
    void callExport("Renewed-Fuel", "SetFuel", vehicle, level),
};
