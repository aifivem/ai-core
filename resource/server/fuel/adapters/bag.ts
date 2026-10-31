import type { FuelAdapter } from "@aicore-fivem/shared";
import { fuelBag } from "../bags";

/** A fuel script whose server keeps the `fuel` state bag: reading and writing the bag is its API. */
export const bagFuel = (resource: string, version?: string): FuelAdapter => ({
  resource,
  ...(version ? { version } : {}),
  get: (vehicle) => fuelBag.get(vehicle) ?? null,
  set: (vehicle, level) => fuelBag.set(vehicle, level),
});
