import { cache, readPlayerState } from "@aicore-fivem/lib/client";
import { CORE, type PlayerCache } from "@aicore-fivem/shared";

/** How often the player's ped, vehicle, seat and weapon are read (ox_lib uses the same 100 ms). */
const INTERVAL = 100;

/**
 * The one watcher behind every resource's lib `cache`: reads the local player's often used values ten times a
 * second and sends a local event only for a value that changed. Resources never poll these themselves.
 */
class CacheWatch {
  private readonly last: PlayerCache = { ...cache };

  check(): void {
    const ped = PlayerPedId();
    this.put("ped", ped);
    const state = readPlayerState(ped);
    this.put("vehicle", state.vehicle);
    this.put("seat", state.seat);
    this.put("weapon", state.weapon);
  }

  private put<K extends keyof PlayerCache>(key: K, value: PlayerCache[K]): void {
    if (this.last[key] === value) return;
    this.last[key] = value;
    emit(CORE.clientCacheEvent, key, value);
  }
}

const watch = new CacheWatch();
setInterval(() => watch.check(), INTERVAL);
