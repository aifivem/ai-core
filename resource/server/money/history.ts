import { mysql } from "@aicore-fivem/mysql";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { LedgerPage } from "@aicore-fivem/shared";
import { players } from "../player/registry";

const EMPTY: LedgerPage = { rows: [], next: null };
const OWNERS = new Set(["character", "job", "gang"]);

/** The account row's owner and name: a loaded player's `{ source, account }` or `{ owner, id, account }`. */
function readRef(
  ref: unknown,
): { ownerType: string; ownerId: string; account: string } | null {
  if (!isRecord(ref) || typeof ref.account !== "string" || !ref.account)
    return null;
  if (typeof ref.source === "number") {
    const player = players.get(ref.source);
    return player
      ? {
          ownerType: "character",
          ownerId: String(player.charId),
          account: ref.account,
        }
      : null;
  }
  return typeof ref.owner === "string" &&
    OWNERS.has(ref.owner) &&
    typeof ref.id === "string" &&
    ref.id
    ? { ownerType: ref.owner, ownerId: ref.id, account: ref.account }
    : null;
}

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max
    ? v
    : null;

/**
 * Ledger rows of an account for other scripts (export `GetAccountHistory`), read only: keyset on the
 * `account_time` index, newest first. ai-core alone writes balances and rows (the money writer, every 50 ms).
 */
export async function accountHistory(
  ref: unknown,
  query: unknown,
): Promise<LedgerPage> {
  const account = readRef(ref);
  if (!account) return EMPTY;
  const q = isRecord(query) ? query : {};
  const limit = int(q.limit, 1, 200) ?? 50;
  const before = int(q.before, 1, Number.MAX_SAFE_INTEGER);
  const since = int(q.since, 0, Number.MAX_SAFE_INTEGER);
  const accountId = await mysql.scalar<number | null>(
    "SELECT id FROM ai_core_accounts WHERE owner_type = ? AND owner_id = ? AND name = ?",
    [account.ownerType, account.ownerId, account.account],
  );
  if (!accountId) return EMPTY;
  const where = ["account_id = ?"];
  const params: number[] = [accountId];
  if (before !== null) {
    where.push("id < ?");
    params.push(before);
  }
  if (since !== null) {
    where.push("created_at >= FROM_UNIXTIME(?)");
    params.push(since);
  }
  const rows = await mysql.query<
    {
      id: number | string;
      amount: number | string;
      balance_after: number | string;
      reason: string;
      actor: string | null;
      at: number | string;
    }[]
  >(
    `SELECT id, amount, balance_after, reason, actor, UNIX_TIMESTAMP(created_at) AS at FROM ai_core_transactions WHERE ${where.join(" AND ")} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [...params, limit + 1],
  );
  const page = (rows ?? []).slice(0, limit).map((r) => ({
    id: Number(r.id),
    amount: Number(r.amount),
    balance: Number(r.balance_after),
    reason: r.reason,
    actor: r.actor,
    at: Number(r.at),
  }));
  return {
    rows: page,
    next: (rows ?? []).length > limit ? (page.at(-1)?.id ?? null) : null,
  };
}
