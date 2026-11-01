import type { VrpRow } from "./data";

/** SQL text helpers of the vRP layer (pure: the bench runs them). */

/** The upsert of a chunk of `ai_core_vrp_data` rows: the statement and its values (values as bytes). */
export function upsertStatement(rows: VrpRow[]): [string, unknown[]] {
  const values: unknown[] = [];
  for (const row of rows)
    values.push(row.kind, row.owner, row.key, Buffer.from(row.hex, "hex"));
  const tuples = new Array<string>(rows.length).fill("(?, ?, ?, ?)").join(", ");
  return [
    `INSERT INTO ai_core_vrp_data (kind, owner, dkey, dvalue) VALUES ${tuples} ON DUPLICATE KEY UPDATE dvalue = VALUES(dvalue)`,
    values,
  ];
}

/**
 * A script's SQL split into statements at `;` outside quotes, backticks and comments (the engine runs one statement
 * per call; vRP's own base and some scripts send `INSERT ...; SELECT LAST_INSERT_ID() AS id`). Empty parts drop.
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (quote) {
      if (char === "\\" && quote !== "`") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    else if (
      char === "-" &&
      sql[i + 1] === "-" &&
      /\s/.test(sql[i + 2] ?? "\n")
    ) {
      const end = sql.indexOf("\n", i);
      i = end < 0 ? sql.length : end;
    } else if (char === "#") {
      const end = sql.indexOf("\n", i);
      i = end < 0 ? sql.length : end;
    } else if (char === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 1;
    } else if (char === ";") {
      out.push(sql.slice(start, i));
      start = i + 1;
    }
  }
  out.push(sql.slice(start));
  return out.map((part) => part.trim()).filter((part) => part !== "");
}
