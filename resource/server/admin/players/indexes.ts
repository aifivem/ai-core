import { mysql } from "@aicore-fivem/mysql";
import { databaseReady } from "../../database";
import { log } from "../../log";

/**
 * Indexes the player search needs (sql/main.sql has them for new installs). The table installer never adds keys to
 * existing tables, so a database from before them gets them here once: an in-place, lock-free `ADD INDEX` (InnoDB
 * builds a secondary index without copying the table; seconds at 1M rows, MariaDB 10.0+ / MySQL 5.6+).
 */
const WANTED = [
  [
    "ai_core_characters",
    "search_first",
    "`deleted_at`, `firstname`, `lastname`",
  ],
  [
    "ai_core_characters",
    "search_last",
    "`deleted_at`, `lastname`, `firstname`",
  ],
  ["ai_core_users", "license", "`license`"],
  ["ai_core_users", "discord", "`discord`"],
] as const;

async function addMissing(): Promise<void> {
  const rows =
    (await mysql.query<{ TABLE_NAME: string; INDEX_NAME: string }[]>(
      "SELECT DISTINCT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)",
      [[...new Set(WANTED.map(([table]) => table))]],
    )) ?? [];
  const have = new Set(rows.map((r) => `${r.TABLE_NAME}.${r.INDEX_NAME}`));
  for (const [table, name, columns] of WANTED) {
    if (have.has(`${table}.${name}`)) continue;
    log.info(`adding index ${name} to ${table} (player search)`);
    await mysql.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${columns}), ALGORITHM=INPLACE, LOCK=NONE`,
    );
  }
}

/** Resolves when the search indexes exist (a failure is logged; the search still runs, slower). */
export const searchReady: Promise<void> = databaseReady
  .then(addMissing)
  .catch((error: unknown) =>
    log.error("adding the player search indexes failed", error),
  );
