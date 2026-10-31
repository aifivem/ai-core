import type { GarageAdapter } from "@aicore-fivem/shared";
import { aiGarages } from "./adapters/ai-garages";
import { clientGarage } from "./adapters/client";
import { tgiannGarage } from "./adapters/tgiann-garage";
import { tgiannRealparking } from "./adapters/tgiann-realparking";

/**
 * Every supported garage script, in detection order: `auto` uses the first one running. ai-garages first (the default),
 * then TGIANN's, then the others. Each answers only what it exposes.
 * A new garage script = one adapter file (or a `clientGarage` line with its client adapter) and one line here.
 */
export const GARAGE_SYSTEMS: readonly GarageAdapter[] = [
  aiGarages,
  tgiannRealparking,
  tgiannGarage,
  // Client API (docs): openGarage(garageId), storeVehicle(garageId), showImpoundForm().
  clientGarage("jg-advancedgarages", {
    open: true,
    store: true,
    impound: true,
  }),
  // Client event `cd_garage:ImpoundVehicle (vehicle)` opens its impound form (docs).
  clientGarage("cd_garage", { impound: true }),
];
