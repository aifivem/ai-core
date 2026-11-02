import { fail } from "@aifivem/lib/shared";
import { CORE, type Warrant, type WarrantResult } from "@aifivem/shared";
import { readReason } from "../bans/parse";
import { actorName } from "../characters/manage";
import { coreLog } from "../logs";
import { players } from "../player/registry";
import {
  activeById,
  activeOfChar,
  clearRow,
  clearRows,
  insertWarrant,
} from "./repo";
import { warrantStore } from "./store";
import { subjectOf, type Subject } from "./subject";

/**
 * Issuing and clearing ai-core's own warrants: the row first, then memory (the character's cached answer forgotten,
 * a loaded one's list read again), then `CORE.warrantChangedEvent` once per warrant (the admin card and the MDT
 * record listen) and a line on ai-core's `warrants` channel.
 */

/** Who issues or clears: the text stored with the row and the server id for the log and the event. */
export interface Issuer {
  name: string;
  source: number | null;
}

/** An officer's server id names his character, a text is kept as given, anything else is the calling resource. */
export function issuerOf(by: unknown, fallback: string): Issuer {
  if (typeof by !== "number" || by <= 0)
    return { name: actorName(by, fallback), source: null };
  const player = players.get(by);
  return {
    name: player
      ? `${player.fullName} (${player.citizenid})`.slice(0, 64)
      : actorName(by, fallback),
    source: by,
  };
}

export const GONE = fail("ADMIN_PLAYERS_ERR_GONE");

/** A reason of 3 to 255 characters, or null. */
export function warrantReason(value: unknown): string | null {
  const reason = readReason(value);
  return reason.length >= 3 ? reason : null;
}

async function settled(
  subject: Subject,
  kind: "added" | "cleared",
  list: readonly Warrant[],
  by: Issuer,
): Promise<void> {
  warrantStore.forget(subject.citizenid);
  if (players.byCharacter(subject.charId))
    await warrantStore.refresh(subject.charId);
  for (const warrant of list)
    emit(CORE.warrantChangedEvent, kind, warrant, by.source);
}

function logLine(
  subject: Subject,
  message: string,
  by: Issuer,
  metadata: object,
) {
  coreLog("warrants", `${message} (${subject.name}, ${subject.citizenid})`, {
    source: by.source ?? undefined,
    target: subject.source ?? undefined,
    metadata: { charId: subject.charId, by: by.name, ...metadata },
  });
}

/** Issues a warrant (`minutes` null = until cleared); refused for an unknown character or a full list. */
export async function addWarrant(
  target: unknown,
  reason: string,
  minutes: number | null,
  by: Issuer,
): Promise<WarrantResult> {
  const subject = await subjectOf(target);
  if (!subject) return GONE;
  const created = Date.now();
  const fields = {
    charId: subject.charId,
    reason,
    by: by.name,
    created,
    expires: minutes === null ? null : created + minutes * 60_000,
  };
  const id = await insertWarrant(fields);
  if (id === null) return fail("WARRANT_ERR_FULL");
  logLine(subject, `warrant #${id}: ${reason}`, by, { id, reason, minutes });
  await settled(subject, "added", [{ id, ...fields }], by);
  return { ok: true, id };
}

/** Clears one active warrant; false when none has that id. */
export async function clearWarrant(id: number, by: Issuer): Promise<boolean> {
  const warrant = await activeById(id);
  if (!warrant || !(await clearRow(id, by.name))) return false;
  const subject = await subjectOf({ charId: warrant.charId });
  if (subject) {
    logLine(subject, `cleared warrant #${id}`, by, { id });
    await settled(subject, "cleared", [warrant], by);
  }
  return true;
}

/** Clears every active warrant of a character; how many (null: no such character). */
export async function clearWarrants(
  target: unknown,
  by: Issuer,
): Promise<number | null> {
  const subject = await subjectOf(target);
  if (!subject) return null;
  const list = await activeOfChar(subject.charId);
  if (list.length === 0) return 0;
  const count = await clearRows(subject.charId, by.name);
  logLine(subject, `cleared ${count} warrants`, by, { count });
  await settled(subject, "cleared", list, by);
  return count;
}
