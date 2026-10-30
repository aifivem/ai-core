// `bun bench/stress.ts [pool]` in ai-core, after `bun bench/seed.ts`: ai-core's DB paths at 1M players with 10k
// online, through the real engine (`@aicore-fivem/mysql`) and pool. Login: account upsert, character screen, load.
// Then the periodic save of 10k characters and one paycheck for 10k players.
import { fmt, time } from "./stubs";

const POOL = Number(process.argv[2] ?? 5);
const ONLINE = 10_000;
const USERS = 1_000_000;

const g = globalThis as Record<string, unknown>;
const convarInt = g.GetConvarInt as (name: string, fallback: number) => number;
g.GetConvarInt = (name: string, fallback: number) => (name === "ai_mysql_pool_size" ? POOL : convarInt(name, fallback));
const { mysql } = await import("@aicore-fivem/mysql");
await mysql.awaitConnection();
const { upsertUser } = await import("../resource/server/player/users");
const { listCharacters, getCharacter, saveCharacters } = await import("../resource/server/characters/repo");
const { loadJobs, loadGangs } = await import("../resource/server/jobs/repo");
const { Account } = await import("../resource/server/money/account");

const ACCOUNT_NAMES = ["cash", "bank", "black_money", "crypto"];
const STARTS: Record<string, number> = { cash: 500, bank: 5000, black_money: 0, crypto: 0 };

// Same SQL as player/screen.ts extras() and money/book.ts loadAccounts() (book.ts reads panel content, not importable here).
const EXTRAS_SQL = `SELECT c.id AS char_id,
  (SELECT j.job FROM ai_core_character_jobs j WHERE j.char_id = c.id ORDER BY j.grade DESC LIMIT 1) AS job,
  (SELECT a.balance FROM ai_core_accounts a WHERE a.owner_type = 'character' AND a.owner_id = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci AND a.name = 'cash') AS cash,
  (SELECT a.balance FROM ai_core_accounts a WHERE a.owner_type = 'character' AND a.owner_id = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci AND a.name = 'bank') AS bank
  FROM ai_core_characters c WHERE c.id IN (?)`;

async function loadAccounts(ownerId: string): Promise<{ id: number; name: string; balance: number | string }[]> {
  const select = async () =>
    (await mysql.query<{ id: number; name: string; balance: number | string }[]>(
      "SELECT id, name, balance FROM ai_core_accounts WHERE owner_type = ? AND owner_id = ?",
      ["character", ownerId],
    )) ?? [];
  const rows = await select();
  const missing = ACCOUNT_NAMES.filter((name) => !rows.some((r) => r.name === name));
  if (missing.length === 0) return rows;
  const values = missing.map((name) => ["character", ownerId, name, STARTS[name] ?? 0]);
  await mysql.query(`INSERT IGNORE INTO ai_core_accounts (owner_type, owner_id, name, balance) VALUES ${values.map(() => "(?, ?, ?, ?)").join(", ")}`, values.flat());
  return select();
}

/** One player's way in: account, character screen, picking the first character. */
async function login(fivem: number): Promise<{ charId: number; accounts: { id: number; name: string; balance: number | string }[] } | null> {
  const user = await upsertUser({ fivem: String(fivem), license: `license${fivem}`, discord: null, name: `Player ${fivem}` });
  const rows = await listCharacters(user.id);
  if (rows.length > 0) await mysql.query(EXTRAS_SQL, [rows.map((r) => r.id)]);
  const first = rows[0];
  if (!first) return null;
  const row = await getCharacter(user.id, first.id);
  if (!row) return null;
  const [accounts] = await Promise.all([loadAccounts(String(row.id)), loadJobs(row.id), loadGangs(row.id)]);
  return { charId: row.id, accounts };
}

const ids = Array.from({ length: ONLINE }, (_, i) => 1 + Math.floor((i * 104_729) % USERS));
console.log(`pool ${POOL}, ${ONLINE} players joining at once (1M users in the DB)`);

const latencies: number[] = [];
const [loaded, loginMs] = await time(() =>
  Promise.all(
    ids.map(async (id) => {
      const start = performance.now();
      const result = await login(id);
      latencies.push(performance.now() - start);
      return result;
    }),
  ),
);
latencies.sort((a, b) => a - b);
const pct = (p: number): string => fmt(latencies[Math.floor(latencies.length * p)] ?? 0);
console.log(`login burst       ${fmt(loginMs)} total, ${(ONLINE / (loginMs / 1000)).toFixed(0)}/s, p50 ${pct(0.5)}, p99 ${pct(0.99)}`);

const online = loaded.filter((p): p is NonNullable<typeof p> => p !== null);
const saves = online.map((p) => ({ id: p.charId, position: { x: 1, y: 2, z: 3, heading: 4 }, metadata: { hunger: 50, thirst: 50, stress: 0 } }));
const [, saveMs] = await time(() => saveCharacters(saves));
console.log(`save flush        ${fmt(saveMs)} for ${saves.length} characters`);

const wallets = online.map((p) => {
  const bank = p.accounts.find((a) => a.name === "bank");
  return bank ? new Account(bank.id, "character", String(p.charId), "bank", Number(bank.balance), false) : null;
});
const [, payMs] = await time(async () => {
  for (const account of wallets) account?.change(250, "PAYCHECK", "police");
  await Promise.all(wallets.map((a) => a?.idle()));
});
console.log(`paycheck          ${fmt(payMs)} for ${wallets.length} accounts (money writer batches)`);

await mysql.close();
process.exit(0);
