import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { BankingAdapter, SocietyType } from "@aicore-fivem/shared";
import { balanceOf } from "../answer";

const RESOURCE = "tgiann-bank";

/** Export names per owner kind (tgiann-bank's documented job and gang exports). */
const EXPORTS = {
  job: {
    iban: "GetJobIbanFromName",
    balance: "GetJobAccountBalance",
    add: "AddJobMoney",
    remove: "RemoveJobMoney",
    set: "SetJobMoney",
  },
  gang: {
    iban: "GetGangIbanFromName",
    balance: "GetGangAccountBalance",
    add: "AddGangMoney",
    remove: "RemoveGangMoney",
    set: "SetGangMoney",
  },
} as const;

/** The IBAN of a job's / gang's account (tgiann-bank's `config.jobAccounts` / `gangAccounts`), or null. */
function ibanOf(type: SocietyType, name: string): string | null {
  const raw = callExport(RESOURCE, EXPORTS[type].iban, name);
  return typeof raw === "string" && raw ? raw : null;
}

/** A money export answering the new balance or false (`Add/Remove/Set...Money`): whether it took the change. */
function moved(
  type: SocietyType,
  what: "add" | "remove" | "set",
  name: string,
  amount: number,
): boolean {
  return (
    balanceOf(callExport(RESOURCE, EXPORTS[type][what], name, amount)) !== null
  );
}

/**
 * tgiann-bank (written from its 2.9.1 source, `server/exports.lua`, `hooks.lua`, and its docs
 * https://tgiann.gitbook.io/tgiann/scripts/tgiann-bank/exports and `/hooks`). Job and gang accounts are the ones in
 * its config (`Get...IbanFromName`); `Get...AccountBalance` answers 0 without one, so the IBAN decides. Changes made
 * in it come from the `balanceChanged` hook (`{ iban, balance, delta }`, fired synchronously inside every money call,
 * `SetJobMoney` included), limited with `ibanFilter` to the listed accounts. It has no export that opens its screen.
 */
export const tgiannBank: BankingAdapter = {
  resource: RESOURCE,
  version: "2.9.1",
  societyBalance: (job) =>
    ibanOf("job", job) === null
      ? null
      : balanceOf(callExport(RESOURCE, "GetJobAccountBalance", job)),
  accounts: {
    has: (type, name) => ibanOf(type, name) !== null,
    balance: (type, name) =>
      ibanOf(type, name) === null
        ? null
        : balanceOf(callExport(RESOURCE, EXPORTS[type].balance, name)),
    add: (type, name, amount) => moved(type, "add", name, amount),
    remove: (type, name, amount) => moved(type, "remove", name, amount),
    set: (type, name, amount) => moved(type, "set", name, amount),
    watch: (owners, changed) => {
      // Our earlier hook (a new pick, a mode change, a job or gang added) goes first.
      callExport(RESOURCE, "RemoveHooks");
      if (!owners) return;
      const byIban = new Map<string, { type: SocietyType; name: string }>();
      for (const type of ["job", "gang"] as const)
        for (const name of owners[type]) {
          const iban = ibanOf(type, name);
          if (iban) byIban.set(iban, { type, name });
        }
      if (!byIban.size) return;
      callExport(
        RESOURCE,
        "RegisterHook",
        "balanceChanged",
        (payload: unknown) => {
          if (!isRecord(payload) || typeof payload.iban !== "string") return;
          const owner = byIban.get(payload.iban);
          const delta = balanceOf(payload.delta);
          const balance = balanceOf(payload.balance);
          if (owner && delta !== null && balance !== null)
            changed(
              owner.type,
              owner.name,
              Math.trunc(delta),
              Math.trunc(balance),
            );
        },
        {
          ibanFilter: Object.fromEntries(
            [...byIban.keys()].map((i) => [i, true]),
          ),
        },
      );
    },
  },
};
