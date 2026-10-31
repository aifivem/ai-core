import { moneyWriter } from "./writer";

export type OwnerType = "character" | "job" | "gang";

/** What a change answers: the new balance, or why it was refused. */
export type ChangeResult =
  | { ok: true; balance: number }
  | { ok: false; error: "INVALID_AMOUNT" | "INSUFFICIENT_FUNDS" };

/**
 * A banking script linked to job and gang accounts (ai-core's banking layer, `docs/compat/banking.md`). `balance` and
 * `change` answer null while ai-core keeps the account itself, else the script's balance / whether it took the change
 * (`own` mode); `changed` follows every change ai-core applies to one it keeps (`core` mode).
 */
export interface SharedAccountLink {
  balance(account: Account): number | null;
  change(account: Account, delta: number): boolean | null;
  changed(account: Account): void;
}

let link: SharedAccountLink | null = null;

/** Set by the banking layer at start; character accounts never use it. */
export function linkSharedAccounts(next: SharedAccountLink): void {
  link = next;
}

/**
 * One money account. ai-core is the only writer of balances, so memory is the truth: a change is checked and
 * applied here synchronously, and its DB write (atomic balance delta + ledger row) goes to the money writer, which
 * batches every account's changes into one transaction per 50 ms, in order. A job or gang account a banking script
 * keeps (`own` mode) reads and changes the script's balance instead and leaves its own row untouched.
 */
export class Account {
  constructor(
    readonly id: number,
    readonly ownerType: OwnerType,
    readonly ownerId: string,
    readonly name: string,
    private amount: number,
    private readonly allowNegative: boolean,
  ) {}

  get balance(): number {
    if (link === null || this.ownerType === "character") return this.amount;
    return link.balance(this) ?? this.amount;
  }

  /** Adds `delta` (negative removes). Amounts are whole numbers; a balance never goes below 0 unless allowed. */
  change(
    delta: number,
    reason: string,
    actor: string | null = null,
  ): ChangeResult {
    if (!Number.isSafeInteger(delta))
      return { ok: false, error: "INVALID_AMOUNT" };
    if (delta === 0) return { ok: true, balance: this.balance };
    const shared = this.ownerType === "character" ? null : link;
    const kept = shared?.change(this, delta) ?? null;
    if (kept !== null)
      return kept
        ? { ok: true, balance: this.balance }
        : { ok: false, error: "INSUFFICIENT_FUNDS" };
    const next = this.amount + delta;
    if (next < 0 && !this.allowNegative)
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    this.amount = next;
    moneyWriter.push({
      accountId: this.id,
      delta,
      balanceAfter: next,
      reason,
      actor,
    });
    shared?.changed(this);
    return { ok: true, balance: next };
  }

  /** Sets the balance to `amount` (written as the difference, with a ledger row). */
  set(
    amount: number,
    reason: string,
    actor: string | null = null,
  ): ChangeResult {
    if (!Number.isSafeInteger(amount))
      return { ok: false, error: "INVALID_AMOUNT" };
    return this.change(amount - this.balance, reason, actor);
  }

  /** Resolves when every queued money write (this account's included) is in the DB. */
  idle(): Promise<void> {
    return moneyWriter.idle();
  }
}
