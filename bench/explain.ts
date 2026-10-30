// `bun bench/explain.ts` in ai-core: EXPLAIN of ai-core's per-login queries on the seeded stress database.
import { createConnection } from "../../../../packages/mysql/node_modules/mysql2/promise";
import { connection, STRESS_DB } from "./stubs";

const db = await createConnection({ uri: connection(STRESS_DB) });
const queries: [string, string, unknown[]][] = [
  ["user by fivem", "SELECT id, char_slots FROM ai_core_users WHERE fivem = ?", ["123456"]],
  ["characters of user", "SELECT id FROM ai_core_characters WHERE user_id = ? AND deleted_at IS NULL ORDER BY slot", [123456]],
  ["card extras", `SELECT c.id,
    (SELECT j.job FROM ai_core_character_jobs j WHERE j.char_id = c.id ORDER BY j.grade DESC LIMIT 1) AS job,
    (SELECT a.balance FROM ai_core_accounts a WHERE a.owner_type = 'character' AND a.owner_id = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci AND a.name = 'cash') AS cash
    FROM ai_core_characters c WHERE c.id IN (?)`, [[123456, 1123456]]],
  ["accounts of owner", "SELECT id, name, balance FROM ai_core_accounts WHERE owner_type = ? AND owner_id = ?", ["character", "123456"]],
  ["jobs of char", "SELECT job, grade FROM ai_core_character_jobs WHERE char_id = ?", [123456]],
  ["ledger page", "SELECT id, amount FROM ai_core_transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT 20", [4242]],
];
for (const [name, sql, params] of queries) {
  const [rows] = await db.query(`EXPLAIN ${sql}`, params);
  console.log(`\n${name}`);
  console.table((rows as Record<string, unknown>[]).map((r) => ({ table: r.table, type: r.type, key: r.key, rows: r.rows, Extra: r.Extra })));
}
await db.end();
