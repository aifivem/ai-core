// `bun bench/seed.ts` in ai-core: (re)creates the `ai_core_stress` database with ai-core's tables and fills it like a
// server that has seen 1,000,000 players: 1M users, 1.5M characters, 6M money accounts, 1.5M job rows, 5M ledger
// rows. Uses MariaDB's sequence engine (`seq_1_to_N`), so it needs MariaDB 10.0+.
import { readFileSync } from "node:fs"
import { join } from "node:path"
// mysql2 comes with the DB engine package (not an ai-core dependency of its own).
import { createConnection } from "../../../../packages/mysql/node_modules/mysql2/promise"
import { connection, fmt, STRESS_DB, time } from "./stubs"

const USERS = 1_000_000
const CHARACTERS = 1_500_000 // users 1..500k have two characters
const LEDGER = 5_000_000
const JOBS = ["unemployed", "police", "ambulance", "mechanic", "taxi"]

const db = await createConnection({
  uri: connection("mysql"),
  multipleStatements: true,
})
await db.query(
  `DROP DATABASE IF EXISTS ${STRESS_DB}; CREATE DATABASE ${STRESS_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE ${STRESS_DB}`
)
await db.query(readFileSync(join(import.meta.dir, "../sql/main.sql"), "utf8"))

const steps: [string, string][] = [
  [
    "users",
    `INSERT INTO ai_core_users (id, fivem, license, discord, name, last_seen)
     SELECT seq, seq, CONCAT('license', seq), NULL, CONCAT('Player ', seq), NOW() - INTERVAL (seq % 365) DAY FROM seq_1_to_${USERS}`,
  ],
  [
    "characters",
    `INSERT INTO ai_core_characters (id, user_id, citizenid, slot, firstname, lastname, birthdate, sex, pos_x, pos_y, pos_z, pos_h, metadata, last_played)
     SELECT seq, IF(seq <= ${USERS}, seq, seq - ${USERS}), seq, IF(seq <= ${USERS}, 1, 2), 'First', 'Last', '1990-01-01',
            IF(seq % 2, 'male', 'female'), CAST(seq % 400 AS SIGNED) - 200, CAST(seq % 300 AS SIGNED) - 800, 30, 0,
            '{"hunger":80,"thirst":70,"stress":5,"armor":0,"health":200}', NOW() - INTERVAL (seq % 365) DAY
     FROM seq_1_to_${CHARACTERS}`,
  ],
  [
    "accounts",
    `INSERT INTO ai_core_accounts (owner_type, owner_id, name, balance)
     SELECT 'character', c.seq, n.name, n.start FROM seq_1_to_${CHARACTERS} c
     CROSS JOIN (SELECT 'cash' name, 500 start UNION ALL SELECT 'bank', 5000 UNION ALL SELECT 'black_money', 0 UNION ALL SELECT 'crypto', 0) n`,
  ],
  [
    "jobs",
    `INSERT INTO ai_core_character_jobs (char_id, job, grade)
     SELECT seq, ELT(1 + seq % ${JOBS.length}, ${JOBS.map((j) => `'${j}'`).join(", ")}), seq % 4 FROM seq_1_to_${CHARACTERS}`,
  ],
  [
    "ledger",
    `INSERT INTO ai_core_transactions (account_id, amount, balance_after, reason, actor, created_at)
     SELECT 1 + (seq * 7919) % ${CHARACTERS * 4}, 100, 5000, 'PAYCHECK', 'police', NOW() - INTERVAL (seq % 525600) MINUTE
     FROM seq_1_to_${LEDGER}`,
  ],
]

for (const [name, sql] of steps) {
  const [, ms] = await time(() => db.query(sql))
  console.log(`${name.padEnd(10)} ${fmt(ms)}`)
}
await db.query(
  "ANALYZE TABLE ai_core_users, ai_core_characters, ai_core_accounts, ai_core_character_jobs, ai_core_transactions"
)
const [sizes] = await db.query(
  `SELECT table_name AS t, table_rows AS r, ROUND((data_length + index_length) / 1048576) AS mb FROM information_schema.tables WHERE table_schema = ?`,
  [STRESS_DB]
)
console.table(sizes)
await db.end()
