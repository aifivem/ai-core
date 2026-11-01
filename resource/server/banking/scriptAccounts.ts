import type {
  BankingAccounts,
  BankingAdapter,
  SocietyType,
} from "@aicore-fivem/shared";
import { settings } from "../content";
import { log } from "../log";
import type { Account } from "../money/account";

/** The ai-core account a banking script's job / gang account stands for. */
export const BANK = "bank";

export const keyOf = (type: SocietyType, name: string): string =>
  `${type}:${name}`;

/**
 * The active banking script's job / gang accounts: guarded calls into its exports, which accounts it has, and the
 * `own` mode (`link.ts`): ai-core's job and gang `bank` accounts read and change the script's balance.
 */
export class ScriptAccounts {
  protected adapter: BankingAdapter | null = null;
  /** Accounts the script answered it has (positive answers only, reset on every activation). */
  protected readonly owned = new Set<string>();

  /** `own` mode: the script's accounts that stand for this ai-core account, or null when ai-core keeps it. */
  protected kept(account: Account): BankingAccounts | null {
    const type = account.ownerType;
    if (
      settings.bankAccounts !== "own" ||
      type === "character" ||
      account.name !== BANK
    )
      return null;
    const accounts = this.adapter?.accounts;
    return accounts && this.has(accounts, type, account.ownerId)
      ? accounts
      : null;
  }

  protected keptBalance(account: Account): number | null {
    const accounts = this.kept(account);
    if (!accounts || account.ownerType === "character") return null;
    const type = account.ownerType;
    return (
      this.call(
        "balance",
        () => accounts.balance(type, account.ownerId),
        null,
      ) ?? 0
    );
  }

  protected keptChange(account: Account, delta: number): boolean | null {
    const accounts = this.kept(account);
    if (!accounts || account.ownerType === "character") return null;
    const type = account.ownerType;
    return delta > 0
      ? this.call(
          "add",
          () => accounts.add(type, account.ownerId, delta),
          false,
        )
      : this.call(
          "remove",
          () => accounts.remove(type, account.ownerId, -delta),
          false,
        );
  }

  protected has(
    accounts: BankingAccounts,
    type: SocietyType,
    name: string,
  ): boolean {
    const key = keyOf(type, name);
    if (this.owned.has(key)) return true;
    if (!this.call("has", () => accounts.has(type, name), false)) return false;
    this.owned.add(key);
    return true;
  }

  protected call<T>(what: string, fn: () => T, fallback: T): T {
    return this.adapter
      ? this.guard(this.adapter, what, fn, fallback)
      : fallback;
  }

  /** One try / catch around the script's exports: logged, answered with `fallback`. */
  protected guard<T>(
    adapter: BankingAdapter,
    what: string,
    fn: () => T,
    fallback: T,
  ): T {
    try {
      return fn();
    } catch (error) {
      log.error(`${adapter.resource} ${what} failed`, error);
      return fallback;
    }
  }
}
