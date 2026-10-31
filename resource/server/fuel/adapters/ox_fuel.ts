import { bagFuel } from "./bag";

/**
 * ox_fuel: the `fuel` entity state bag is its whole API (server `setFuelState` sets it; README: set
 * `Entity(vehicle).state.fuel` on the server). Its driver client writes the bag too, which `sv_stateBagStrictMode`
 * refuses (`docs/compat/fuel.md`).
 */
export const oxFuel = bagFuel("ox_fuel", "1.5.4");
