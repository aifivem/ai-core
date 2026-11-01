import { mysql } from "@aicore-fivem/mysql";
import type { Tables } from "../tables";
import { upsertStatement } from "./sql";
import type { VrpBackend, VrpKind, VrpRow } from "./data";

/** `ai_core_vrp_data` on ai-core's pool: one primary key read per key, one multi-row upsert per chunk. */

/** The engine answers a binary BLOB as a byte array (oxmysql's shape). */
function toHex(value: unknown): string | null {
  if (Array.isArray(value) || value instanceof Uint8Array)
    return Buffer.from(value as ArrayLike<number>).toString("hex");
  return null;
}

export const vrpBackend: VrpBackend = {
  async read(kind: VrpKind, owner: string, key: string) {
    const row = await mysql.single<Pick<Tables["ai_core_vrp_data"], "dvalue">>(
      "SELECT dvalue FROM ai_core_vrp_data WHERE kind = ? AND owner = ? AND dkey = ?",
      [kind, owner, key],
    );
    return row ? (toHex(row.dvalue) ?? "") : null;
  },
  async write(rows: VrpRow[]) {
    if (rows.length === 0) return;
    const [sql, values] = upsertStatement(rows);
    await mysql.query(sql, values);
  },
};
