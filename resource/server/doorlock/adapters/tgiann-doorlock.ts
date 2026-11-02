import { callExport } from "@aifivem/lib/server";
import type { DoorlockAdapter } from "@aifivem/shared";

/**
 * tgiann-doorlock: doors by key; server exports `SetDoorLocked(key, locked) -> boolean` (false for an unknown door)
 * and `GetDoorLocked(key) -> boolean | nil` (`server/exports.lua`).
 */
export const tgiannDoorlock: DoorlockAdapter = {
  resource: "tgiann-doorlock",
  version: "3.2.2",
  setLocked: (id, locked) =>
    callExport("tgiann-doorlock", "SetDoorLocked", id, locked) === true,
  isLocked: (id) => {
    const state = callExport("tgiann-doorlock", "GetDoorLocked", id);
    return typeof state === "boolean" ? state : null;
  },
};
