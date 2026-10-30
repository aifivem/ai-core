import {
  GlobalKey,
  onServerEvent,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import { AdapterFollower } from "common/adapters";
import {
  VEHICLE_KEYS_CLIENT_EVENT,
  VEHICLE_KEYS_STATE_KEY,
  toKeyPurpose,
  type KeyPurpose,
  type VehicleKeysClientAdapter,
} from "@aicore-fivem/shared";

import { zeroRVehicleKeys } from "./adapters/0r-vehiclekeys";
import { lifeSaverKeys } from "./adapters/LifeSaver_KeySystem";
import { ak47QbVehicleKeys } from "./adapters/ak47_qb_vehiclekeys";
import { ak47VehicleKeys } from "./adapters/ak47_vehiclekeys";
import { brutalKeys } from "./adapters/brutal_keys";
import { filoVehicleKey } from "./adapters/filo_vehiclekey";
import { ic3dVehicleKeys } from "./adapters/ic3d_vehiclekeys";
import { isVehicleKeys } from "./adapters/is_vehiclekeys";
import { mkVehicleKeys } from "./adapters/mk_vehiclekeys";
import { mmCarkeys } from "./adapters/mm_carkeys";
import { okokGarage } from "./adapters/okokGarage";
import { pCarkeys } from "./adapters/p_carkeys";
import { qsVehicleKeys } from "./adapters/qs-vehiclekeys";
import { rdVehicleKeys } from "./adapters/rd_vehiclekeys";

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
];

/** The client half of the vehicle key layer: follows the key system the server picked (GlobalState). */
const keys = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(VEHICLE_KEYS_STATE_KEY, stateString),
  createLogger("ai-core"),
);

/** Applies a key change once the networked vehicle exists here. */
async function apply(
  action: "give" | "remove",
  netId: number,
  plate: string,
  purpose: KeyPurpose,
): Promise<void> {
  if (!keys.active) return;
  const vehicle = await waitFor(
    () =>
      NetworkDoesEntityExistWithNetworkId(netId) ? NetToVeh(netId) : undefined,
    5000,
  ).catch(() => 0);
  if (!vehicle) return;
  keys.call(
    `${action} key`,
    (a) =>
      action === "give"
        ? a.give(vehicle, plate, purpose)
        : a.remove(vehicle, plate),
    undefined,
  );
}

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
  (action, netId, plate, purpose) => apply(action, netId, plate, purpose),
);
