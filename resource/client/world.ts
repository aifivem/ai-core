import { registerExport } from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

/**
 * Pausing the weather and time sync (interiors, scenes, cut scenes) for whatever weather script runs: every reason is
 * counted and the sync resumes when the last one ends or its resource stops. The pause events of the common scripts
 * are all sent (qb-weathersync / ai-weathersync / Renewed, cd_easytime, vSync).
 */
class WorldSync {
  private readonly reasons = new Set<string>();

  set(reason: string, paused: boolean): void {
    const before = this.reasons.size > 0;
    if (paused) this.reasons.add(reason);
    else this.reasons.delete(reason);
    const now = this.reasons.size > 0;
    if (now !== before) this.announce(now);
  }

  drop(resource: string): void {
    const before = this.reasons.size > 0;
    for (const r of this.reasons)
      if (r.startsWith(`${resource}:`)) this.reasons.delete(r);
    if (before && this.reasons.size === 0) this.announce(false);
  }

  private announce(paused: boolean): void {
    emit(
      paused
        ? "qb-weathersync:client:DisableSync"
        : "qb-weathersync:client:EnableSync",
    );
    emit("cd_easytime:PauseSync", paused);
    emit("vSync:toggle", !paused);
  }
}

export const worldSync = new WorldSync();
const sync = worldSync;
const owner = () => GetInvokingResource() || CORE.resource;
registerExport(
  "PauseWorldSync",
  (reason: unknown) =>
    typeof reason === "string" && sync.set(`${owner()}:${reason}`, true),
);
registerExport(
  "ResumeWorldSync",
  (reason: unknown) =>
    typeof reason === "string" && sync.set(`${owner()}:${reason}`, false),
);
on("onClientResourceStop", (resource: string) => sync.drop(resource));
