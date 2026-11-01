import { CORE } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";
import { log } from "../../log";
import { coreLog } from "../../logs";
import type { Tables } from "../../tables";

type Noted = Pick<Tables["ai_core_deleted_log"], "char_id" | "user_id">;

/**
 * Characters the projection delete trigger soft-deleted (`ai_core_deleted_log`) for these accounts, or for every
 * account when null (enabling / disabling the tables: deletes noted while ai-core was not looking): taken off the
 * log, then announced as `characterDeleted` like ai-core's own deletes (the info cache drops them). The log holds
 * only deletes not yet noticed, so each read is a few rows by index.
 */
export async function noticeDeletes(userIds: number[] | null): Promise<void> {
  if (userIds !== null && userIds.length === 0) return;
  let rows: Noted[];
  try {
    rows =
      (userIds === null
        ? await mysql.query<Noted[]>(
            "SELECT char_id, user_id FROM ai_core_deleted_log",
          )
        : await mysql.query<Noted[]>(
            "SELECT char_id, user_id FROM ai_core_deleted_log WHERE user_id IN (?)",
            [userIds],
          )) ?? [];
    if (rows.length === 0) return;
    await mysql.query("DELETE FROM ai_core_deleted_log WHERE char_id IN (?)", [
      rows.map((row) => row.char_id),
    ]);
  } catch (error) {
    // The rows stay: the account's next refresh tries again.
    log.error("reading characters deleted through the framework tables", error);
    return;
  }
  for (const row of rows) {
    emit(CORE.characterDeletedEvent, row.char_id, row.user_id);
    coreLog(
      "characters",
      `deleted character #${row.char_id} (framework tables)`,
      {
        level: "warn",
        metadata: { charId: row.char_id, userId: row.user_id },
      },
    );
  }
}
