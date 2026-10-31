import type { FuelAdapter } from "@aicore-fivem/shared";
import { aiFuel } from "./adapters/ai-fuel";
import { clientFuel } from "./adapters/client";
import { codemXFuelV2 } from "./adapters/codem-xfuelv2";
import { oxFuel } from "./adapters/ox_fuel";
import { renewedFuel } from "./adapters/Renewed-Fuel";

/**
 * Fuel scripts that keep fuel on the clients (client exports `GetFuel(vehicle)` / `SetFuel(vehicle, level)`), with the
 * version each is written for; each has its client adapter in `resource/client/fuel/adapters/`.
 */
export const CLIENT_FUEL_SYSTEMS: ReadonlyArray<
  readonly [resource: string, version?: string]
> = [
  ["LegacyFuel", "1.3"],
  ["cdn-fuel", "2.1.9"],
  ["ps-fuel", "1.0.2"],
  ["lc_fuel", "1.2.4"],
  ["okokGasStation"],
  ["x-fuel"],
  ["qs-fuelstations"],
];

/**
 * Every supported fuel script, in detection order: `auto` uses the first one running. ai-fuel first (the default);
 * codem-xfuelv2 before LegacyFuel because it `provide`s that name (and lc_fuel answers LegacyFuel's exports).
 * A new fuel script = one adapter file (or one line above) and one line here.
 */
export const FUEL_SYSTEMS: readonly FuelAdapter[] = [
  aiFuel,
  oxFuel,
  renewedFuel,
  codemXFuelV2,
  ...CLIENT_FUEL_SYSTEMS.map(([resource, version]) =>
    clientFuel(resource, version),
  ),
];
