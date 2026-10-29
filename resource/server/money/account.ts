import { WriteQueue } from "@aicore-fivem/lib/server";
import { mysql } from "@aicore-fivem/mysql";
import { log } from "../log";

export type OwnerType = "character" | "job" | "gang";

/** What a change answers: the new balance, or why it was refused. */
export type ChangeResult = { ok: true; balance: number } | { ok: false; error: "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" };

const LEDGER_SQL =
  "INSERT INTO ai_core_transactions (account_id, amount, balance_after, reason, actor) VALUES (?, ?, ?, ?, ?)";
const BALANCE_SQL = "UPDATE ai_core_accounts SET balance = balance + ? WHERE id = ?";

/**
 * One money account. ai-core is the only writer of balances, so memory is the truth: a change is checked and
 * applied here synchronously, and its DB write (atomic balance delta + ledger row, one transaction) is queued at
 * once on this account's own queue, so writes land in order and a crash can only lose writes still in flight.
 */
export class Account {
  private readonly queue = new WriteQueue((label, error) => log.error(`account write failed (${label})`, error));

  constructor(
    readonly id: number,
    readonly ownerType: OwnerType,
    readonly ownerId: string,
    readonly name: string,
    private amount: number,
    private readonly allowNegative: boolean,
  ) {}

  get balance(): number {
    return this.amount;
  }

  /** Adds `delta` (negative removes). Amounts are whole numbers; a balance never goes below 0 unless allowed. */
  change(delta: number, reason: string, actor: string | null = null): ChangeResult {
    if (!Number.isSafeInteger(delta)) return { ok: false, error: "INVALID_AMOUNT" };
    if (delta === 0) return { ok: true, balance: this.amount };
    const next = this.amount + delta;
    if (next < 0 && !this.allowNegative) return { ok: false, error: "INSUFFICIENT_FUNDS" };
    this.amount = next;
    const label = `${this.ownerType}:${this.ownerId}:${this.name} ${delta} ${reason}`;
    this.queue.push(label, async () => {
      // mysql.transaction answers false (no throw) when the transaction rolled back.
      const committed = await mysql.transaction([
        { query: BALANCE_SQL, values: [delta, this.id] },
        { query: LEDGER_SQL, values: [this.id, delta, next, reason.slice(0, 64), actor?.slice(0, 64) ?? null] },
      ]);
      if (!committed) throw new Error("transaction rolled back");
    });
    return { ok: true, balance: next };
  }

  /** Sets the balance to `amount` (written as the difference, with a ledger row). */
  set(amount: number, reason: string, actor: string | null = null): ChangeResult {
    if (!Number.isSafeInteger(amount)) return { ok: false, error: "INVALID_AMOUNT" };
    return this.change(amount - this.amount, reason, actor);
  }

  /** Resolves when every queued write of this account is in the DB. */
  idle(): Promise<void> {
    return this.queue.idle();
  }
}
