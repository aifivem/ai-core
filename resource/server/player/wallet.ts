import { patchPlayerData } from "@aicore-fivem/lib/server"
import { CORE } from "@aicore-fivem/shared"
import type { Account, ChangeResult } from "../money/account"

/** A loaded character's accounts; every change pushes only that account to its owner and tells other resources. */
export class Wallet {
  constructor(
    private readonly source: number,
    private readonly accounts: Map<string, Account>
  ) {}

  get(name: string): number | null {
    return this.accounts.get(name)?.balance ?? null
  }

  has(name: string): boolean {
    return this.accounts.has(name)
  }

  /** Every account as `{ name: balance }` (the snapshot). */
  snapshot(): Record<string, number> {
    return Object.fromEntries(
      [...this.accounts].map(([name, account]) => [name, account.balance])
    )
  }

  change(
    name: string,
    delta: number,
    reason: string,
    actor: string | null = null
  ): ChangeResult | { ok: false; error: "NO_ACCOUNT" } {
    const account = this.accounts.get(name)
    if (!account) return { ok: false, error: "NO_ACCOUNT" }
    return this.after(name, delta, account.change(delta, reason, actor), reason)
  }

  set(
    name: string,
    amount: number,
    reason: string,
    actor: string | null = null
  ): ChangeResult | { ok: false; error: "NO_ACCOUNT" } {
    const account = this.accounts.get(name)
    if (!account) return { ok: false, error: "NO_ACCOUNT" }
    const delta = amount - account.balance
    return this.after(name, delta, account.set(amount, reason, actor), reason)
  }

  private after(
    name: string,
    delta: number,
    result: ChangeResult,
    reason: string
  ): ChangeResult {
    if (result.ok && delta !== 0) {
      patchPlayerData(this.source, "money", { [name]: result.balance })
      emit(
        CORE.moneyChangedEvent,
        this.source,
        name,
        result.balance,
        delta,
        reason
      )
    }
    return result
  }

  /** Resolves when every queued money write of this character is in the DB. */
  async idle(): Promise<void> {
    await Promise.all(
      [...this.accounts.values()].map((account) => account.idle())
    )
  }
}
