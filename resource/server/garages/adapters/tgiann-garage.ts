import type { GarageAdapter } from "@aicore-fivem/shared";

/**
 * tgiann-garage (`client/main.lua`): its client event `tgiann-garage:open` opens the menu of the garage zone the player
 * stands in (park while driving, list on foot); outside its zones it does nothing. No other API.
 */
export const tgiannGarage: GarageAdapter = {
  resource: "tgiann-garage",
  open: (source) => {
    emitNet("tgiann-garage:open", source);
    return true;
  },
};
