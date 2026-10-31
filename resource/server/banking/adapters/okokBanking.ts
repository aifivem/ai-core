import { callExport } from "@aicore-fivem/lib/server";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { balanceOf, firstOf } from "../answer";

const RESOURCE = "okokBanking";

/** A society's balance (`GetAccount(society)`, the job / gang name as is); null when it answers no number. */
const balance = (name: string): number | null =>
  balanceOf(callExport(RESOURCE, "GetAccount", name));

/**
 * okokBankingV2 (written from its docs, https://docs.okokscripts.io/scripts/okokbankingv2/exports; escrowed, no
 * source): `GetAccount(society)`, `AddMoney(society, value)`, `RemoveMoney(society, value)`. The docs give no return
 * values, so a society counts as existing while `GetAccount` answers a number, a removal is checked against that
 * balance first, and a money call counts as done unless it answers false. No set export and no change hook: `core`
 * mode only reports ai-core's balance.
 */
export const okokBanking: BankingAdapter = {
  resource: RESOURCE,
  societyBalance: (job) => balance(job),
  accounts: {
    has: (_type, name) => balance(name) !== null,
    balance: (_type, name) => balance(name),
    add: (_type, name, amount) =>
      firstOf(callExport(RESOURCE, "AddMoney", name, amount)) !== false,
    remove: (_type, name, amount) =>
      (balance(name) ?? 0) >= amount &&
      firstOf(callExport(RESOURCE, "RemoveMoney", name, amount)) !== false,
  },
};
