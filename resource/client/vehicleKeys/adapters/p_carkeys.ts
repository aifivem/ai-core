import type { VehicleKeysClientAdapter } from "@aicore-fivem/shared"

/** p_carkeys keys through its server events by plate (untested on ai-core). */
export const pCarkeys: VehicleKeysClientAdapter = {
  resource: "p_carkeys",
  give: (_vehicle, plate) => emitNet("p_carkeys:CreateKeys", plate),
  remove: (_vehicle, plate) => emitNet("p_carkeys:RemoveKeys", plate),
}
