import { CORE, type CharacterScene } from "@aicore-fivem/shared";
import { worldSync } from "../world";

/** The weather sync pause contract (qb-weathersync's client events, answered by ai-weathersync). */

/** The scene's own time and weather while it stands (weather sync paused), given back when it goes. */
export class SceneTime {
  private forced = false;

  force(time: CharacterScene["time"]): void {
    if (!time.enabled) return;
    worldSync.reasons.set("scene", true, CORE.resource);
    NetworkOverrideClockTime(time.hour, time.minute, 0);
    SetOverrideWeather(time.weather);
    this.forced = true;
  }

  restore(): void {
    if (!this.forced) return;
    this.forced = false;
    ClearOverrideWeather();
    NetworkClearClockTimeOverride();
    worldSync.reasons.set("scene", false, CORE.resource);
  }
}
