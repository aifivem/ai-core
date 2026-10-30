import {
  isOnline,
  isResourceStarted,
  registerExport,
} from "@aicore-fivem/lib/server";
import {
  toDispatchAlert,
  type DispatchAdapter,
  type DispatchAlert,
} from "@aicore-fivem/shared";
import { panel, settings } from "../content";
import { log } from "../log";
import { DISPATCH_SYSTEMS } from "./registry";

/**
 * ai-core's dispatch layer: every script (lib `dispatch.alert`) sends police alerts through `SendDispatchAlert` and the
 * active alert system shows them through its adapter (`registry.ts`), picked by the panel setting `dispatch`
 * (`auto` = first running) and again when an alert system starts or stops.
 */
class DispatchLayer {
  private current: DispatchAdapter | null = null;
  private choice = "auto";

  get active(): DispatchAdapter | null {
    return this.current;
  }

  setChoice(choice: string): void {
    this.choice = choice;
    this.select();
  }

  /** Picks the alert system again; `stopping` is a resource on its way down whose state may still read started. */
  select(stopping?: string): void {
    const runs = (a: DispatchAdapter) =>
      a.resource !== stopping && isResourceStarted(a.resource);
    const auto =
      this.choice === "auto" ||
      !DISPATCH_SYSTEMS.some((a) => a.resource === this.choice);
    const next =
      (auto
        ? DISPATCH_SYSTEMS.find(runs)
        : DISPATCH_SYSTEMS.find((a) => a.resource === this.choice && runs(a))) ??
      null;
    if (next === this.current) return;
    this.current = next;
    log.info(
      next
        ? `dispatch: ${next.resource}`
        : "no alert system runs: police alerts go nowhere",
    );
    const installed =
      next?.version && GetResourceMetadata(next.resource, "version", 0);
    if (next?.version && installed !== next.version)
      log.warn(
        `${next.resource} ${installed || "?"} is installed; its adapter is written for ${next.version}`,
      );
  }

  /** Sends an alert; `coords` come from the `source` player when the caller left them out. */
  send(alert: DispatchAlert): boolean {
    const adapter = this.current;
    if (!adapter) return false;
    const source =
      alert.source !== undefined && isOnline(alert.source)
        ? alert.source
        : undefined;
    let coords = alert.coords;
    if (!coords && source !== undefined) {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(
        GetPlayerPed(String(source)),
      );
      coords = { x, y, z };
    }
    try {
      adapter.alert({ ...alert, source, coords });
      return true;
    } catch (error) {
      log.error(`${adapter.resource} alert failed`, error);
      return false;
    }
  }
}

export const dispatch = new DispatchLayer();
dispatch.setChoice(settings.dispatch);
panel.onChange("settings", () => dispatch.setChoice(settings.dispatch));

const candidates = new Set(DISPATCH_SYSTEMS.map((a) => a.resource));
on(
  "onServerResourceStart",
  (resource: string) => candidates.has(resource) && dispatch.select(),
);
on("onResourceStop", (resource: string) => {
  if (!candidates.has(resource)) return;
  dispatch.select(resource);
  setTimeout(() => dispatch.select(), 0);
});

registerExport("SendDispatchAlert", (raw: unknown) => {
  const alert = toDispatchAlert(raw);
  return alert !== null && dispatch.send(alert);
});
