import { isRecord } from "@aicore-fivem/lib/shared";
import { players } from "../player/registry";
import { sharedAccounts } from "./book";

/** One side of a transfer: changes the account the way its owner's own exports do (deltas, events). */
interface Side {
  key: string;
  change(delta: number, reason: string): boolean;
}

/** A `MoneyRef` (`@aicore-fivem/shared`): a loaded character's account or a job's / gang's, when it exists. */
function sideOf(ref: unknown): Side | null {
  if (!isRecord(ref) || typeof ref.account !== "string") return null;
  const account = ref.account;
  if (typeof ref.source === "number") {
    const wallet = players.get(ref.source)?.wallet;
    if (!wallet?.has(account)) return null;
    return {
      key: `character:${ref.source}:${account}`,
      change: (delta, reason) => wallet.change(account, delta, reason).ok,
    };
  }
  if (
    (ref.owner === "job" || ref.owner === "gang") &&
    typeof ref.id === "string"
  ) {
    const shared = sharedAccounts.get(ref.owner, ref.id, account);
    if (!shared) return null;
    return {
      key: `${ref.owner}:${ref.id}:${account}`,
      change: (delta, reason) => shared.change(delta, reason).ok,
    };
  }
  return null;
}

const whole = (v: unknown, min: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min;

/**
 * Moves `amount` from one account to another; `from` also pays `fee` (gone from the economy). Both changes apply
 * synchronously in memory, so they reach the money writer in the same batch: one DB transaction with both balance
 * deltas and both ledger rows. False when an account is missing, the two are the same or `from` cannot pay.
 */
export function transferMoney(
  from: unknown,
  to: unknown,
  amount: unknown,
  reason: string,
  fee: unknown = 0,
): boolean {
  if (!whole(amount, 1) || !whole(fee, 0)) return false;
  const a = sideOf(from);
  const b = sideOf(to);
  if (!a || !b || a.key === b.key) return false;
  if (!a.change(-(amount + fee), reason)) return false;
  if (b.change(amount, reason)) return true;
  a.change(amount + fee, `${reason}:refund`);
  return false;
}
