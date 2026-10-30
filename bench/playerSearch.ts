// `bun bench/playerSearch.ts` in ai-core: the admin panel's player search (resource/server/admin/players/search.ts)
// through the real engine at 100k and 1M characters, in its own database `ai_core_search_bench` (dropped first).
// Names come from 60 first x 100 last names, 2% soft-deleted, every user with a license and every third a discord.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "../../../../packages/mysql/node_modules/mysql2/promise";
import { connection, fmt, time } from "./stubs";

const DB = "ai_core_search_bench";
const FIRST =
  "James John Joe Jose Joanna Josh Jordan Mary Michael Maria Mark Martin Linda Lisa Robert Rosa Ryan David Daniel Diana Emma Emily Ethan Noah Olivia Oliver Sophia Samuel Sarah Lucas Liam Mia Mason Logan Ava Amelia Aaron Abigail Benjamin Bella Carter Chloe Dylan Ella Finn Grace Henry Isla Jack Kai Leo Luna Max Nora Owen Paige Quinn Ruby Theo Zoe".split(
    " ",
  );
const LAST =
  "Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Perez Thompson White Harris Sanchez Clark Ramirez Lewis Robinson Walker Young Allen King Wright Scott Torres Nguyen Hill Flores Green Adams Nelson Baker Hall Rivera Campbell Mitchell Carter Roberts Gomez Phillips Evans Turner Diaz Parker Cruz Edwards Collins Reyes Stewart Morris Morales Murphy Cook Rogers Gutierrez Ortiz Morgan Cooper Peterson Bailey Reed Kelly Howard Ramos Kim Cox Ward Richardson Watson Brooks Chavez Wood James Bennett Gray Mendoza Ruiz Hughes Price Alvarez Castillo Sanders Patel Myers Long Ross Foster".split(
    " ",
  );

const admin = await createConnection({
  uri: connection("mysql"),
  multipleStatements: true,
});
await admin.query(
  `DROP DATABASE IF EXISTS ${DB}; CREATE DATABASE ${DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE ${DB}`,
);
await admin.query(
  readFileSync(join(import.meta.dir, "../sql/main.sql"), "utf8"),
);
const list = (names: string[]) => names.map((n) => `'${n}'`).join(", ");

async function seed(from: number, to: number): Promise<void> {
  const [, ms] = await time(async () => {
    await admin.query(
      `INSERT INTO ai_core_users (id, fivem, license, discord, name)
       SELECT seq, seq, SHA1(seq), IF(seq % 3 = 0, CONCAT('1000000000', LPAD(seq, 8, '0')), NULL), CONCAT('Player ', seq)
       FROM seq_${from}_to_${to}`,
    );
    await admin.query(
      `INSERT INTO ai_core_characters (id, user_id, citizenid, slot, firstname, lastname, birthdate, sex, last_played, deleted_at)
       SELECT seq, seq, seq, 1, ELT(1 + seq % ${FIRST.length}, ${list(FIRST)}),
              ELT(1 + (seq DIV ${FIRST.length}) % ${LAST.length}, ${list(LAST)}), '1990-01-01', 'male', NOW(),
              IF(seq % 50 = 0, NOW(), NULL)
       FROM seq_${from}_to_${to}`,
    );
    await admin.query("ANALYZE TABLE ai_core_users, ai_core_characters");
  });
  console.log(`seeded ${from}..${to} in ${fmt(ms)}`);
}

// The engine reads its connection string from the stubbed convar: point it at the bench database.
const g = globalThis as Record<string, unknown>;
const convar = g.GetConvar as (name: string, fallback: string) => string;
g.GetConvar = (name: string, fallback: string) =>
  name === "mysql_connection_string" ? connection(DB) : convar(name, fallback);
const { mysql } = await import("@aicore-fivem/mysql");
const { parseSearch, search, searchIds } =
  await import("../resource/server/admin/players/search");

async function median(fn: () => Promise<unknown>): Promise<number> {
  const runs: number[] = [];
  await fn();
  for (let i = 0; i < 7; i++) runs.push((await time(fn))[1]);
  runs.sort((a, b) => a - b);
  return runs[3] ?? 0;
}

async function measure(size: number): Promise<void> {
  const cases: [string, string, number | null][] = [
    ["prefix 'jo' (common)", "jo", null],
    ["one word 'Martinez'", "Martinez", null],
    ["two words 'john sm'", "john sm", null],
    ["no match 'zzz'", "zzz", null],
    ["'jo' page at the middle", "jo", Math.floor(size / 2)],
    ["citizen id", String(size - 7), null],
    [
      "license:<sha1>",
      `license:${(await admin.query<never>(`SELECT SHA1(${size - 3}) AS h`))[0][0].h}`,
      null,
    ],
    [
      "discord:<id>",
      `discord:1000000000${String(size - (size % 3)).padStart(8, "0")}`,
      null,
    ],
    ["rarer first name 'quinn'", "quinn", null],
    ["rare pair 'theo foster'", "theo foster", null],
  ];
  console.log(`\n${size.toLocaleString()} characters`);
  const rows: Record<string, unknown>[] = [];
  for (const [label, text, cursor] of cases) {
    const query = parseSearch(text);
    if (!query) throw new Error(`unparsed ${text}`);
    const page = await search(query, cursor, () => null);
    rows.push({
      case: label,
      ids: fmt(await median(() => searchIds(query, cursor))),
      "page (ids + rows)": fmt(
        await median(() => search(query, cursor, () => null)),
      ),
      found: page.rows.length,
      more: page.next !== null,
    });
  }
  console.table(rows);
  for (const [label, sql] of [
    [
      "firstname branch",
      "SELECT id FROM ai_core_characters WHERE deleted_at IS NULL AND firstname LIKE 'jo%' ESCAPE '!' AND id < 4294967296 ORDER BY id DESC LIMIT 26",
    ],
    [
      "two words",
      "SELECT id FROM ai_core_characters WHERE deleted_at IS NULL AND firstname LIKE 'john%' ESCAPE '!' AND lastname LIKE 'sm%' ESCAPE '!' AND id < 4294967296 ORDER BY id DESC LIMIT 26",
    ],
  ] as const) {
    const [plan] = await admin.query(`EXPLAIN ${sql}`);
    const r = (plan as Record<string, unknown>[])[0] ?? {};
    console.log(
      `  EXPLAIN ${label}: type=${String(r.type)} key=${String(r.key)} rows=${String(r.rows)} extra=${String(r.Extra)}`,
    );
  }
}

await seed(1, 100_000);
await measure(100_000);
await seed(100_001, 1_000_000);
await measure(1_000_000);
await mysql.end?.();
await admin.query(`DROP DATABASE ${DB}`);
await admin.end();
process.exit(0);
