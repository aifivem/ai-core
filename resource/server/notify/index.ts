import { GlobalKey, stateString } from "@aicore-fivem/lib/server";
import { CORE, LIB_UI } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { NOTIFY_SYSTEMS } from "./registry";

/**
 * ai-core's notify layer: the panel's pick while it runs, else ai-lib's own cards. No automatic pick: a server that
 * runs ox_lib for other scripts keeps ai-lib's cards until the owner picks otherwise. ai-lib reads the published pick
 * and hands its cards to ai-core's client (`ExternalNotify`) while one is set.
 */
const activeNotify = new GlobalKey(CORE.notifyStateKey, stateString);

const layer = new AdapterPicker({
  category: "notifications",
  adapters: NOTIFY_SYSTEMS,
  log,
  choice: settings.notify,
  noneText: "the picked notification UI does not run: ai-lib draws the cards",
  onSwitch: (next) =>
    activeNotify.set(
      next && next.resource !== LIB_UI.resource ? next.resource : undefined,
    ),
});
panel.onChange("settings", () => layer.setChoice(settings.notify));
