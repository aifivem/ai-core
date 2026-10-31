import { resourceExport } from "@aicore-fivem/lib/server";
import { toGaragedVehicles, type GarageAdapter } from "@aicore-fivem/shared";

/** ai-garages: owned vehicles live in ai-vehicles; its exports impound, store and list them. */
const garages = resourceExport("ai-garages");

export const aiGarages: GarageAdapter = {
  resource: "ai-garages",
  impound: (vehicle) => garages.ImpoundVehicle(vehicle) === true,
  store: (vehicle, _plate, garage) =>
    garage !== null && garages.StoreVehicle(vehicle, garage) === true,
  stored: (source) =>
    Promise.resolve(toGaragedVehicles(garages.GetStoredVehicles(source))),
};
