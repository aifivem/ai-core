import { onCache } from "@aicore-fivem/lib/client";

/** A clothing script may swap the player model right after the spawn (a new ped starts without armour). */
const REAPPLY_MS = 15_000;

/** The saved armour, put on the ped at spawn and once more on a ped swapped in shortly after. */
class SpawnArmour {
  private value = 0;
  private until = 0;

  apply(ped: number, armour: number): void {
    this.value = armour;
    this.until = GetGameTimer() + REAPPLY_MS;
    SetPedArmour(ped, armour);
  }

  pedChanged(ped: number): void {
    // The spawn's own model change reaches the cache after `apply`, so every swap in the window is checked.
    if (GetGameTimer() <= this.until && GetPedArmour(ped) < this.value)
      SetPedArmour(ped, this.value);
  }
}

export const spawnArmour = new SpawnArmour();

onCache("ped", (ped) => spawnArmour.pedChanged(ped));
