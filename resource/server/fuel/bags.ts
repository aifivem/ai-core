import { EntityState, stateNumber } from "@aicore-fivem/lib/server";
import { FUEL_PENDING_BAG, VEHICLE_BAGS } from "@aicore-fivem/shared";

/** The `fuel` bag (0-100): kept by ai-fuel, ox_fuel and others; a mirror for fuel scripts that keep fuel on clients. */
export const fuelBag = new EntityState(VEHICLE_BAGS.fuel, stateNumber);
/** A level waiting for the entity's owner client to put it into a client-side fuel script. */
export const pendingBag = new EntityState(FUEL_PENDING_BAG, stateNumber);
