import { isOnline, registerExport } from "@aicore-fivem/lib/server";
import { readText } from "@aicore-fivem/lib/shared";
import { AdapterPicker } from "common/adapters";
import { panel, settings } from "../content";
import { log } from "../log";
import { DOORLOCK_SYSTEMS } from "./registry";

/**
 * ai-core's door lock layer: scripts lock and unlock doors by the active door lock script's own door id through these
 * exports (lib `doors`), picked by the panel setting `doorlock` (`auto` = first running).
 */
export const doorlock = new AdapterPicker({
  category: "door lock",
  adapters: DOORLOCK_SYSTEMS,
  log,
  choice: settings.doorlock,
  noneText: "no door lock script runs: door lock calls do nothing",
});
panel.onChange("settings", () => doorlock.setChoice(settings.doorlock));

/** A door id from another resource: text, or a whole number (ox_doorlock's database ids). */
const doorId = (v: unknown): string | null =>
  typeof v === "number" && Number.isInteger(v) ? String(v) : readText(v, 128);

registerExport("GetDoorlockSystem", () => doorlock.active?.resource ?? null);
registerExport(
  "SetDoorLocked",
  (id: unknown, locked: unknown, by?: unknown) => {
    const door = doorId(id);
    if (door === null || typeof locked !== "boolean") return false;
    const player = typeof by === "number" && isOnline(by) ? by : null;
    return doorlock.call(
      "setLocked",
      (a) => a.setLocked(door, locked, player),
      false,
    );
  },
);
registerExport("IsDoorLocked", (id: unknown) => {
  const door = doorId(id);
  return door === null
    ? null
    : doorlock.call("isLocked", (a) => a.isLocked(door), null);
});
