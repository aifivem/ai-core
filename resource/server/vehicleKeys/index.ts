import { isResourceStarted, registerExport } from "@aicore-fivem/lib/server";
import { toKeyPurpose, VEHICLE_KEYS_STATE_KEY, type KeyTarget, type VehicleKeysAdapter } from "@aicore-fivem/shared";
import { panel, settings } from "../content";
import { log } from "../log";
import { KEY_SYSTEMS } from "./registry";

/**
 * ai-core's vehicle key layer: every script (lib `vehicleKeys`) calls these exports and the active key system answers
 * through its adapter (`registry.ts`), picked by the panel setting `vehicleKeys` (`auto` = first running) and again
 * when a key system starts or stops.
 */
class VehicleKeysLayer {
  private current: VehicleKeysAdapter | null = null;
  private choice = "auto";

  setChoice(choice: string): void {
    this.choice = choice;
    this.select();
  }

  /** Picks the key system again; `stopping` is a resource on its way down whose state may still read started. */
  select(stopping?: string): void {
    const runs = (a: VehicleKeysAdapter) => a.resource !== stopping && isResourceStarted(a.resource);
    const auto = this.choice === "auto" || !KEY_SYSTEMS.some((a) => a.resource === this.choice);
    const next = (auto ? KEY_SYSTEMS.find(runs) : KEY_SYSTEMS.find((a) => a.resource === this.choice && runs(a))) ?? null;
    if (next === this.current) return;
    this.current = next;
    GlobalState.set(VEHICLE_KEYS_STATE_KEY, next?.resource ?? null, true);
    log.info(next ? `vehicle keys: ${next.resource}` : "no vehicle key system runs: every player counts as holding every key");
  }

  run<T>(what: string, fn: (adapter: VehicleKeysAdapter) => T, fallback: T): T {
    const adapter = this.current;
    if (!adapter) return fallback;
    try {
      return fn(adapter);
    } catch (error) {
      log.error(`${adapter.resource} ${what} failed`, error);
      return fallback;
    }
  }
}

const layer = new VehicleKeysLayer();
layer.setChoice(settings.vehicleKeys);
panel.onChange("settings", () => layer.setChoice(settings.vehicleKeys));

const candidates = new Set(KEY_SYSTEMS.map((a) => a.resource));
on("onServerResourceStart", (resource: string) => candidates.has(resource) && layer.select());
on("onResourceStop", (resource: string) => {
  if (!candidates.has(resource)) return;
  layer.select(resource);
  setTimeout(() => layer.select(), 0);
});

/** A vehicle given as a server entity or a plate. */
function target(vehicle: unknown): KeyTarget | null {
  if (typeof vehicle === "string") return vehicle.trim() ? { vehicle: null, netId: null, plate: vehicle.trim() } : null;
  if (typeof vehicle !== "number" || !DoesEntityExist(vehicle)) return null;
  return { vehicle, netId: NetworkGetNetworkIdFromEntity(vehicle), plate: GetVehicleNumberPlateText(vehicle).trim() };
}

registerExport("GiveVehicleKeys", (source: unknown, vehicle: unknown, purpose?: unknown) => {
  const t = target(vehicle);
  if (typeof source === "number" && t) layer.run("give", (a) => a.give(source, t, toKeyPurpose(purpose)), undefined);
});
registerExport("RemoveVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  if (typeof source === "number" && t) layer.run("remove", (a) => a.remove(source, t), undefined);
});
registerExport("HasVehicleKeys", (source: unknown, vehicle: unknown) => {
  const t = target(vehicle);
  if (typeof source !== "number" || !t) return false;
  // A system that cannot answer (or none running) counts the key as held: scripts never lock players out by it.
  return layer.run("has", (a) => (a.has ? a.has(source, t) : true), true);
});
