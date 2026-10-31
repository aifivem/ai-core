import { callExport } from "@aicore-fivem/lib/server";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { balanceOf } from "../answer";

/** A banking script read only for a job's society balance: `exportName(job, ...extra)`. */
function balanceReader(
  resource: string,
  exportName: string,
  extra: readonly unknown[] = [],
  version?: string,
): BankingAdapter {
  return {
    resource,
    version,
    societyBalance: (job) =>
      balanceOf(callExport(resource, exportName, job, ...extra)),
  };
}

/** qb-banking 2.0.0 (written from its source): `GetAccountBalance(job)` (0 without an account); its screen opens only at an ATM. */
export const qbBanking = balanceReader(
  "qb-banking",
  "GetAccountBalance",
  [],
  "2.0.0",
);
/** okokBankingV2 (written from its docs, docs.okokscripts.io/scripts/okokbankingv2/exports): `GetAccount(society)`. */
export const okokBanking = balanceReader("okokBanking", "GetAccount");
/** fd_banking (written from community_bridge's banking module): `GetAccount(job)`. */
export const fdBanking = balanceReader("fd_banking", "GetAccount");
/** wasabi_banking (written from community_bridge's banking module): `GetAccountBalance(job, "society")`. */
export const wasabiBanking = balanceReader(
  "wasabi_banking",
  "GetAccountBalance",
  ["society"],
);
/** kartik-banking (written from community_bridge's banking module): `GetAccountMoney(job)`. */
export const kartikBanking = balanceReader("kartik-banking", "GetAccountMoney");
/** tgg-banking (written from community_bridge's banking module): `GetSocietyAccountMoney(job)`. */
export const tggBanking = balanceReader(
  "tgg-banking",
  "GetSocietyAccountMoney",
);
