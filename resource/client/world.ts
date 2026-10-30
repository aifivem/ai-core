import { registerExport } from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

/**
 * Pausing the weather and time sync (interiors, scenes, cut scenes) for whatever weather script runs: every reason is
 * counted and the sync resumes when the last one ends or its resource stops. Scripts that send the common pause events
 * themselves (qb-weathersync, cd_easytime, vSync) count as reasons too, so one script's resume never ends another's
 * pause. The state goes out as ai-core's own event and as those scripts' events for third-party weather scripts.
 */
class WorldSync {
  private readonly reasons = new Set<string>();
  /** True while this layer sends the third-party events, so its own sends are not counted as reasons. */
  private sending = false;

  get paused(): boolean {
    return this.reasons.size > 0;
  }

  /** A third-party pause event another script sent. */
  external(event: string, paused: boolean): void {
    if (!this.sending) this.set(`external:${event}`, paused);
  }

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
    emit(CORE.clientWorldSyncEvent, paused);
    this.sending = true;
    try {
      emit(
        paused
          ? "qb-weathersync:client:DisableSync"
          : "qb-weathersync:client:EnableSync",
      );
      emit("cd_easytime:PauseSync", paused);
      emit("vSync:toggle", !paused);
    } finally {
      this.sending = false;
    }
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
registerExport("IsWorldSyncPaused", () => sync.paused);
on("onClientResourceStop", (resource: string) => sync.drop(resource));
on("qb-weathersync:client:DisableSync", () => sync.external("qb", true));
on("qb-weathersync:client:EnableSync", () => sync.external("qb", false));
on("cd_easytime:PauseSync", (paused: unknown) =>
  sync.external("cd_easytime", paused === true),
);
on("vSync:toggle", (running: unknown) =>
  sync.external("vSync", running === false),
);
