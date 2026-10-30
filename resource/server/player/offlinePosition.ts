import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord, waitFor } from "@aicore-fivem/lib/shared";
import type { Position } from "common/adminPlayers";
import { characterExists } from "../admin/players/repo";
import { log } from "../log";
import { offline } from "../admin/players/offline";
import { claims, players } from "./registry";

/** How long a write waits for a load or an unload save holding the character to finish. */
const HOLD_WAIT_MS = 30_000;

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function toPosition(v: unknown): Position | null {
  if (!isRecord(v)) return null;
  const { x, y, z, heading } = v;
  return finite(x) && finite(y) && finite(z)
    ? { x, y, z, heading: finite(heading) ? heading : 0 }
    : null;
}

/**
 * Moves a stored character's spawn point (a sleeping body that was carried away). Runs after the unload save or a
 * load that holds the character, then writes while holding it; skipped when the character is loaded by then (its
 * ped is the truth). Admins with the character open see the change.
 */
async function setOfflinePosition(charId: number, p: Position): Promise<void> {
  await waitFor(() => !claims.has(charId) || undefined, HOLD_WAIT_MS);
  const done = await claims.run(charId, false, async () => {
    if (players.byCharacter(charId) || !(await characterExists(charId)))
      return true;
    await offline.position(charId, p);
    return true;
  });
  if (!done) log.warn(`offline position of #${charId} skipped: character busy`);
}

registerExport("SetOfflinePosition", (charId: unknown, position: unknown) => {
  const p = toPosition(position);
  if (typeof charId !== "number" || !Number.isInteger(charId) || !p)
    return false;
  if (players.byCharacter(charId)) return false;
  setOfflinePosition(charId, p).catch((error: unknown) =>
    log.error(`offline position of #${charId} failed`, error),
  );
  return true;
});
