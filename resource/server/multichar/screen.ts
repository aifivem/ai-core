import { GlobalKey, stateString } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { MULTICHARS } from "./registry";

/** ai-core's own screen: last in the list and always running, so `auto` falls back to it. */
const OWN = { resource: CORE.resource };
const published = new GlobalKey(CORE.characterScreenKey, stateString);

type Handler = (external: string | null) => void;
const handlers: Handler[] = [];

/**
 * Who shows the character screen: the panel's pick (`characterScreen`), else the first running multichar of the
 * registry, else ai-core. A picked multichar that does not run leaves ai-core's own screen, so players can always join.
 */
const picker = new AdapterPicker({
  category: "character screen",
  adapters: [...MULTICHARS, OWN],
  log,
  choice: settings.characterScreen,
  onSwitch: (next) => {
    const external =
      next && next.resource !== CORE.resource ? next.resource : null;
    published.set(external ?? undefined);
    log.info(
      external
        ? `characterScreenChanged: ${external} shows the character screen; ai-core's own screen, its bucket and its spawn are off`
        : "characterScreenChanged: ai-core's own character screen is on",
    );
    // The panel's read-only row; the first commit waits for the panel host (it calls ai-core's export).
    setImmediate(() => {
      const current = panel.get("settings");
      const shown = external ?? CORE.resource;
      if (current.characterScreenActive !== shown)
        panel.commit("settings", undefined, {
          ...current,
          characterScreenActive: shown,
        });
    });
    for (const handler of handlers) handler(external);
  },
});
panel.onChange("settings", () => picker.setChoice(settings.characterScreen));

/** The external character screen's resource name while one runs, else null (ai-core's own screen). */
export function externalScreen(): string | null {
  const active = picker.active;
  return active && active.resource !== CORE.resource ? active.resource : null;
}

/** Runs on every later switch with the new external screen (null = ai-core's own). */
export function onScreenSwitch(handler: Handler): void {
  handlers.push(handler);
}

/** Whether a known multichar is installed (any state but missing): it is about to start while the server boots. */
export function multicharInstalled(): boolean {
  return MULTICHARS.some((m) => {
    const state = GetResourceState(m.resource);
    return state !== "missing" && state !== "unknown";
  });
}
