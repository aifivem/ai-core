import type { DoorlockAdapter } from "@aicore-fivem/shared";
import { carrier } from "./carrier";

/**
 * qb-doorlock: no export; its server event `qb-doorlock:server:updateState (doorID, locked, src, usedLockpick,
 * unlockAnyway, enableSounds, enableAnimation, sentSource)` needs a loaded player as `sentSource` and skips the access
 * check with `unlockAnyway` (`server.lua`). Its door states live only in its own memory: no read.
 */
export const qbDoorlock: DoorlockAdapter = {
  resource: "qb-doorlock",
  version: "2.0.0",
  setLocked: (id, locked, by) => {
    const source = carrier(by);
    if (source === null) return false;
    emit(
      "qb-doorlock:server:updateState",
      id,
      locked,
      false,
      false,
      true,
      false,
      false,
      source,
    );
    return true;
  },
  isLocked: () => null,
};
