import { moneyWriter } from "./writer"

export type OwnerType = "character" | "job" | "gang"

/** What a change answers: the new balance, or why it was refused. */
export type ChangeResult =
  | { ok: true; balance: number }
  | { ok: false; error: "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" }

/**
 * One money account. ai-core is the only writer of balances, so memory is the truth: a change is checked and
 * applied here synchronously, and its DB write (atomic balance delta + ledger row) goes to the money writer, which
 * batches every account's changes into one transaction per 50 ms, in order.
 */
export class Account {
  constructor(
    readonly id: number,
    readonly ownerType: OwnerType,
    readonly ownerId: string,
    readonly name: string,
    private amount: number,
    private readonly allowNegative: boolean
  ) {}

  get balance(): number {
    return this.amount
  }

  /** Adds `delta` (negative removes). Amounts are whole numbers; a balance never goes below 0 unless allowed. */
  change(
    delta: number,
    reason: string,
    actor: string | null = null
  ): ChangeResult {
    if (!Number.isSafeInteger(delta))
      return { ok: false, error: "INVALID_AMOUNT" }
    if (delta === 0) return { ok: true, balance: this.amount }
    const next = this.amount + delta
    if (next < 0 && !this.allowNegative)
      return { ok: false, error: "INSUFFICIENT_FUNDS" }
    this.amount = next
    moneyWriter.push({
      accountId: this.id,
      delta,
      balanceAfter: next,
      reason,
      actor,
    })
    return { ok: true, balance: next }
  }

  /** Sets the balance to `amount` (written as the difference, with a ledger row). */
  set(
    amount: number,
    reason: string,
    actor: string | null = null
  ): ChangeResult {
    if (!Number.isSafeInteger(amount))
      return { ok: false, error: "INVALID_AMOUNT" }
    return this.change(amount - this.amount, reason, actor)
  }

  /** Resolves when every queued money write (this account's included) is in the DB. */
  idle(): Promise<void> {
    return moneyWriter.idle()
  }
}
