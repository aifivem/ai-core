import {
  drivenVehicle,
  EntityState,
  every,
  GlobalKey,
  onCache,
  stateNumber,
  stateString,
  waitForEntity,
} from "@aicore-fivem/lib/client";
import { createLogger, round } from "@aicore-fivem/lib/shared";
import {
  FUEL_PENDING_BAG,
  FUEL_REPORT_EVENT,
  FUEL_STATE_KEY,
  type FuelClientAdapter,
} from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";
import {
  cdnFuel,
  lcFuel,
  legacyFuel,
  okokGasStation,
  psFuel,
  qsFuelStations,
  xFuel,
} from "./adapters/exports";

/** Fuel scripts that keep fuel on the clients (server list: `CLIENT_FUEL_SYSTEMS` in `server/fuel/registry.ts`). */
const ADAPTERS: readonly FuelClientAdapter[] = [
  legacyFuel,
  cdnFuel,
  psFuel,
  lcFuel,
  okokGasStation,
  xFuel,
  qsFuelStations,
];

/**
 * The client half of the fuel layer, active only while the server picked a fuel script that lives on clients: the
 * owner client puts a level the server set (pending bag) into that script, and the driver reports the script's level
 * at every whole percent, so the server's `fuel` bag mirrors it.
 */
const pick = new GlobalKey(FUEL_STATE_KEY, stateString);
const layer = new AdapterFollower(ADAPTERS, pick, createLogger("ai-core"));
const pending = new EntityState(FUEL_PENDING_BAG, stateNumber);

const report = (vehicle: number, level: number) =>
  emitNet(
    FUEL_REPORT_EVENT,
    NetworkGetNetworkIdFromEntity(vehicle),
    round(level, 1),
  );

/** A pending level on a vehicle this client owns goes into the fuel script, then back to the server as applied. */
function applyPending(vehicle: number): void {
  const level = pending.get(vehicle);
  if (
    level === undefined ||
    !layer.active ||
    NetworkGetEntityOwner(vehicle) !== PlayerId()
  )
    return;
  layer.call("set", (a) => a.set(vehicle, level), undefined);
  report(vehicle, level);
}

pending.onChange((netId, level) => {
  if (level === undefined || !layer.active) return;
  void waitForEntity(netId, 5000).then((vehicle) => {
    if (vehicle) applyPending(vehicle);
  });
});

let sent = -1;
const driving = every(
  1000,
  () => {
    const vehicle = drivenVehicle();
    if (!vehicle) return;
    applyPending(vehicle);
    const level = layer.call("get", (a) => a.get(vehicle), null);
    if (level === null || Math.floor(level) === sent) return;
    sent = Math.floor(level);
    report(vehicle, level);
  },
  { active: false, name: "fuel report" },
);

function update(): void {
  sent = -1;
  driving.set(layer.active !== null && drivenVehicle() !== false);
}
onCache("vehicle", update);
onCache("seat", update);
// The follower listens first, so its new pick is in place here.
pick.onChange(update);
update();
