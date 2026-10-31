import { callExport, Reasons, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";

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

/** The running HUD ai-core drives (first in list order). */
const huds = new AdapterPicker({
  category: "HUD",
  adapters: ADAPTERS,
  log: createLogger("ai-core"),
  noneText: "no adapted HUD runs: ai-core shows and hides the minimap",
});

/**
 * Why HUDs are hidden now: a reason per full-screen UI that is open (lib `hud.hide` / `show`), owned by the calling
 * resource. HUDs show again when the last one closes or its resource stops. ai-core's own screens pass
 * `CORE.resource` as the owner.
 */
export const hudHidden = new Reasons();
hudHidden.onChange((hidden) => {
  const visible = !hidden;
  emit(CORE.clientHudVisibleEvent, visible);
  // Without a HUD that drives the minimap itself, the minimap follows too.
  if (!huds.call("visibility", (a) => (a.set(visible), true), false))
    DisplayRadar(visible);
});
registerExport(
  "HideHud",
  (reason: unknown) =>
    typeof reason === "string" && hudHidden.set(reason, true),
);
registerExport(
  "ShowHud",
  (reason: unknown) =>
    typeof reason === "string" && hudHidden.set(reason, false),
);
registerExport("IsHudVisible", () => !hudHidden.any);
// Every HUD has its own settings screen: the radial menu (and any script) opens the running one's through here.
registerExport("OpenHudSettings", () =>
  huds.call("settings", (a) => (a.settings(), true), false),
);
registerExport("HasHudSettings", () => huds.active !== null);
