import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { balanceOf } from "../answer";

const RESOURCE = "tgiann-bank";

/** The tgiann-bank IBAN of a job's account (`config.jobAccounts`), or null. */
function ibanOf(job: string): string | null {
  const raw = callExport(RESOURCE, "GetJobIbanFromName", job);
  return typeof raw === "string" && raw ? raw : null;
}

/**
 * tgiann-bank (written from its 2.9.1 source, `server/exports.lua` and `server/hooks.lua`): job accounts keep their own
 * balance (`GetJobAccountBalance`, `RemoveJobMoney`); deposits are seen through its `balanceChanged` hook (registered
 * with `RegisterHook`, limited with `ibanFilter` to the job accounts of ai-core's jobs, payload `{ iban, balance,
 * delta }`). It has no export that opens its screen.
 */
export const tgiannBank: BankingAdapter = {
  resource: RESOURCE,
  version: "2.9.1",
  societyBalance: (job) =>
    ibanOf(job) === null
      ? null
      : balanceOf(callExport(RESOURCE, "GetJobAccountBalance", job)),
  watchDeposits: (names, deposited) => {
    const jobs = new Map<string, string>();
    for (const job of names) {
      const iban = ibanOf(job);
      if (iban) jobs.set(iban, job);
    }
    // Our earlier hook (a job added in the panel, or a new pick) goes first.
    callExport(RESOURCE, "RemoveHooks");
    if (!jobs.size) return;
    callExport(
      RESOURCE,
      "RegisterHook",
      "balanceChanged",
      (payload: unknown) => {
        if (!isRecord(payload) || typeof payload.delta !== "number") return;
        const job =
          typeof payload.iban === "string" ? jobs.get(payload.iban) : undefined;
        if (job && payload.delta > 0) deposited(job, Math.floor(payload.delta));
      },
      {
        ibanFilter: Object.fromEntries([...jobs.keys()].map((i) => [i, true])),
      },
    );
  },
  take: (job, amount) =>
    balanceOf(callExport(RESOURCE, "RemoveJobMoney", job, amount)) !== null,
};
