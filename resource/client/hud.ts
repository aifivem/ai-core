import { callExport, Reasons, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";

/**
 * HUD resources ai-core drives besides those listening to `CORE.clientHudVisibleEvent` (ai-hud does), first running wins.
 * `set` hides / shows the HUD (a HUD without such an API toggles the minimap like no HUD); `settings` opens its own
 * settings menu (its /hud), absent when it has none. Calls per HUD: `docs/compat/hud.md`.
 */
const ADAPTERS: ReadonlyArray<{
  resource: string;
  /** The version the calls were read from; ai-core warns when another one runs. */
  version?: string;
  set: (visible: boolean) => void;
  settings?: () => void;
}> = [
  {
    resource: "tgiann-lumihud",
    version: "2.2.1",
    set: (visible) => TriggerEvent("tgiann-lumihud:ui", visible),
    settings: () => TriggerEvent("tgiann-lumihud:hudMenu"),
  },
  {
    resource: "tgiann-hudv2",
    set: (visible) => TriggerEvent("tgiann-hud:ui", visible),
    settings: () => TriggerEvent("tgiann-hud:hudMenu"),
  },
  {
    resource: "tgiann-modern-hud",
    set: (visible) => TriggerEvent("tgiann-modernHud:ui", visible),
    settings: () => TriggerEvent("tgiann-modernHud:hudMenu"),
  },
  {
    resource: "tgiann-statushud",
    set: (visible) => TriggerEvent("tgiann-statushud:ui", visible),
  },
  {
    resource: "jg-hud",
    version: "1.5.0",
    set: (visible) => void callExport("jg-hud", "toggleHud", visible),
    // Its default `Config.OpenSettingsCommand`.
    settings: () => ExecuteCommand("settings"),
  },
  {
    resource: "0r-hud-v3",
    set: (visible) => void callExport("0r-hud-v3", "ToggleVisible", visible),
  },
  {
    resource: "codem-supreme-hud",
    set: (visible) =>
      void callExport("codem-supreme-hud", visible ? "ShowHud" : "HideHud"),
    settings: () => TriggerEvent("codem-hud:client:OpenSettings"),
  },
  {
    resource: "Codem-BlackHUDV2",
    // (hide, disableMinimap)
    set: (visible) =>
      TriggerEvent("codem-blackhudv2:SetForceHide", !visible, !visible),
  },
  {
    resource: "wais-hudv6",
    set: (visible) => TriggerEvent("wais:hudv6:client:hideHud", !visible),
  },
  {
    // qb-hud and ps-hud cannot be hidden by another script: only the minimap follows.
    resource: "qb-hud",
    version: "2.2.0",
    set: (visible) => DisplayRadar(visible),
    settings: () => ExecuteCommand("menu"),
  },
  {
    resource: "ps-hud",
    version: "2.1.2",
    set: (visible) => DisplayRadar(visible),
    settings: () => ExecuteCommand("menu"),
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
  huds.call(
    "settings",
    (a) => (a.settings ? (a.settings(), true) : false),
    false,
  ),
);
registerExport("HasHudSettings", () => huds.active?.settings !== undefined);
