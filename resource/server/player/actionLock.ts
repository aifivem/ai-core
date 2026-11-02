import { SourceLock } from "@aifivem/lib/server";
import type { CharacterActionResult } from "@aifivem/shared";

/** One character screen action at a time per player (screen callbacks, script logins, logout). */
export const lock = new SourceLock();
export const BUSY: CharacterActionResult = {
  ok: false,
  error: "CHAR_ERR_BUSY",
};
