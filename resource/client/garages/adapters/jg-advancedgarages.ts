import { callExport } from "@aicore-fivem/lib/client";
import type { GarageClientAdapter } from "@aicore-fivem/shared";

/**
 * jg-advancedgarages (docs, Client API): `openGarage(garageId)`, `storeVehicle(garageId)` (the vehicle the player sits
 * in) and `showImpoundForm()` (the closest vehicle within 5 m, the player's job permissions). Open and store need a
 * garage id.
 */
export const jgAdvancedGarages: GarageClientAdapter = {
  resource: "jg-advancedgarages",
  open: (garage) => {
    if (garage !== null) callExport("jg-advancedgarages", "openGarage", garage);
  },
  store: (_vehicle, garage) => {
    if (garage !== null)
      callExport("jg-advancedgarages", "storeVehicle", garage);
  },
  impound: () => void callExport("jg-advancedgarages", "showImpoundForm"),
};
