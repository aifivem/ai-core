import { callExport } from "@aicore-fivem/lib/client";
import type { FuelClientAdapter } from "@aicore-fivem/shared";

/** A level from a client export: a number, or the first value of a Lua pair (`fuel, fuelType`). */
function level(raw: unknown): number | null {
  const value: unknown = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A fuel script with the LegacyFuel-style client exports `GetFuel(vehicle)` / `SetFuel(vehicle, level)` (0-100). */
const exportFuel = (resource: string): FuelClientAdapter => ({
  resource,
  get: (vehicle) => level(callExport(resource, "GetFuel", vehicle)),
  set: (vehicle, value) => void callExport(resource, "SetFuel", vehicle, value),
});

/** LegacyFuel 1.3 (`source/fuel_client.lua`): the level in a decorator. */
export const legacyFuel = exportFuel("LegacyFuel");
/** cdn-fuel 2.1.9 (`client/utils.lua`). */
export const cdnFuel = exportFuel("cdn-fuel");
/** ps-fuel 1.0.2 (`client/utils.lua`). */
export const psFuel = exportFuel("ps-fuel");
/** lc_fuel 1.2.4 (`client/client.lua`). */
export const lcFuel = exportFuel("lc_fuel");
/** okokGasStation (docs). */
export const okokGasStation = exportFuel("okokGasStation");
/** Codem xFuel (docs, resource `x-fuel`). */
export const xFuel = exportFuel("x-fuel");
/** qs-fuelstations (docs). */
export const qsFuelStations = exportFuel("qs-fuelstations");
