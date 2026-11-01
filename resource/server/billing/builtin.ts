import { notify, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, oneArg, readText } from "@aicore-fivem/lib/shared";
import { CORE, type BillingAdapter, type BillSend } from "@aicore-fivem/shared";
import { Locale } from "common";
import { transferMoney } from "../money/transfer";
import { moneyWriter } from "../money/writer";
import { players } from "../player/registry";
import {
  bills,
  inOrder,
  load,
  MAX_BILLS,
  newBill,
  store,
  view,
} from "./ownBills";

/** ai-core's own billing adapter (resource "ai-core"): sending, the player's pay callback and the bills' life with the character (`ownBills.ts`). */

/** Accounts a bill is paid from, in order. */
const PAY_FROM = ["bank", "cash"];

/**
 * A bill to an offline character by citizen id (the billing layer sends one here only while ai-core's own bills are
 * active). Answers true when it is valid; the insert may still refuse it (unknown character, full list) and logs that.
 */
export function billOffline(
  citizenid: string,
  b: Omit<BillSend, "to" | "toCitizenid">,
): boolean {
  const bill = newBill(b);
  if (!bill) return false;
  store(citizenid, bill);
  return true;
}

function payBill(source: number, id: string): string | null {
  const payer = players.get(source);
  const list = payer && bills.get(payer.charId);
  const bill = list?.find((b) => b.id === id);
  if (!payer || !list || !bill) return "BILL_ERR_GONE";
  let to: unknown;
  let payee: number | undefined;
  if (bill.job) to = { owner: "job", id: bill.job, account: "bank" };
  else {
    payee =
      bill.fromCharId === undefined
        ? undefined
        : players.byCharacter(bill.fromCharId)?.source;
    if (payee === undefined) return "BILL_ERR_SENDER_AWAY";
    to = { source: payee, account: "bank" };
  }
  const reason = `bill:${bill.job ?? "player"}`;
  const paid = PAY_FROM.some((account) =>
    transferMoney({ source, account }, to, bill.amount, reason),
  );
  if (!paid) return "BILL_ERR_MONEY";
  // Same tick as the transfer: the delete joins its batch (one transaction with the balances and ledger rows).
  moneyWriter.attach("DELETE FROM ai_core_bills WHERE id = ?", [
    Number(bill.id),
  ]);
  list.splice(list.indexOf(bill), 1);
  notify(source, Locale("BILL_PAID", bill.amount, bill.label), "success");
  if (payee !== undefined)
    notify(
      payee,
      Locale("BILL_PAID_TO_YOU", payer.fullName, bill.amount),
      "success",
    );
  return null;
}

export const builtinBilling: BillingAdapter = {
  resource: "ai-core",
  send: (b) => {
    const target = players.get(b.to);
    if (!target) return false;
    if ((bills.get(target.charId)?.length ?? 0) >= MAX_BILLS) return false;
    const bill = newBill(b);
    if (!bill) return false;
    store(target.citizenid, bill);
    return true;
  },
  unpaid: (source, _citizenid, done) => {
    const charId = players.get(source)?.charId;
    done(view((charId !== undefined && bills.get(charId)) || []));
  },
  pay: (source, id) => payBill(source, id) === null,
};

onClientCallback(
  CORE.payBillCallback,
  { args: oneArg((v) => readText(v, 20)), lock: true },
  (source, id) => {
    const error = payBill(source, id);
    return error ? fail(error) : { ok: true };
  },
);

// A loaded character's open bills are read once (and shown); they leave memory with the character.
on(CORE.playerLoadedEvent, (source: number) => {
  const charId = players.get(source)?.charId;
  if (charId !== undefined) inOrder(charId, () => load(charId));
});
on(CORE.playerUnloadedEvent, (_source: number, charId: number) => {
  bills.delete(charId);
});
