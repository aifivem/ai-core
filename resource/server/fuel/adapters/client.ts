import type { FuelAdapter } from "@aicore-fivem/shared";
import { fuelBag, pendingBag } from "../bags";

/**
 * A fuel script that keeps fuel on the clients (decorators, client exports): the server reads ai-core's mirror in the
 * `fuel` bag (drivers report it) and a set waits in the pending bag until the entity's owner client puts it into the
 * script (`resource/client/fuel/`, the client adapter of the same resource).
 */
export const clientFuel = (
  resource: string,
  version?: string,
): FuelAdapter => ({
  resource,
  ...(version ? { version } : {}),
  mirrored: true,
  get: (vehicle) => fuelBag.get(vehicle) ?? null,
  set: (vehicle, level) => {
    fuelBag.set(vehicle, level);
    pendingBag.set(vehicle, level);
  },
});
