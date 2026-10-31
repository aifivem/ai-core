import { callExport } from "@aicore-fivem/lib/client";
import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/**
 * T1GER Keys: temporary keys by plate and vehicle name (`GiveTemporaryKeys(plate, name, type)`, its docs); its owned
 * keys need the ESX `owned_vehicles` table, and temporary keys cannot be taken back (untested on ai-core).
 */
export const t1gerKeys: VehicleKeysClientAdapter = {
  resource: "t1ger_keys",
  give: (vehicle, plate) =>
    void callExport(
      "t1ger_keys",
      "GiveTemporaryKeys",
      plate,
      GetLabelText(GetDisplayNameFromVehicleModel(GetEntityModel(vehicle))),
      "",
    ),
  remove: () => undefined,
};
