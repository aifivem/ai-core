import { Reasons, registerExport } from "@aicore-fivem/lib/client";
import { isResourceStarted } from "@aicore-fivem/lib/fivem";
import { CORE } from "@aicore-fivem/shared";

/**
 * Pausing the weather and time sync (interiors, scenes, cut scenes) for whatever weather script runs: every reason is
 * counted and the sync resumes when the last one ends or its resource stops. Scripts that send the common pause events
 * themselves (qb-weathersync, cd_easytime, vSync) count as reasons too, so one script's resume never ends another's
 * pause. The state goes out as ai-core's own event and as those scripts' events for third-party weather scripts;
 * with cd_easytime only as its own event (it turns the qb and vSync events into its pause with the meaning reversed).
 */
class WorldSync {
  /** Pause reasons owned by the calling resource (dropped when it stops); third-party events under `external`. */
  readonly reasons = new Reasons();
  /** True while this layer sends the third-party events, so its own sends are not counted as reasons. */
  private sending = false;

  constructor() {
    this.reasons.onChange((paused) => this.announce(paused));
  }

  get paused(): boolean {
    return this.reasons.any;
  }

  /** A third-party pause event another script sent (never dropped by a resource stop: its sender is unknown). */
  external(event: string, paused: boolean): void {
    if (!this.sending) this.reasons.set(event, paused, "external");
  }

  private announce(paused: boolean): void {
    emit(CORE.clientWorldSyncEvent, paused);
    this.sending = true;
    try {
      if (isResourceStarted("cd_easytime"))
        return emit("cd_easytime:PauseSync", paused);
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
registerExport(
  "PauseWorldSync",
  (reason: unknown) =>
    typeof reason === "string" && sync.reasons.set(reason, true),
);
registerExport(
  "ResumeWorldSync",
  (reason: unknown) =>
    typeof reason === "string" && sync.reasons.set(reason, false),
);
registerExport("IsWorldSyncPaused", () => sync.paused);
on("qb-weathersync:client:DisableSync", () => sync.external("qb", true));
on("qb-weathersync:client:EnableSync", () => sync.external("qb", false));
on("cd_easytime:PauseSync", (paused: unknown) =>
  sync.external("cd_easytime", paused === true),
);
on("vSync:toggle", (running: unknown) =>
  sync.external("vSync", running === false),
);
