// `bun bench/members.bench.ts` in ai-core: GetJobMembers' page query and GetCharactersOfUser's license query on the
// seeded stress database (bench/seed.ts), before and after the membership index of admin/players/indexes.ts.
import { createConnection } from "../../../../packages/mysql/node_modules/mysql2/promise";
import { connection, STRESS_DB } from "./stubs";

const db = await createConnection({ uri: connection(STRESS_DB) });

const MEMBERS = `SELECT m.char_id, m.grade, c.citizenid, c.firstname, c.lastname
  FROM ai_core_character_jobs m JOIN ai_core_characters c ON c.id = m.char_id AND c.deleted_at IS NULL
  WHERE m.job = ? AND m.char_id > ? ORDER BY m.char_id LIMIT ?`;
const LICENSE = `SELECT c.id FROM ai_core_users u JOIN ai_core_characters c ON c.user_id = u.id AND c.deleted_at IS NULL
  WHERE u.license = ? ORDER BY u.id, c.slot`;

async function timed(
  label: string,
  sql: string,
  params: unknown[],
  runs = 20,
): Promise<void> {
  const [plan] = await db.query(`EXPLAIN ${sql}`, params);
  const started = performance.now();
  let rows = 0;
  for (let i = 0; i < runs; i++) {
    const [result] = await db.query(sql, params);
    rows = (result as unknown[]).length;
  }
  const ms = (performance.now() - started) / runs;
  console.log(`\n${label}: ${ms.toFixed(2)} ms per query, ${rows} rows`);
  console.table(
    (plan as Record<string, unknown>[]).map((r) => ({
      table: r.table,
      type: r.type,
      key: r.key,
      rows: r.rows,
      Extra: r.Extra,
    })),
  );
}

async function hasIndex(table: string, name: string): Promise<boolean> {
  const [rows] = await db.query(
    "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
    [table, name],
  );
  return (rows as unknown[]).length > 0;
}

/** The same in-place step as admin/players/indexes.ts (a seed from before it lacks them). */
async function addIndex(
  table: string,
  name: string,
  columns: string,
): Promise<void> {
  const started = performance.now();
  await db.query(
    `ALTER TABLE ${table} ADD INDEX \`${name}\` (${columns}), ALGORITHM=INPLACE, LOCK=NONE`,
  );
  const seconds = (performance.now() - started) / 1000;
  console.log(`
adding ${table}.${name}: ${seconds.toFixed(1)} s`);
}

const [[lic]] = (await db.query(
  "SELECT license FROM ai_core_users WHERE license IS NOT NULL LIMIT 1 OFFSET 500000",
)) as unknown as [[{ license: string } | undefined]];

if (!(await hasIndex("ai_core_character_jobs", "job"))) {
  await timed("members page 1 (no index)", MEMBERS, ["police", 0, 101], 3);
  await addIndex("ai_core_character_jobs", "job", "`job`, `char_id`, `grade`");
}
if (!(await hasIndex("ai_core_users", "license")))
  await addIndex("ai_core_users", "license", "`license`");
await timed("members page 1", MEMBERS, ["police", 0, 101]);
await timed("members deep page (after 1,400,000)", MEMBERS, [
  "police",
  1_400_000,
  101,
]);
await timed("members 500 per page", MEMBERS, ["police", 0, 501]);
if (lic) await timed("characters by license", LICENSE, [lic.license]);
await db.end();
