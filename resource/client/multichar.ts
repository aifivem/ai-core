import {
  cache,
  every,
  GlobalKey,
  onServerEvent,
  stateString,
} from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";
import { spawnArmour } from "./armour";
import { dropCharacters } from "./characters";
import { announceLoaded, announceUnloaded } from "./playerState";

const screenKey = new GlobalKey(CORE.characterScreenKey, stateString);

/** The external character screen's resource while one runs (ai-core's own stays shut), else null. */
export const externalScreen = (): string | null => screenKey.get() ?? null;

screenKey.onChange((_id, value) => {
  if (value) dropCharacters();
});

/** Checks in a row the player must look spawned (500 ms apart). */
const STEADY = 3;

/**
 * A character loaded under an external screen: that script places and dresses the ped. ai-core waits until the player
 * stands in the world (screen faded in, no NUI focus, ped visible, no player switch), then applies the saved armour
 * and health, fires `client:playerLoaded` and tells the server (`playerSpawned`).
 */
class ExternalSpawn {
  private armour = 0;
  private health = 0;
  private steady = 0;
  private readonly job = every(500, () => this.check(), {
    active: false,
    name: "external spawn",
  });

  start(armour: number, health: number): void {
    this.armour = armour;
    this.health = health;
    this.steady = 0;
    this.job.set(true);
  }

  stop(): void {
    this.job.set(false);
  }

  private check(): void {
    const ped = cache.ped;
    const ready =
      IsScreenFadedIn() &&
      !IsNuiFocused() &&
      IsEntityVisible(ped) &&
      !IsPlayerSwitchInProgress();
    this.steady = ready ? this.steady + 1 : 0;
    if (this.steady < STEADY) return;
    this.job.set(false);
    spawnArmour.apply(ped, this.armour, this.health);
    announceLoaded();
    emitNet(CORE.externalSpawnedEvent);
  }
}

const spawn = new ExternalSpawn();
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

onServerEvent(
  CORE.externalLoadedEvent,
  {
    args: ([armour, health]) => [
      finite(armour) ? Math.min(100, Math.max(0, armour)) : 0,
      finite(health) && health > 100 ? health : 0,
    ],
  },
  (armour, health) => spawn.start(armour, health),
);

onServerEvent(CORE.externalLogoutEvent, () => {
  spawn.stop();
  announceUnloaded();
});
