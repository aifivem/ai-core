import {
  GlobalKey,
  onClientEvent,
  registerExport,
  stateString,
  vehicleNearPlayer,
} from "@aicore-fivem/lib/server";
import { readFinite, readId } from "@aicore-fivem/lib/shared";
import { FUEL_REPORT_EVENT, FUEL_STATE_KEY } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { fuelBag, pendingBag } from "./bags";
import { FUEL_SYSTEMS } from "./registry";

/**
 * ai-core's fuel layer: every script reads and sets a vehicle's fuel through these exports (lib `fuel`) and the active
 * fuel script answers through its adapter (`registry.ts`), picked by the panel setting `fuel` (`auto` = first running).
 * The pick is published for the client half, which carries levels in and out of fuel scripts that live on clients.
 * Without a fuel script the `fuel` bag is read and written as it is.
 */
const activeFuel = new GlobalKey(FUEL_STATE_KEY, stateString);

export const fuel = new AdapterPicker({
  category: "fuel",
  adapters: FUEL_SYSTEMS,
  log,
  choice: settings.fuel,
  noneText: "no fuel script runs: fuel is only the vehicle's state bag",
  onSwitch: (next) => activeFuel.set(next?.resource),
});
panel.onChange("settings", () => fuel.setChoice(settings.fuel));

const isVehicle = (v: unknown): v is number =>
  typeof v === "number" && DoesEntityExist(v) && GetEntityType(v) === 2;

registerExport("GetFuelSystem", () => fuel.active?.resource ?? null);
registerExport("GetVehicleFuel", (vehicle: unknown) =>
  isVehicle(vehicle)
    ? fuel.call("get", (a) => a.get(vehicle), fuelBag.get(vehicle) ?? null)
    : null,
);
registerExport("SetVehicleFuel", (vehicle: unknown, level: unknown) => {
  const value = readFinite(level);
  if (!isVehicle(vehicle) || value === null) return false;
  const clamped = Math.min(100, Math.max(0, value));
  if (!fuel.active) {
    fuelBag.set(vehicle, clamped);
    return true;
  }
  return fuel.call(
    "set",
    (a) => {
      a.set(vehicle, clamped);
      return true;
    },
    false,
  );
});

/**
 * A client-side fuel script's level from a player near the vehicle (the driver while driving, the owner after applying
 * a pending set): it becomes the mirror the server reads. The client is that script's authority anyway; only 0-100
 * near the player is taken.
 */
onClientEvent(
  FUEL_REPORT_EVENT,
  {
    args: ([netId, level]) => {
      const id = readId(netId);
      const value = readFinite(level);
      return id !== null && value !== null && value >= 0 && value <= 100
        ? [id, value]
        : null;
    },
    rate: { count: 2, windowMs: 1000 },
  },
  (source, netId, level) => {
    if (!fuel.active?.mirrored) return;
    const vehicle = vehicleNearPlayer(source, netId, { metres: 30 });
    if (!vehicle) return;
    fuelBag.set(vehicle, level);
    const pending = pendingBag.get(vehicle);
    if (pending !== undefined && Math.abs(pending - level) < 1)
      pendingBag.set(vehicle, undefined);
  },
);
