import {
  GlobalKey,
  isOnline,
  plateOf,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/server";
import { readText } from "@aicore-fivem/lib/shared";
import { GARAGES_STATE_KEY, type GaragedVehicle } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { GARAGE_SYSTEMS } from "./registry";

/**
 * ai-core's garage layer: scripts impound, store, open garage menus and list garaged vehicles through these exports
 * (lib `garages`); the active garage script answers what it exposes (`registry.ts`), picked by the panel setting
 * `garages` (`auto` = first running). The pick is published for the client adapters of client-API scripts.
 */
const activeGarages = new GlobalKey(GARAGES_STATE_KEY, stateString);

export const garages = new AdapterPicker({
  category: "garages",
  adapters: GARAGE_SYSTEMS,
  log,
  choice: settings.garages,
  noneText: "no garage script runs: impounded vehicles are deleted",
  onSwitch: (next) => activeGarages.set(next?.resource),
});
panel.onChange("settings", () => garages.setChoice(settings.garages));

const isVehicle = (v: unknown): v is number =>
  typeof v === "number" && DoesEntityExist(v) && GetEntityType(v) === 2;
const player = (v: unknown): number | null =>
  typeof v === "number" && isOnline(v) ? v : null;
const garageId = (v: unknown): string | null =>
  v == null ? null : readText(v, 64);

registerExport("GetGarageSystem", () => garages.active?.resource ?? null);
registerExport("ImpoundVehicle", (vehicle: unknown, by?: unknown) => {
  if (!isVehicle(vehicle)) return false;
  const plate = plateOf(vehicle);
  return garages.call(
    "impound",
    (a) => a.impound?.(vehicle, plate, player(by)) ?? false,
    false,
  );
});
registerExport(
  "StoreVehicleInGarage",
  (vehicle: unknown, garage?: unknown, by?: unknown) => {
    if (!isVehicle(vehicle)) return false;
    const plate = plateOf(vehicle);
    return garages.call(
      "store",
      (a) => a.store?.(vehicle, plate, garageId(garage), player(by)) ?? false,
      false,
    );
  },
);
registerExport("OpenGarage", (source: unknown, garage?: unknown) => {
  const target = player(source);
  return (
    target !== null &&
    garages.call(
      "open",
      (a) => a.open?.(target, garageId(garage)) ?? false,
      false,
    )
  );
});
registerExport("GetGaragedVehicles", (source: unknown, done: unknown) => {
  if (typeof done !== "function") return;
  const reply = (list: GaragedVehicle[] | null) => {
    try {
      (done as (list: GaragedVehicle[] | null) => void)(list);
    } catch (error) {
      log.error("GetGaragedVehicles callback failed", error);
    }
  };
  const target = player(source);
  const adapter = garages.active;
  if (target === null || !adapter?.stored) return reply(null);
  adapter.stored(target).then(reply, (error: unknown) => {
    log.error(`${adapter.resource} stored vehicles failed`, error);
    reply(null);
  });
});
