import type { DoorlockAdapter } from "@aicore-fivem/shared";
import { aiDoorlock } from "./adapters/ai-doorlock";
import { cdDoorlock } from "./adapters/cd_doorlock";
import { oxDoorlock } from "./adapters/ox_doorlock";
import { qbDoorlock } from "./adapters/qb-doorlock";
import { rcoreDoorlock } from "./adapters/rcore_doorlock";
import { tgiannDoorlock } from "./adapters/tgiann-doorlock";

/**
 * Every supported door lock script, in detection order: `auto` uses the first one running. ai-doorlock first (the
 * default), then TGIANN's, then the others.
 * A new door lock script = one adapter file and one line here.
 */
export const DOORLOCK_SYSTEMS: readonly DoorlockAdapter[] = [
  aiDoorlock,
  tgiannDoorlock,
  oxDoorlock,
  qbDoorlock,
  cdDoorlock,
  rcoreDoorlock,
];
