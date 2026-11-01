import { registerExport } from "@aicore-fivem/lib/server";
import { answer } from "../characters/answer";
import { sharedAccounts } from "../money/book";
import { accountHistory } from "../money/history";
import { transferMoney } from "../money/transfer";
import { positive, reasonOf } from "./args";

/** Job and gang accounts (society money); loaded at start, so these stay synchronous. */
registerExport(
  "GetSharedMoney",
  (ownerType: "job" | "gang", ownerId: string, account: string) =>
    sharedAccounts.get(ownerType, ownerId, account)?.balance ?? null,
);
registerExport(
  "AddSharedMoney",
  (
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ) =>
    positive(amount)
      ? (sharedAccounts
          .get(ownerType, ownerId, account)
          ?.change(amount, reasonOf(reason)).ok ?? false)
      : false,
);
registerExport(
  "RemoveSharedMoney",
  (
    ownerType: "job" | "gang",
    ownerId: string,
    account: string,
    amount: number,
    reason?: string,
  ) =>
    positive(amount)
      ? (sharedAccounts
          .get(ownerType, ownerId, account)
          ?.change(-amount, reasonOf(reason)).ok ?? false)
      : false,
);

/** One transfer between any two accounts (a player's, a job's, a gang's) in one DB transaction with both ledger rows. */
registerExport(
  "TransferMoney",
  (
    from: unknown,
    to: unknown,
    amount: unknown,
    reason?: unknown,
    fee?: unknown,
  ) => transferMoney(from, to, amount, reasonOf(reason), fee ?? 0),
);
registerExport(
  "GetAccountHistory",
  (account: unknown, done: unknown, query?: unknown) =>
    answer("account history", accountHistory(account, query), done, {
      rows: [],
      next: null,
    }),
);
