import type { DoorlockAdapter } from "@aicore-fivem/shared";
import { carrier } from "./carrier";

/**
 * cd_doorlock (docs): doors by unique id; a state is set with the client event
 * `cd_doorlock:SetDoorState_uniqueid (state, uniqueId)` sent to one player, whose client syncs it. Door states are
 * read through client exports only: no server read.
 */
export const cdDoorlock: DoorlockAdapter = {
  resource: "cd_doorlock",
  setLocked: (id, locked, by) => {
    const source = carrier(by);
    if (source === null) return false;
    emitNet("cd_doorlock:SetDoorState_uniqueid", source, locked, id);
    return true;
  },
  isLocked: () => null,
};
