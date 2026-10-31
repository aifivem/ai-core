import { coordsOf, isOnline, registerExport } from "@aicore-fivem/lib/server";
import { toDispatchAlert, type DispatchAlert } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { DISPATCH_SYSTEMS } from "./registry";

/**
 * ai-core's dispatch layer: every script (lib `dispatch.alert`) sends police alerts through `SendDispatchAlert` and the
 * active alert system shows them through its adapter (`registry.ts`), picked by the panel setting `dispatch`
 * (`auto` = first running) and again when an alert system starts or stops.
 */
export const dispatch = new AdapterPicker({
  category: "dispatch",
  adapters: DISPATCH_SYSTEMS,
  log,
  choice: settings.dispatch,
  noneText: "no alert system runs: police alerts go nowhere",
});
panel.onChange("settings", () => dispatch.setChoice(settings.dispatch));

/** Sends an alert; `coords` come from the `source` player when the caller left them out. */
export function sendAlert(alert: DispatchAlert): boolean {
  const source =
    alert.source !== undefined && isOnline(alert.source)
      ? alert.source
      : undefined;
  let coords = alert.coords;
  if (!coords && source !== undefined) coords = coordsOf(source);
  return dispatch.call(
    "alert",
    (a) => {
      a.alert({ ...alert, source, coords });
      return true;
    },
    false,
  );
}

registerExport("SendDispatchAlert", (raw: unknown) => {
  const alert = toDispatchAlert(raw);
  return alert !== null && sendAlert(alert);
});
