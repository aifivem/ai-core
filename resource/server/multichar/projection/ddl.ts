import { mysql } from "@aicore-fivem/mysql";

/**
 * The ESX / QB tables external multichars read, created by ai-core as projections of its own tables. Framework names
 * on purpose (scripts hard-code them), so not `ai_core_` prefixed; marked as ai-core's by the table comment, and a
 * table without the mark (a real one of a server migrated from QB / ESX) is never created over, written or dropped.
 */

export type ProjectionTable = "players" | "users" | "jobs" | "job_grades";
export const PROJECTION_TABLES: readonly ProjectionTable[] = [
  "players",
  "users",
  "jobs",
  "job_grades",
];

const MARK = "ai-core projection";
const TAIL = `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='${MARK}: rebuilt from ai_core_* tables while an external character screen runs; inserts and updates are ignored, a deleted row soft-deletes the ai-core character'`;

/** No defaults on TEXT columns (MySQL 8 refuses literal ones): every insert names every column. */
const CREATE: Record<ProjectionTable, string> = {
  // QB / Qbox shape; `id` = ai-core character id, `user_id` = ai-core account (both ai-core's, read by the trigger and the refresh).
  players: `CREATE TABLE \`players\` (
    \`id\` INT UNSIGNED NOT NULL,
    \`citizenid\` VARCHAR(16) NOT NULL,
    \`user_id\` INT UNSIGNED NOT NULL,
    \`cid\` INT NOT NULL,
    \`license\` VARCHAR(60) NOT NULL,
    \`name\` VARCHAR(64) NOT NULL DEFAULT '',
    \`money\` TEXT NOT NULL,
    \`charinfo\` TEXT NOT NULL,
    \`job\` TEXT NOT NULL,
    \`gang\` TEXT NOT NULL,
    \`position\` TEXT NOT NULL,
    \`metadata\` LONGTEXT NOT NULL,
    \`inventory\` LONGTEXT DEFAULT NULL,
    \`last_updated\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`citizenid\`),
    UNIQUE KEY \`id\` (\`id\`),
    KEY \`user_id\` (\`user_id\`),
    KEY \`license\` (\`license\`)
  ) ${TAIL}`,
  // ESX shape; identifier = `char<slot>:<license without prefix>`.
  users: `CREATE TABLE \`users\` (
    \`identifier\` VARCHAR(64) NOT NULL,
    \`id\` INT UNSIGNED NOT NULL,
    \`user_id\` INT UNSIGNED NOT NULL,
    \`accounts\` LONGTEXT NOT NULL,
    \`group\` VARCHAR(50) NOT NULL DEFAULT 'user',
    \`inventory\` LONGTEXT DEFAULT NULL,
    \`job\` VARCHAR(32) NOT NULL DEFAULT 'unemployed',
    \`job_grade\` INT NOT NULL DEFAULT 0,
    \`loadout\` LONGTEXT DEFAULT NULL,
    \`metadata\` LONGTEXT DEFAULT NULL,
    \`position\` LONGTEXT DEFAULT NULL,
    \`firstname\` VARCHAR(32) NOT NULL DEFAULT '',
    \`lastname\` VARCHAR(32) NOT NULL DEFAULT '',
    \`dateofbirth\` VARCHAR(10) NOT NULL DEFAULT '',
    \`sex\` VARCHAR(1) NOT NULL DEFAULT 'm',
    \`height\` INT NOT NULL DEFAULT 0,
    \`skin\` LONGTEXT DEFAULT NULL,
    \`disabled\` TINYINT(1) DEFAULT 0,
    \`last_seen\` DATETIME DEFAULT NULL,
    PRIMARY KEY (\`identifier\`),
    UNIQUE KEY \`id\` (\`id\`),
    KEY \`user_id\` (\`user_id\`)
  ) ${TAIL}`,
  jobs: `CREATE TABLE \`jobs\` (
    \`name\` VARCHAR(50) NOT NULL,
    \`label\` VARCHAR(50) NOT NULL DEFAULT '',
    \`whitelisted\` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (\`name\`)
  ) ${TAIL}`,
  job_grades: `CREATE TABLE \`job_grades\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`job_name\` VARCHAR(50) NOT NULL,
    \`grade\` INT NOT NULL,
    \`name\` VARCHAR(50) NOT NULL,
    \`label\` VARCHAR(50) NOT NULL,
    \`salary\` INT NOT NULL DEFAULT 0,
    \`skin_male\` LONGTEXT NOT NULL,
    \`skin_female\` LONGTEXT NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`job_grade\` (\`job_name\`, \`grade\`)
  ) ${TAIL}`,
};

/**
 * A delete by anyone but ai-core's own refresh (which sets `@ai_core_projection` on its connection) soft-deletes the
 * character (`deleted_at`, the same as ai-core's delete) and notes it in `ai_core_deleted_log` (only a character it
 * really deleted, so a row deleted from both tables is noted once), where the account's next refresh finds it.
 * Two primary key statements per deleted row.
 */
const TRIGGERS: Partial<Record<ProjectionTable, string>> = {
  players: "ai_core_players_deleted",
  users: "ai_core_users_deleted",
};

const triggerSql = (table: ProjectionTable, name: string): string =>
  `CREATE TRIGGER \`${name}\` AFTER DELETE ON \`${table}\` FOR EACH ROW
   IF @ai_core_projection IS NULL THEN
     INSERT IGNORE INTO \`ai_core_deleted_log\` (\`char_id\`, \`user_id\`)
       SELECT \`id\`, \`user_id\` FROM \`ai_core_characters\` WHERE \`id\` = OLD.\`id\` AND \`deleted_at\` IS NULL;
     UPDATE \`ai_core_characters\` SET \`deleted_at\` = NOW() WHERE \`id\` = OLD.\`id\` AND \`deleted_at\` IS NULL;
   END IF`;

/** The names present now: `ours` carry the mark, `foreign` are real framework tables to leave alone. */
export async function inspect(): Promise<{
  ours: Set<ProjectionTable>;
  foreign: Set<ProjectionTable>;
}> {
  const rows = await mysql.query<
    Array<{ TABLE_NAME: string; TABLE_COMMENT: string }>
  >(
    "SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)",
    [PROJECTION_TABLES],
  );
  const ours = new Set<ProjectionTable>();
  const foreign = new Set<ProjectionTable>();
  for (const row of rows ?? []) {
    const name = PROJECTION_TABLES.find((t) => t === row.TABLE_NAME);
    if (!name) continue;
    if (row.TABLE_COMMENT.startsWith(MARK)) ours.add(name);
    else foreign.add(name);
  }
  return { ours, foreign };
}

/** Drops marked tables (their triggers go with them); the caller passes only names `inspect` found marked. */
export async function dropTables(
  names: Iterable<ProjectionTable>,
): Promise<void> {
  for (const name of names)
    await mysql.query(`DROP TABLE IF EXISTS \`${name}\``);
}

/** Creates one table fresh; answers why its delete trigger could not be made (no TRIGGER privilege, binlog rules), else null. */
export async function createTable(name: ProjectionTable): Promise<unknown> {
  await mysql.query(CREATE[name]);
  const trigger = TRIGGERS[name];
  if (!trigger) return null;
  return mysql.query(triggerSql(name, trigger)).then(
    () => null,
    (error: unknown) => error ?? "unknown error",
  );
}
