import {
  GlobalKey,
  onClientCallback,
  plateOf,
  registerExport,
  stateString,
  vehicleFromNet,
} from "@aicore-fivem/lib/server";
import { normalizePlate, readId } from "@aicore-fivem/lib/shared";
import {
  toKeyPurpose,
  VEHICLE_KEY_HELD_EVENT,
  VEHICLE_KEYS_HAS_CALLBACK,
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
  if (typeof vehicle === "string") {
    const plate = normalizePlate(vehicle);
    return plate ? { vehicle: null, netId: null, plate } : null;
  }
  if (typeof vehicle !== "number" || !DoesEntityExist(vehicle)) return null;
  return {
    vehicle,
    netId: NetworkGetNetworkIdFromEntity(vehicle),
    plate: plateOf(vehicle),
  };
}

// A system that cannot answer (or none running) counts the key as held: scripts never lock players out by it.
const has = (source: number, t: KeyTarget): boolean =>
  layer.call("has", (a) => (a.has ? a.has(source, t) : true), true);

/** The player's client mirrors key answers (`HasVehicleKeys` there): it gets the new one after each change here. */
const tell = (source: number, t: KeyTarget): void =>
  emitNet(VEHICLE_KEY_HELD_EVENT, source, t.plate, has(source, t));

registerExport(
  "GiveVehicleKeys",
  (source: unknown, vehicle: unknown, purpose?: unknown) => {
    const t = target(vehicle);
    if (typeof source !== "number" || !t) return;
    layer.call(
      "give",
      (a) => a.give(source, t, toKeyPurpose(purpose)),
      undefined,
    );
    tell(source, t);
  },
);
registerExport("RemoveVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  if (typeof source !== "number" || !t) return;
  layer.call("remove", (a) => a.remove(source, t), undefined);
  tell(source, t);
});
registerExport("HasVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  return typeof source === "number" && t !== null && has(source, t);
});

/** A client's key question: a networked vehicle's net id, or a plate. */
onClientCallback(
  VEHICLE_KEYS_HAS_CALLBACK,
  {
    args: ([v]): readonly [number | string] | null => {
      if (typeof v === "string") return v.length <= 16 ? [v] : null;
      const netId = readId(v);
      return netId === null ? null : [netId];
    },
  },
  (source, v) => {
    const t = target(typeof v === "number" ? vehicleFromNet(v) : v);
    return t !== null && has(source, t);
  },
);
