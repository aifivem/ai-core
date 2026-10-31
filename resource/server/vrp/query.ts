import { isRecord } from "@aicore-fivem/lib/shared";
import { mysql, type Params } from "@aicore-fivem/mysql";
import { splitStatements } from "./sql";

/**
 * vRP's DB API (`prepare` / `query` / `execute` / `scalar`) on ai-core's pool: the Lua side keeps the prepared
 * names and sends the SQL. `@name` placeholders come from the params table; several statements run in order on one
 * connection (inside a transaction), the last one's result answers.
 */

export type VrpQueryMode = "query" | "execute" | "scalar";

interface Header {
  affectedRows: number;
}

const isHeader = (value: unknown): value is Header =>
  isRecord(value) && typeof value.affectedRows === "number";

/** A Lua table: an object of named values, a list for `?`, nothing for an empty table. */
function toParams(raw: unknown): Params {
  if (Array.isArray(raw)) return raw.length > 0 ? raw : undefined;
  return isRecord(raw) && Object.keys(raw).length > 0 ? raw : undefined;
}

/** What the Lua side gets after the error slot: rows + affected, affected, or the scalar. */
function answer(mode: VrpQueryMode, result: unknown): unknown[] {
  const rows = Array.isArray(result) ? result : [];
  const affected = isHeader(result) ? result.affectedRows : rows.length;
  if (mode === "execute") return [affected];
  if (mode === "scalar") {
    const first: unknown = rows[0];
    return [isRecord(first) ? (Object.values(first)[0] ?? null) : null];
  }
  return [rows, affected];
}

/** Runs a vRP query; `done(error, ...answer)` (error null on success). */
export function vrpQuery(
  sql: unknown,
  rawParams: unknown,
  rawMode: unknown,
  done: (error: string | null, ...rest: unknown[]) => void,
): void {
  const mode: VrpQueryMode =
    rawMode === "execute" || rawMode === "scalar" ? rawMode : "query";
  if (typeof sql !== "string" || sql.trim() === "") {
    done("empty query");
    return;
  }
  const params = toParams(rawParams);
  const statements = splitStatements(sql);
  const run =
    statements.length <= 1
      ? mysql.query(statements[0] ?? sql, params)
      : runAll(statements, params);
  run.then(
    (result) => done(null, ...answer(mode, result)),
    (error: unknown) =>
      done(error instanceof Error ? error.message : String(error)),
  );
}

/** Several statements on one connection (LAST_INSERT_ID() needs it); the last result. */
async function runAll(statements: string[], params: Params): Promise<unknown> {
  let last: unknown = null;
  let failure: unknown = null;
  const committed = await mysql.startTransaction(async (query) => {
    try {
      for (const statement of statements) last = await query(statement, params);
    } catch (error) {
      failure = error;
      return false;
    }
  });
  if (!committed)
    throw failure instanceof Error
      ? failure
      : new Error(String(failure ?? "transaction rolled back"));
  return last;
}
