import {
  onCache,
  onServerEvent,
  plateOf,
  registerExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger, normalizePlate } from "@aicore-fivem/lib/shared";
import {
  VEHICLE_KEY_HELD_EVENT,
  VEHICLE_KEYS_HAS_CALLBACK,
} from "@aicore-fivem/shared";

/**
 * Client `HasVehicleKeys(vehicle | plate)`: exports stay synchronous, so the answer comes from a short-lived mirror of
 * the server layer's answers, by plate. The server pushes the new answer when ai-core's layer gives or takes this
 * player's key; entering a vehicle asks once; an unknown or stale plate answers what is known (false for a plate never
 * asked) and asks in the background. Changes made inside a key system itself (lockpick, hand over) show after `TTL`.
 */
const TTL = 10_000;
const log = createLogger("ai-core");

class HeldKeys {
  private readonly answers = new Map<string, { held: boolean; at: number }>();
  private readonly asking = new Set<string>();

  /** The known answer for a plate; asks the server when there is none or it is older than `TTL`. */
  read(plate: string, netId: number | null): boolean {
    const entry = this.answers.get(plate);
    if (!entry || Date.now() - entry.at > TTL) this.ask(plate, netId);
    return entry?.held ?? false;
  }

  set(plate: string, held: boolean): void {
    if (this.answers.size > 500) this.prune();
    this.answers.set(plate, { held, at: Date.now() });
  }

  ask(plate: string, netId: number | null): void {
    if (this.asking.has(plate)) return;
    this.asking.add(plate);
    triggerServerCallback(VEHICLE_KEYS_HAS_CALLBACK, [netId ?? plate])
      .then((held) => this.set(plate, held === true))
      .catch((error: unknown) => log.warn("key check failed", error))
      .finally(() => this.asking.delete(plate));
  }

  private prune(): void {
    const old = Date.now() - TTL;
    for (const [plate, entry] of this.answers)
      if (entry.at < old) this.answers.delete(plate);
  }
}

const keys = new HeldKeys();

/** The plate and, for a networked entity, its net id. */
function targetOf(
  vehicle: unknown,
): { plate: string; netId: number | null } | null {
  if (typeof vehicle === "string") {
    const plate = normalizePlate(vehicle);
    return plate ? { plate, netId: null } : null;
  }
  if (typeof vehicle !== "number" || !DoesEntityExist(vehicle)) return null;
  const plate = plateOf(vehicle);
  if (!plate) return null;
  return {
    plate,
    netId: NetworkGetEntityIsNetworked(vehicle)
      ? NetworkGetNetworkIdFromEntity(vehicle)
      : null,
  };
}

registerExport("HasVehicleKeys", (vehicle: unknown) => {
  const t = targetOf(vehicle);
  return t !== null && keys.read(t.plate, t.netId);
});

onServerEvent(
  VEHICLE_KEY_HELD_EVENT,
  {
    args: ([plate, held]) =>
      typeof plate === "string" && typeof held === "boolean"
        ? ([plate, held] as const)
        : null,
  },
  (plate, held) => keys.set(normalizePlate(plate), held),
);

// The vehicle the player gets into is the one scripts check next (engine, lock, fuel).
onCache("vehicle", (vehicle) => {
  if (vehicle === false) return;
  const t = targetOf(vehicle);
  if (t) keys.ask(t.plate, t.netId);
});
