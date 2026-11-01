// `bun bench/banSearch.ts` in ai-core: the ban lists, search and history of the admin panel and the `ListBans` /
// `GetBanHistory` exports (resource/server/bans/query.ts) through the real engine at 100k and 1M bans, in its own
// database `ai_core_ban_bench` (dropped first). Every ban has fivem + license, every third a discord, every fourth an
// ip; a fifth permanent, two fifths running, a fifth ended, a fifth lifted; names from 60 nicknames + a number.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "../../../../packages/mysql/node_modules/mysql2/promise";
import { connection, fmt, time } from "./stubs";

const DB = "ai_core_ban_bench";
const NICKS =
  "james john joe jose joanna josh jordan mary michael maria mark martin linda lisa robert rosa ryan david daniel diana emma emily ethan noah olivia oliver sophia samuel sarah lucas liam mia mason logan ava amelia aaron abigail benjamin bella carter chloe dylan ella finn grace henry isla jack kai leo luna max nora owen paige quinn ruby theo zoe".split(
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
const list = NICKS.map((n) => `'${n}'`).join(", ");

async function seed(from: number, to: number): Promise<void> {
  const [, ms] = await time(async () => {
    // Created one ban per minute back from now; kind = seq % 5.
    await admin.query(
      `INSERT INTO ai_core_bans (id, fivem, license, discord, ip, name, reason, banned_by, created_at, expires_at, revoked_at, revoked_by)
       SELECT seq, seq, SHA1(seq), IF(seq % 3 = 0, CONCAT('3000000000', LPAD(seq, 8, '0')), NULL),
              IF(seq % 4 = 0, CONCAT('10.', seq DIV 65536 % 256, '.', seq DIV 256 % 256, '.', seq % 256), NULL),
              CONCAT(ELT(1 + seq % ${NICKS.length}, ${list}), seq), 'Cheating', 'bench',
              NOW() - INTERVAL seq MINUTE,
              CASE seq % 5 WHEN 0 THEN NULL WHEN 3 THEN NOW() - INTERVAL seq DIV 2 MINUTE ELSE NOW() + INTERVAL 30 DAY END,
              IF(seq % 5 = 4, NOW() - INTERVAL seq DIV 3 MINUTE, NULL), IF(seq % 5 = 4, 'bench', NULL)
       FROM seq_${from}_to_${to}`,
    );
    await admin.query("ANALYZE TABLE ai_core_bans");
  });
  console.log(`seeded ${from}..${to} in ${fmt(ms)}`);
}

// The engine reads its connection string from the stubbed convar: point it at the bench database.
const g = globalThis as Record<string, unknown>;
const convar = g.GetConvar as (name: string, fallback: string) => string;
g.GetConvar = (name: string, fallback: string) =>
  name === "mysql_connection_string" ? connection(DB) : convar(name, fallback);
const { mysql } = await import("@aicore-fivem/mysql");
const { BanStore } = await import("../resource/server/bans/store");
const { historyOf, listBans } = await import("../resource/server/bans/query");
const { readBanQuery } = await import("../resource/server/bans/search");

async function median(fn: () => Promise<unknown>): Promise<number> {
  const runs: number[] = [];
  await fn();
  for (let i = 0; i < 7; i++) runs.push((await time(fn))[1]);
  runs.sort((a, b) => a - b);
  return runs[3] ?? 0;
}

async function measure(size: number): Promise<void> {
  // Active bans come from memory in the game; an empty store here measures only the SQL branches.
  const store = new BanStore();
  const mid = Math.floor(size / 2);
  const [[cursorRow]] = await admin.query<never>(
    `SELECT id, revoked_at, expires_at FROM ai_core_bans WHERE id = ${mid - (mid % 5) + 4}`,
  );
  const [[expiredRow]] = await admin.query<never>(
    `SELECT id, expires_at FROM ai_core_bans WHERE id = ${mid - (mid % 5) + 3}`,
  );
  const cases: [string, unknown][] = [
    ["all, page 1", { filter: "all" }],
    [
      "all, page in the middle",
      { filter: "all", cursor: { id: mid, at: null } },
    ],
    ["revoked, page 1", { filter: "revoked" }],
    [
      "revoked, page in the middle",
      {
        filter: "revoked",
        cursor: {
          id: (cursorRow as { id: number }).id,
          at: Number(new Date((cursorRow as { revoked_at: Date }).revoked_at)),
        },
      },
    ],
    ["expired, page 1", { filter: "expired" }],
    [
      "expired, page in the middle",
      {
        filter: "expired",
        cursor: {
          id: (expiredRow as { id: number }).id,
          at: Number(new Date((expiredRow as { expires_at: Date }).expires_at)),
        },
      },
    ],
    ["name 'jo' (common), all", { filter: "all", search: "jo" }],
    ["name 'jo', active", { filter: "active", search: "jo" }],
    ["name 'quinn1', revoked", { filter: "revoked", search: "quinn1" }],
    ["name 'zzz' (no match)", { filter: "all", search: "zzz" }],
    [
      "number (ban id / fivem / discord)",
      { filter: "all", search: String(size - 7) },
    ],
    ["license (40 hex)", { filter: "all", search: "LICENSE" }],
    ["ip:", { filter: "all", search: "ip:10.0.1.4" }],
  ];
  const [[sha]] = await admin.query<never>(`SELECT SHA1(${size - 3}) AS h`);
  console.log(`\n${size.toLocaleString()} bans`);
  const rows: Record<string, unknown>[] = [];
  for (const [label, raw] of cases) {
    const query = readBanQuery(
      JSON.parse(
        JSON.stringify(raw).replace("LICENSE", (sha as { h: string }).h),
      ),
    );
    if (!query) throw new Error(`unparsed ${label}`);
    const page = await listBans(query, store);
    rows.push({
      case: label,
      page: fmt(await median(() => listBans(query, store))),
      found: page.bans.length,
      more: page.next !== null,
    });
  }
  const ids = {
    fivem: String(size - 12),
    license: "nope",
    discord: `3000000000${String(size - (size % 3)).padStart(8, "0")}`,
    ip: "10.0.1.4",
  };
  rows.push({
    case: "history (4 identifiers)",
    page: fmt(await median(() => historyOf(ids))),
    found: (await historyOf(ids)).length,
    more: false,
  });
  console.table(rows);
  for (const [label, sql] of [
    [
      "revoked keyset",
      "SELECT id FROM ai_core_bans WHERE revoked_at IS NOT NULL AND (revoked_at < NOW() OR (revoked_at = NOW() AND id < 500000)) ORDER BY revoked_at DESC, id DESC LIMIT 51",
    ],
    [
      "expired keyset",
      "SELECT id FROM ai_core_bans WHERE revoked_at IS NULL AND expires_at <= NOW() AND (expires_at < NOW() - INTERVAL 1 DAY OR (expires_at = NOW() - INTERVAL 1 DAY AND id < 500000)) ORDER BY expires_at DESC, id DESC LIMIT 51",
    ],
    [
      "name prefix",
      "SELECT id FROM ai_core_bans WHERE name LIKE 'jo%' ESCAPE '!' AND id < 4294967296 AND 1 = 1 ORDER BY id DESC LIMIT 51",
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
