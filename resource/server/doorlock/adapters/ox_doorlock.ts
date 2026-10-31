import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { DoorlockAdapter } from "@aicore-fivem/shared";

/** A door as ox_doorlock returns it (`getDoor` / `getDoorFromName`: `{ id, state }`, state 1 = locked). */
function door(id: string): { id: number; locked: boolean } | null {
  const raw = /^\d+$/.test(id)
    ? callExport("ox_doorlock", "getDoor", Number(id))
    : callExport("ox_doorlock", "getDoorFromName", id);
  return isRecord(raw) && typeof raw.id === "number"
    ? { id: raw.id, locked: raw.state === 1 }
    : null;
}

/**
 * ox_doorlock: doors by their database id or name; server exports `getDoor(id)`, `getDoorFromName(name)` and
 * `setDoorState(id, state, lockpick?) -> boolean` (state 1 locked, 0 unlocked; `server/main.lua`).
 */
export const oxDoorlock: DoorlockAdapter = {
  resource: "ox_doorlock",
  version: "1.23.0",
  setLocked: (id, locked) => {
    const found = door(id);
    return (
      found !== null &&
      callExport("ox_doorlock", "setDoorState", found.id, locked ? 1 : 0) ===
        true
    );
  },
  isLocked: (id) => door(id)?.locked ?? null,
};
