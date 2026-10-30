import { cache, readPlayerState, readWeapon } from "@aicore-fivem/lib/client";
import { CORE, type PlayerCache } from "@aicore-fivem/shared";

/** How often the ped, weapon and (in a vehicle) seat are read. */
const INTERVAL = 100;
/** On foot, entering a vehicle comes from the game event; this many ticks between fallback reads (a warp, a missed event). */
const ON_FOOT_EVERY = 5;

/**
 * The one watcher behind every resource's lib `cache`: sends a local event only for a value that changed, so
 * resources never poll these themselves. Entering a vehicle arrives at once through `CEventNetworkPlayerEnteredVehicle`
 * (the game has no exit or seat event: those are read while in a vehicle).
 */
class CacheWatch {
  private readonly last: PlayerCache = { ...cache };
  private tick = 0;

  check(): void {
    const ped = PlayerPedId();
    this.put("ped", ped);
    const onFoot = this.last.vehicle === false;
    if (onFoot && ++this.tick % ON_FOOT_EVERY !== 0) {
      this.put("weapon", readWeapon(ped));
      return;
    }
    this.read(ped);
  }

  read(ped: number): void {
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
on("gameEventTriggered", (name: string, args: number[]) => {
  if (name === "CEventNetworkPlayerEnteredVehicle" && args[0] === PlayerId()) watch.read(PlayerPedId());
});
