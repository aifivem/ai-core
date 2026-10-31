import { callExport } from "@aicore-fivem/lib/server";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { balanceOf } from "../answer";

/**
 * Renewed-Banking (written from its 2.1.4 source): `getAccountMoney(job)` (false without an account) and its client
 * event `Renewed-Banking:client:openBankUI ({ atm })`, which plays its own progress bar before the screen opens.
 */
export const renewedBanking: BankingAdapter = {
  resource: "Renewed-Banking",
  version: "2.1.4",
  societyBalance: (job) =>
    balanceOf(callExport("Renewed-Banking", "getAccountMoney", job)),
  open: (source) => {
    emitNet("Renewed-Banking:client:openBankUI", source, { atm: false });
    return true;
  },
};
