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

/** A statement that rides in the money transaction (a paid bill's row). */
interface Statement {
  query: string;
  values: (number | string | null)[];
}

/** Changes collected this long go out as one transaction (a paycheck for 10k players is one write, not 10k). */
const FLUSH_MS = 50;
/** Rows per statement: keeps each statement and its placeholder list a sane size. */
const CHUNK = 1000;

/** `UPDATE ... JOIN` of the summed delta per account, in chunks. */
function balanceStatements(
  entries: LedgerEntry[],
): { query: string; values: number[] }[] {
  const sums = new Map<number, number>();
  for (const e of entries)
    sums.set(e.accountId, (sums.get(e.accountId) ?? 0) + e.delta);
  const pairs = [...sums].filter(([, delta]) => delta !== 0);
  const out: { query: string; values: number[] }[] = [];
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const part = pairs.slice(i, i + CHUNK);
    const rows = part
      .map((_, n) => (n === 0 ? "SELECT ? AS id, ? AS d" : "SELECT ?, ?"))
      .join(" UNION ALL ");
    out.push({
      query: `UPDATE ai_core_accounts a JOIN (${rows}) v ON a.id = v.id SET a.balance = a.balance + v.d`,
      values: part.flat(),
    });
  }
  return out;
}

/** Multi-row ledger inserts in the order the changes happened, in chunks. */
function ledgerStatements(
  entries: LedgerEntry[],
): { query: string; values: (number | string | null)[] }[] {
  const out: { query: string; values: (number | string | null)[] }[] = [];
  for (let i = 0; i < entries.length; i += CHUNK) {
    const part = entries.slice(i, i + CHUNK);
    out.push({
      query: `INSERT INTO ai_core_transactions (account_id, amount, balance_after, reason, actor) VALUES ${part.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
      values: part.flatMap((e) => [
        e.accountId,
        e.delta,
        e.balanceAfter,
        e.reason.slice(0, 64),
        e.actor?.slice(0, 64) ?? null,
      ]),
    });
  }
  return out;
}

/** Whether one batch committed, made only when someone asks (the live path never does). */
interface Outcome {
  promise: Promise<boolean>;
  resolve: (committed: boolean) => void;
}

function outcome(): Outcome {
  let resolve: (committed: boolean) => void = () => undefined;
  const promise = new Promise<boolean>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * Every account's DB writes, batched: changes are collected for `FLUSH_MS`, then balances (summed per account) and
 * ledger rows go out in one transaction. Flushes run one after another, so writes land in the order they happened;
 * a crash can only lose the changes of the last `FLUSH_MS` and the flush in flight. Pushing stays synchronous and
 * answers nothing: a caller that must know whether its change landed (a stored character's write) asks `commit()`.
 */
class MoneyWriter {
  private pending: LedgerEntry[] = [];
  private attached: Statement[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<void> = Promise.resolve();
  /** The collecting batch's result, once someone asked for it. */
  private asked: Outcome | null = null;

  push(entry: LedgerEntry): void {
    this.pending.push(entry);
    this.timer ??= setTimeout(() => this.flush(), FLUSH_MS);
  }

  /**
   * Adds a statement to the batch now collecting: it commits or rolls back together with the money changes made in
   * the same tick (a paid bill's delete with its transfer), so the two never drift apart in the DB.
   */
  attach(query: string, values: Statement["values"]): void {
    this.attached.push({ query, values });
    this.timer ??= setTimeout(() => this.flush(), FLUSH_MS);
  }

  private collecting(): boolean {
    return this.pending.length > 0 || this.attached.length > 0;
  }

  private flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.collecting()) return;
    const batch = this.pending;
    const attached = this.attached;
    const asked = this.asked;
    this.pending = [];
    this.attached = [];
    this.asked = null;
    this.chain = this.chain.then(async () => {
      let committed = false;
      try {
        // mysql.transaction answers false (no throw) when the transaction rolled back.
        committed = await mysql.transaction([
          ...balanceStatements(batch),
          ...ledgerStatements(batch),
          ...attached,
        ]);
        if (!committed) throw new Error("transaction rolled back");
      } catch (error) {
        log.error(`money write of ${batch.length} changes failed`, error);
      }
      asked?.resolve(committed);
    });
  }

  private result(): Promise<boolean> {
    this.asked ??= outcome();
    return this.asked.promise;
  }

  /** Resolves when every change made so far is in the DB (flushes what is still collecting). */
  idle(): Promise<void> {
    this.flush();
    return this.chain;
  }

  /**
   * Sends the batch now collecting at once and resolves whether it committed (true when nothing was collecting, once
   * earlier batches are done). Call it right after the change, in the same tick, so the change is in that batch.
   */
  commit(): Promise<boolean> {
    if (!this.collecting()) return this.chain.then(() => true);
    const result = this.result();
    this.flush();
    return result;
  }

  /** Resolves when every change made so far is in the DB, without sending the collecting batch early. */
  settled(): Promise<void> {
    if (!this.collecting()) return this.chain;
    return this.result().then(() => undefined);
  }
}

export const moneyWriter = new MoneyWriter();
