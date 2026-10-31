import type { GarageClientAdapter } from "@aicore-fivem/shared";

/** cd_garage (docs): the client event `cd_garage:ImpoundVehicle (vehicle)` opens its impound form for that vehicle. */
export const cdGarage: GarageClientAdapter = {
  resource: "cd_garage",
  impound: (vehicle) => emit("cd_garage:ImpoundVehicle", vehicle),
};
