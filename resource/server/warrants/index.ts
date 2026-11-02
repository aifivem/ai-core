import { caller, every, registerExport } from "@aifivem/lib/server";
import { fail, isRecord } from "@aifivem/lib/shared";
import { CORE, type WarrantPage, type WarrantResult } from "@aifivem/shared";
import { readMinutes } from "../bans/parse";
import { answer } from "../characters/answer";
import { toCharId } from "../characters/edit";
import { databaseReady } from "../database";
import { log } from "../log";
import { players } from "../player/registry";
import {
  addWarrant,
  clearWarrant,
  clearWarrants,
  issuerOf,
  warrantReason,
} from "./changes";
import { activePage, sweepExpired } from "./repo";
import { warrantStore } from "./store";
import { subjectOf } from "./subject";

/**
 * ai-core's own warrants (`ai_core_warrants`, folder `CLAUDE.md`): exports for scripts (lib `warrants`), a loaded
 * character's list in memory, the expiry sweep. Admins set them on the Players page (`admin/players/warrants.ts`),
 * officers in ai-police's job menu; the MDT layer's `hasWarrant` reads them by the panel setting `warrants`.
 */

const INVALID: WarrantResult = fail("CORE_ERR_ARGS");
const EMPTY: WarrantPage = { warrants: [], next: null };

registerExport("AddWarrant", (raw: unknown, done?: unknown) => {
  const from = caller();
  if (!isRecord(raw))
    return answer("add warrant", Promise.resolve(INVALID), done, INVALID);
  const reason = warrantReason(raw.reason);
  const minutes = readMinutes(raw.minutes);
  if (reason === null)
    return answer(
      "add warrant",
      Promise.resolve(fail("WARRANT_ERR_REASON")),
      done,
      INVALID,
    );
  if (minutes === undefined)
    return answer("add warrant", Promise.resolve(INVALID), done, INVALID);
  const work = addWarrant(raw.target, reason, minutes, issuerOf(raw.by, from));
  answer("add warrant", work, done, INVALID);
});

registerExport("ClearWarrant", (id: unknown, by?: unknown, done?: unknown) => {
  const who = issuerOf(by, caller());
  const warrantId = toCharId(id);
  const work =
    warrantId === null ? Promise.resolve(false) : clearWarrant(warrantId, who);
  answer("clear warrant", work, done, false);
});

registerExport(
  "ClearWarrants",
  (target: unknown, by?: unknown, done?: unknown) => {
    const who = issuerOf(by, caller());
    const work = clearWarrants(target, who).then((count) => count ?? 0);
    answer("clear warrants", work, done, 0);
  },
);

registerExport("GetWarrants", (target: unknown, done: unknown) => {
  const work = subjectOf(target).then((subject) =>
    subject ? warrantStore.of(subject.charId) : null,
  );
  answer("warrant list", work, done, null);
});

registerExport("ListWarrants", (cursor: unknown, done: unknown) => {
  const after = cursor == null ? null : toCharId(cursor);
  const work =
    cursor != null && after === null
      ? Promise.resolve(EMPTY)
      : activePage(after);
  answer("active warrants", work, done, EMPTY);
});

// A loaded character's active warrants are read once at load (and after each of its changes).
on(CORE.playerLoadedEvent, (source: number) => {
  const charId = players.get(source)?.charId;
  if (charId !== undefined)
    warrantStore
      .refresh(charId)
      .catch((error: unknown) =>
        log.error(`warrants of #${charId} failed`, error),
      );
});
on(CORE.playerUnloadedEvent, (_source: number, charId: number) => {
  warrantStore.drop(charId);
});

// Expired warrants are closed once a minute, so the active keys hold only live rows.
void databaseReady.then(() =>
  every(60_000, () => sweepExpired(), { name: "warrant sweep" }),
);
