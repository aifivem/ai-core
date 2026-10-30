import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/server";
import {
  toKeyPurpose,
  VEHICLE_KEYS_STATE_KEY,
  type KeyTarget,
} from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { KEY_SYSTEMS } from "./registry";

/**
 * ai-core's vehicle key layer: every script (lib `vehicleKeys`) calls these exports and the active key system answers
 * through its adapter (`registry.ts`), picked by the panel setting `vehicleKeys` (`auto` = first running) and again
 * when a key system starts or stops. The pick is published for the client adapters.
 */
const activeKeys = new GlobalKey(VEHICLE_KEYS_STATE_KEY, stateString);

const layer = new AdapterPicker({
  category: "vehicle keys",
  adapters: KEY_SYSTEMS,
  log,
  choice: settings.vehicleKeys,
  noneText:
    "no vehicle key system runs: every player counts as holding every key",
  onSwitch: (next) => activeKeys.set(next?.resource),
});
panel.onChange("settings", () => layer.setChoice(settings.vehicleKeys));

/** A vehicle given as a server entity or a plate. */
function target(vehicle: unknown): KeyTarget | null {
  if (typeof vehicle === "string")
    return vehicle.trim()
      ? { vehicle: null, netId: null, plate: vehicle.trim() }
      : null;
  if (typeof vehicle !== "number" || !DoesEntityExist(vehicle)) return null;
  return {
    vehicle,
    netId: NetworkGetNetworkIdFromEntity(vehicle),
    plate: GetVehicleNumberPlateText(vehicle).trim(),
  };
}

registerExport(
  "GiveVehicleKeys",
  (source: unknown, vehicle: unknown, purpose?: unknown) => {
    const t = target(vehicle);
    if (typeof source === "number" && t)
      layer.call(
        "give",
        (a) => a.give(source, t, toKeyPurpose(purpose)),
        undefined,
      );
  },
);
registerExport("RemoveVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  if (typeof source === "number" && t)
    layer.call("remove", (a) => a.remove(source, t), undefined);
});
registerExport("HasVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  if (typeof source !== "number" || !t) return false;
  // A system that cannot answer (or none running) counts the key as held: scripts never lock players out by it.
  return layer.call("has", (a) => (a.has ? a.has(source, t) : true), true);
});
