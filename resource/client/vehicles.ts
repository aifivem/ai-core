import { onServerCallback } from "@aicore-fivem/lib/client";
import { vehicleTypeOfClass } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";

/** Lib `spawnVehicle` of any resource asks here which `CreateVehicleServerSetter` type a model is (null: no such vehicle). */
onServerCallback(CORE.vehicleTypeCallback, (model) => {
  if (typeof model !== "string") return null;
  const hash = GetHashKey(model);
  return IsModelInCdimage(hash) && IsModelAVehicle(hash)
    ? vehicleTypeOfClass(GetVehicleClassFromName(hash))
    : null;
});
