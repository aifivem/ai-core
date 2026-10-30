import { mysql } from "@aicore-fivem/mysql";
import { log } from "../log";

/** One money change as the ledger keeps it. */
export interface LedgerEntry {
  accountId: number;
  delta: number;
  balanceAfter: number;
  reason: string;
  actor: string | null;
}

/** Changes collected this long go out as one transaction (a paycheck for 10k players is one write, not 10k). */
const FLUSH_MS = 50;
/** Rows per statement: keeps each statement and its placeholder list a sane size. */
const CHUNK = 1000;

/** `UPDATE ... JOIN` of the summed delta per account, in chunks. */
function balanceStatements(entries: LedgerEntry[]): { query: string; values: number[] }[] {
  const sums = new Map<number, number>();
  for (const e of entries) sums.set(e.accountId, (sums.get(e.accountId) ?? 0) + e.delta);
  const pairs = [...sums].filter(([, delta]) => delta !== 0);
  const out: { query: string; values: number[] }[] = [];
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const part = pairs.slice(i, i + CHUNK);
    const rows = part.map((_, n) => (n === 0 ? "SELECT ? AS id, ? AS d" : "SELECT ?, ?")).join(" UNION ALL ");
    out.push({
      query: `UPDATE ai_core_accounts a JOIN (${rows}) v ON a.id = v.id SET a.balance = a.balance + v.d`,
      values: part.flat(),
    });
  }
  return out;
}

/** Multi-row ledger inserts in the order the changes happened, in chunks. */
function ledgerStatements(entries: LedgerEntry[]): { query: string; values: (number | string | null)[] }[] {
  const out: { query: string; values: (number | string | null)[] }[] = [];
  for (let i = 0; i < entries.length; i += CHUNK) {
    const part = entries.slice(i, i + CHUNK);
    out.push({
      query: `INSERT INTO ai_core_transactions (account_id, amount, balance_after, reason, actor) VALUES ${part.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
      values: part.flatMap((e) => [e.accountId, e.delta, e.balanceAfter, e.reason.slice(0, 64), e.actor?.slice(0, 64) ?? null]),
    });
  }
  return out;
}

/**
 * Every account's DB writes, batched: changes are collected for `FLUSH_MS`, then balances (summed per account) and
 * ledger rows go out in one transaction. Flushes run one after another, so writes land in the order they happened;
 * a crash can only lose the changes of the last `FLUSH_MS` and the flush in flight.
 */
class MoneyWriter {
  private pending: LedgerEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<void> = Promise.resolve();

  push(entry: LedgerEntry): void {
    this.pending.push(entry);
    this.timer ??= setTimeout(() => this.flush(), FLUSH_MS);
  }

  private flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const batch = this.pending;
    if (batch.length === 0) return;
    this.pending = [];
    this.chain = this.chain.then(async () => {
      try {
        // mysql.transaction answers false (no throw) when the transaction rolled back.
        const committed = await mysql.transaction([...balanceStatements(batch), ...ledgerStatements(batch)]);
        if (!committed) throw new Error("transaction rolled back");
      } catch (error) {
        log.error(`money write of ${batch.length} changes failed`, error);
      }
    });
  }

  /** Resolves when every change made so far is in the DB (flushes what is still collecting). */
  idle(): Promise<void> {
    this.flush();
    return this.chain;
  }
}

export const moneyWriter = new MoneyWriter();
