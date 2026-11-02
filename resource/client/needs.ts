import {
  AdminWorld,
  cache,
  every,
  fadeIn,
  fadeOut,
  getPlayerData,
  medical,
  notify,
  onPlayerData,
  onStop,
} from "@aifivem/lib/client";
import { CORE } from "@aifivem/shared";
import { Locale } from "common";
import {
  NEEDS,
  readNeedsSettings,
  type Need,
  type NeedWarnings,
} from "common/needs";
import { isLoaded } from "./playerState";

/**
 * Low hunger / thirst, one system on the client (it owns its ped's health): a notification below `lowAt` (the
 * critical text below `criticalAt`) at most every `notifyEvery` s; below `criticalAt` dizziness (fade out and in,
 * every `faintEvery` s) and health loss (`damage` every `hurtEvery` s), each switched on its own. Values come from
 * ai-core's player data (metadata snapshot + deltas), settings from the panel file `needs`. The 1 s job runs only
 * while a loaded character is below a level.
 */
class NeedWarningsJob {
  private readonly world = new AdminWorld(["needs"]);
  private readonly settings = this.world.view("needs", readNeedsSettings);
  private readonly needs: Record<Need, number> = { hunger: 100, thirst: 100 };
  private readonly job = every(1000, () => this.check(), {
    active: false,
    name: "needWarnings",
  });
  private nextNotify = 0;
  private nextFaint = 0;
  private nextHurt = 0;
  private fainting = false;

  constructor() {
    this.world.onChange("needs", () => this.update());
    // A dizzy spell cut by a stop would leave the screen black.
    onStop(() => {
      if (this.fainting) void fadeIn(0);
    });
  }

  /** Takes hunger / thirst from the character's metadata (snapshot or patch). */
  read(metadata: Record<string, unknown> | undefined): void {
    for (const need of NEEDS) {
      const value = metadata?.[need];
      if (typeof value === "number" && Number.isFinite(value))
        this.needs[need] = value;
    }
    this.update();
  }

  /** Switches the job on while it has something to do; call when needs, settings or the character changed. */
  update(): void {
    const w = this.settings.value.warnings;
    const low = Math.min(this.needs.hunger, this.needs.thirst);
    this.job.set(
      isLoaded() &&
        ((w.notify && low < w.lowAt) ||
          ((w.faint || w.hurt) && low < w.criticalAt)),
    );
  }

  private check(): void {
    if (medical.isDead()) return;
    const w = this.settings.value.warnings;
    const { hunger, thirst } = this.needs;
    const now = GetGameTimer();
    const critical = Math.min(hunger, thirst) < w.criticalAt;
    if (critical && w.hurt && now >= this.nextHurt) {
      this.nextHurt = now + w.hurtEvery * 1000;
      const ped = cache.ped;
      SetEntityHealth(ped, Math.max(0, GetEntityHealth(ped) - w.damage));
    }
    // Another script's fade (teleport, spawn) owns the screen: try again next second.
    if (
      critical &&
      w.faint &&
      !this.fainting &&
      now >= this.nextFaint &&
      IsScreenFadedIn()
    ) {
      this.nextFaint = now + w.faintEvery * 1000;
      void this.faint(w);
    }
    if (!w.notify || now < this.nextNotify) return;
    const hungry = hunger < w.lowAt;
    const thirsty = thirst < w.lowAt;
    if (!hungry && !thirsty && !critical) return;
    this.nextNotify = now + w.notifyEvery * 1000;
    if (critical) return notify(Locale("NEED_CRITICAL"), "error");
    notify(
      Locale(
        hungry && thirsty
          ? "NEED_LOW_BOTH"
          : hungry
            ? "NEED_LOW_HUNGER"
            : "NEED_LOW_THIRST",
      ),
      "warning",
    );
  }

  private async faint(w: NeedWarnings): Promise<void> {
    this.fainting = true;
    try {
      await fadeOut(w.fadeOut * 1000);
      await fadeIn(w.fadeIn * 1000);
    } finally {
      this.fainting = false;
    }
  }
}

const warnings = new NeedWarningsJob();
onPlayerData("metadata", (metadata) => warnings.read(metadata));
warnings.read(getPlayerData("metadata"));
on(CORE.clientPlayerLoadedEvent, () => warnings.update());
on(CORE.clientPlayerUnloadedEvent, () => warnings.update());
