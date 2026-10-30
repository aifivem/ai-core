import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared";

/** rd_vehiclekeys keys through its server events by plate (untested on ai-core). */
export const rdVehicleKeys: VehicleKeysClientAdapter = {
  resource: "rd_vehiclekeys",
  give: (_vehicle, plate) => emitNet("rd_vehiclekeys:server:GiveKeys", plate),
  remove: (_vehicle, plate) =>
    emitNet("rd_vehiclekeys:server:RemoveKeys", plate),
};
