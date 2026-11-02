import { resourceExport } from "@aifivem/lib/server";
import type { DoorlockAdapter } from "@aifivem/shared";

/** ai-doorlock: doors by panel id, `SetDoorState(id, locked)` / `IsLocked(id)`. */
const doors = resourceExport("ai-doorlock");

export const aiDoorlock: DoorlockAdapter = {
  resource: "ai-doorlock",
  setLocked: (id, locked) => {
    doors.SetDoorState(id, locked);
    return true;
  },
  isLocked: (id) => doors.IsLocked(id) === true,
};
