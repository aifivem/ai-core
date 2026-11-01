import { mysql, type TransactionQuery } from "@aicore-fivem/mysql";
import { log } from "../../log";
import type { ProjectionTable } from "./ddl";
import { readCharacters, type CharacterState } from "./read";
import { ESX_COLUMNS, esxRow, jobRows, QB_COLUMNS, qbRow } from "./rows";

/** Rows per insert statement. */
const INSERT_CHUNK = 500;

async function insertRows(
  query: TransactionQuery,
  table: ProjectionTable,
  columns: string,
  rows: unknown[][],
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const part = rows.slice(i, i + INSERT_CHUNK);
    const one = `(${part[0]?.map(() => "?").join(", ")})`;
    await query(
      `INSERT INTO \`${table}\` (${columns}) VALUES ${part.map(() => one).join(", ")}`,
      part.flat(),
    );
  }
}

/** Rewrites these jobs in `jobs` / `job_grades` (gone ones are removed). */
export async function writeJobs(
  names: string[],
  owned: ReadonlySet<ProjectionTable>,
): Promise<void> {
  const { jobs, grades } = jobRows(names);
  const ok = await mysql.startTransaction(async (query) => {
    if (owned.has("jobs")) {
      await query("DELETE FROM `jobs` WHERE name IN (?)", [names]);
      await insertRows(query, "jobs", "name, label, whitelisted", jobs);
    }
    if (owned.has("job_grades")) {
      await query("DELETE FROM `job_grades` WHERE job_name IN (?)", [names]);
      await insertRows(
        query,
        "job_grades",
        "job_name, grade, name, label, salary, skin_male, skin_female",
        grades,
      );
    }
  });
  if (!ok) log.error(`writing jobs ${names.join(", ")} failed`);
}

/** Accounts whose QB rows carry one of these jobs or gangs (`jobs:<name>` / `gangs:<name>`): labels live in the JSON. */
export async function holders(
  keys: string[],
  owned: ReadonlySet<ProjectionTable>,
): Promise<number[]> {
  if (!owned.has("players")) return [];
  const out: number[] = [];
  for (const column of ["job", "gang"] as const) {
    const names = keys
      .filter((k) => k.startsWith(`${column}s:`))
      .map((k) => k.slice(column.length + 2));
    if (names.length === 0) continue;
    const rows = await mysql.query<Array<{ user_id: number }>>(
      `SELECT DISTINCT user_id FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(\`${column}\`, '$.name')) IN (?)`,
      [names],
    );
    for (const row of rows ?? []) out.push(row.user_id);
  }
  return out;
}

/**
 * Rebuilds the rows of `ids` and removes those of `removed`, in one transaction: delete by account, multi-row insert.
 * The session flag keeps the delete triggers from soft-deleting characters (ai-core's own pool only).
 */
export async function writeAccounts(
  ids: number[],
  removed: number[],
  owned: ReadonlySet<ProjectionTable>,
  live: (charId: number) => CharacterState | undefined,
): Promise<void> {
  const chars = await readCharacters(ids, live);
  const all = [...ids, ...removed];
  const targets = [
    ["players", QB_COLUMNS, chars.map(qbRow)],
    ["users", ESX_COLUMNS, chars.map(esxRow)],
  ] as const;
  const ok = await mysql.startTransaction(async (query) => {
    await query("SET @ai_core_projection = 1");
    for (const [table, columns, rows] of targets) {
      if (!owned.has(table)) continue;
      await query(`DELETE FROM \`${table}\` WHERE user_id IN (?)`, [all]);
      await insertRows(query, table, columns, rows);
    }
    await query("SET @ai_core_projection = NULL");
  });
  if (!ok) log.error(`writing framework rows of ${all.length} accounts failed`);
}
