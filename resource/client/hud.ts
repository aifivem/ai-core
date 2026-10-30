import {
  callExport,
  isResourceStarted,
  registerExport,
} from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

/** HUD resources ai-core drives besides those listening to `CORE.clientHudVisibleEvent` (ai-hud does). */
const ADAPTERS: ReadonlyArray<{
  resource: string;
  set: (visible: boolean) => void;
  /** Opens the HUD's own settings (its /hud). */
  settings: () => void;
}> = [
  {
    resource: "tgiann-lumihud",
    set: (visible) => TriggerEvent("tgiann-lumihud:ui", visible),
    settings: () => ExecuteCommand("hud"),
  },
  {
    // ai-hud follows the visibility event itself and drives the minimap (its panel's minimap mode).
    resource: "ai-hud",
    set: () => undefined,
    settings: () => callExport("ai-hud", "OpenSettings"),
  },
];

/**
 * Why HUDs are hidden now: `<resource>:<reason>` of every full-screen UI that is open (lib `hud.hide` / `show`).
 * HUDs show again when the last one closes or its resource stops.
 */
class HudVisibility {
  private readonly reasons = new Set<string>();

  get visible(): boolean {
    return this.reasons.size === 0;
  }

  set(reason: string, hidden: boolean): void {
    const before = this.visible;
    if (hidden) this.reasons.add(reason);
    else this.reasons.delete(reason);
    if (this.visible !== before) this.announce();
  }

  drop(resource: string): void {
    const before = this.visible;
    for (const r of this.reasons)
      if (r.startsWith(`${resource}:`)) this.reasons.delete(r);
    if (this.visible !== before) this.announce();
  }

  private announce(): void {
    emit(CORE.clientHudVisibleEvent, this.visible);
    let radarOwner = false;
    for (const a of ADAPTERS)
      if (isResourceStarted(a.resource)) {
        a.set(this.visible);
        radarOwner = true;
      }
    // Without a HUD that drives the minimap itself, the minimap follows too.
    if (!radarOwner) DisplayRadar(this.visible);
  }
}

const visibility = new HudVisibility();
const owner = () => GetInvokingResource() || CORE.resource;
registerExport(
  "HideHud",
  (reason: unknown) =>
    typeof reason === "string" && visibility.set(`${owner()}:${reason}`, true),
);
registerExport(
  "ShowHud",
  (reason: unknown) =>
    typeof reason === "string" && visibility.set(`${owner()}:${reason}`, false),
);
registerExport("IsHudVisible", () => visibility.visible);
// Every HUD has its own settings screen: the radial menu (and any script) opens the running one's through here.
registerExport("OpenHudSettings", () => {
  const adapter = ADAPTERS.find((a) => isResourceStarted(a.resource));
  if (!adapter) return false;
  adapter.settings();
  return true;
});
registerExport("HasHudSettings", () =>
  ADAPTERS.some((a) => isResourceStarted(a.resource)),
);
on("onClientResourceStop", (resource: string) => visibility.drop(resource));
