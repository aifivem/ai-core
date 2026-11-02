import { fail } from "@aifivem/lib/shared";
import { CORE, type Warrant } from "@aifivem/shared";
import { readMinutes } from "../../bans/parse";
import { actorName } from "../../characters/manage";
import { log } from "../../log";
import {
  addWarrant,
  clearWarrant,
  warrantReason,
} from "../../warrants/changes";
import { warrantStore } from "../../warrants/store";
import { charWatchers } from "./charWatchers";
import { action, logEdit, parse } from "./gate";

/**
 * The Warrants card of a character's page: issue one (reason, length) and clear one of ai-core's own warrants. The
 * list arrives as a `char` patch once the change is written (below), for loaded and stored characters alike. Logged
 * on ai-core's `warrants` channel and, like every action here, on `admin`.
 */

const admin = (source: number) => ({
  name: `admin ${actorName(source, "")}`.slice(0, 64),
  source,
});

/** `[charId, reason, minutes | null]` (null = until cleared). */
action(
  "warrant",
  ([charId, reason, minutes]) => {
    const id = parse.charId(charId);
    const why = warrantReason(reason);
    const mins = readMinutes(minutes);
    return id === null || why === null || mins === undefined
      ? null
      : ([id, why, mins] as const);
  },
  async (source, charId, reason, minutes) => {
    const result = await addWarrant({ charId }, reason, minutes, admin(source));
    if (!result.ok) return result;
    logEdit(source, charId, `warrant #${result.id}`, { reason, minutes });
    return { ok: true };
  },
);

/** `[charId, warrantId]` */
action(
  "clearWarrant",
  ([charId, warrantId]) => {
    const char = parse.charId(charId);
    const id = parse.charId(warrantId);
    return char === null || id === null ? null : ([char, id] as const);
  },
  async (source, charId, warrantId) => {
    if (!(await clearWarrant(warrantId, admin(source))))
      return fail("WARRANT_ERR_GONE");
    logEdit(source, charId, `cleared warrant #${warrantId}`);
    return { ok: true };
  },
);

// Any change (admin, officer, script) reaches the admins who have that character open.
on(CORE.warrantChangedEvent, (_kind: string, warrant: Warrant) => {
  const charId = warrant.charId;
  if (!charWatchers.watching(charId)) return;
  warrantStore
    .of(charId)
    .then((warrants) => charWatchers.char(charId, { warrants }))
    .catch((error: unknown) =>
      log.error(`warrants of #${charId} for the panel failed`, error),
    );
});
