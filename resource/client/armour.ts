import { onCache } from "@aicore-fivem/lib/client";

/** A clothing script may swap the player model right after the spawn (a new ped starts with full health, no armour). */
const REAPPLY_MS = 15_000;

/** The saved armour and health, put on the ped at spawn and once more on a ped swapped in shortly after. */
class SpawnArmour {
  private armour = 0;
  private health = 0;
  private until = 0;

  /** `health` 0 keeps the ped's own (full) health. */
  apply(ped: number, armour: number, health: number): void {
    this.armour = armour;
    this.health = health;
    this.until = GetGameTimer() + REAPPLY_MS;
    SetPedArmour(ped, armour);
    this.setHealth(ped);
  }

  pedChanged(ped: number): void {
    // The spawn's own model change reaches the cache after `apply`, so every swap in the window is checked.
    if (GetGameTimer() > this.until) return;
    if (GetPedArmour(ped) < this.armour) SetPedArmour(ped, this.armour);
    this.setHealth(ped);
  }

  /** Only lowers: a fresh ped's full health comes down to the saved value, a hurt one is never healed. */
  private setHealth(ped: number): void {
    if (this.health > 100 && GetEntityHealth(ped) > this.health)
      SetEntityHealth(ped, Math.min(this.health, GetEntityMaxHealth(ped)));
  }
}

export const spawnArmour = new SpawnArmour();

onCache("ped", (ped) => spawnArmour.pedChanged(ped));
