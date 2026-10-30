import { onServerEvent } from "@aicore-fivem/lib/client"
import { createLogger, waitFor } from "@aicore-fivem/lib/shared"
import {
  VEHICLE_KEYS_CLIENT_EVENT,
  VEHICLE_KEYS_STATE_KEY,
  toKeyPurpose,
  type KeyPurpose,
  type VehicleKeysClientAdapter,
} from "@aicore-fivem/shared"

import { zeroRVehicleKeys } from "./adapters/0r-vehiclekeys"
import { lifeSaverKeys } from "./adapters/LifeSaver_KeySystem"
import { ak47QbVehicleKeys } from "./adapters/ak47_qb_vehiclekeys"
import { ak47VehicleKeys } from "./adapters/ak47_vehiclekeys"
import { brutalKeys } from "./adapters/brutal_keys"
import { filoVehicleKey } from "./adapters/filo_vehiclekey"
import { ic3dVehicleKeys } from "./adapters/ic3d_vehiclekeys"
import { isVehicleKeys } from "./adapters/is_vehiclekeys"
import { mkVehicleKeys } from "./adapters/mk_vehiclekeys"
import { mmCarkeys } from "./adapters/mm_carkeys"
import { okokGarage } from "./adapters/okokGarage"
import { pCarkeys } from "./adapters/p_carkeys"
import { qsVehicleKeys } from "./adapters/qs-vehiclekeys"
import { rdVehicleKeys } from "./adapters/rd_vehiclekeys"

const log = createLogger("ai-core")

/** Key systems with only a client API, one adapter file each (server list: `server/vehicleKeys/registry.ts`). */
const ADAPTERS: readonly VehicleKeysClientAdapter[] = [
  zeroRVehicleKeys,
  lifeSaverKeys,
  ak47QbVehicleKeys,
  ak47VehicleKeys,
  brutalKeys,
  filoVehicleKey,
  ic3dVehicleKeys,
  isVehicleKeys,
  mkVehicleKeys,
  mmCarkeys,
  okokGarage,
  pCarkeys,
  qsVehicleKeys,
  rdVehicleKeys,
]

/** The client half of the vehicle key layer: follows the key system the server picked (GlobalState). */
class ClientKeys {
  private current: VehicleKeysClientAdapter | null = null

  pick(resource: unknown): void {
    this.current = ADAPTERS.find((a) => a.resource === resource) ?? null
  }

  async apply(
    action: "give" | "remove",
    netId: number,
    plate: string,
    purpose: KeyPurpose
  ): Promise<void> {
    const adapter = this.current
    if (!adapter) return
    const vehicle = await waitFor(
      () =>
        NetworkDoesEntityExistWithNetworkId(netId)
          ? NetToVeh(netId)
          : undefined,
      5000
    ).catch(() => 0)
    if (!vehicle) return
    try {
      if (action === "give") adapter.give(vehicle, plate, purpose)
      else adapter.remove(vehicle, plate)
    } catch (error) {
      log.error(`${adapter.resource} ${action} key failed`, error)
    }
  }
}

const keys = new ClientKeys()
keys.pick(GlobalState[VEHICLE_KEYS_STATE_KEY])
AddStateBagChangeHandler(
  VEHICLE_KEYS_STATE_KEY,
  "global",
  (_bag: string, _key: string, value: unknown) => keys.pick(value)
)

onServerEvent(
  VEHICLE_KEYS_CLIENT_EVENT,
  {
    args: ([action, netId, plate, purpose]) =>
      (action === "give" || action === "remove") &&
      typeof netId === "number" &&
      typeof plate === "string"
        ? ([action, netId, plate, toKeyPurpose(purpose)] as const)
        : null,
  },
  (action, netId, plate, purpose) => keys.apply(action, netId, plate, purpose)
)
