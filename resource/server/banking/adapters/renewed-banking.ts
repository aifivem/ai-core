import { callExport } from "@aicore-fivem/lib/server";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { balanceOf, firstOf } from "../answer";

const RESOURCE = "Renewed-Banking";

/** A job's / gang's account balance (accounts are named by the job / gang); null (its `false`) without one. */
const balance = (name: string): number | null =>
  balanceOf(callExport(RESOURCE, "getAccountMoney", name));

/**
 * Renewed-Banking (written from its 2.1.4 source and README, https://github.com/Renewed-Scripts/Renewed-Banking):
 * `getAccountMoney(account)` (false without an account), `addAccountMoney` / `removeAccountMoney(account, amount)`
 * (true, or false without an account / not enough money) and its client event
 * `Renewed-Banking:client:openBankUI ({ atm })`, which plays its own progress bar before the screen opens. It has no
 * set export and no change hook, so `core` mode only reports ai-core's balance.
 */
export const renewedBanking: BankingAdapter = {
  resource: RESOURCE,
  version: "2.1.4",
  societyBalance: (job) => balance(job),
  open: (source) => {
    emitNet("Renewed-Banking:client:openBankUI", source, { atm: false });
    return true;
  },
  accounts: {
    has: (_type, name) => balance(name) !== null,
    balance: (_type, name) => balance(name),
    add: (_type, name, amount) =>
      firstOf(callExport(RESOURCE, "addAccountMoney", name, amount)) === true,
    remove: (_type, name, amount) =>
      firstOf(callExport(RESOURCE, "removeAccountMoney", name, amount)) ===
      true,
  },
};
