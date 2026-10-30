import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared"

/** okokGarage keys through its server events by plate (untested on ai-core). */
export const okokGarage: VehicleKeysClientAdapter = {
  resource: "okokGarage",
  give: (_vehicle, plate) => emitNet("okokGarage:GiveKeys", plate),
  remove: (_vehicle, plate) => emitNet("okokGarage:RemoveKeys", plate),
}
