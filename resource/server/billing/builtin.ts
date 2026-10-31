import { notify, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, oneArg, readText } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type BillingAdapter,
  type UnpaidBill,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import { transferMoney } from "../money/transfer";
import { players } from "../player/registry";

/** Open bills a character may hold; a full list refuses new ones. */
const MAX_BILLS = 20;
/** Accounts a bill is paid from, in order. */
const PAY_FROM = ["bank", "cash"];

interface Bill extends UnpaidBill {
  job?: string;
  /** The issuer of a personal bill (gets the money). */
  fromCharId?: number;
}

/**
 * ai-core's own bills, used while no billing script runs: kept in memory by character id until paid (a restart drops
 * them). The player sees the open list when one arrives and after each character load, and pays one from it; the
 * money moves only then, in one lib `money.transfer` from the payer's bank (else cash) to the job's account or the
 * issuer's bank (an issuer who is offline cannot be paid until back).
 */
const bills = new Map<number, Bill[]>();
let nextId = 1;

const view = (list: readonly Bill[]): UnpaidBill[] =>
  list.map(({ id, label, amount, sender }) => ({ id, label, amount, sender }));

/** Shows the player their open bills (the list screen opens on their client). */
function showBills(source: number): void {
  const charId = players.get(source)?.charId;
  const list = charId === undefined ? undefined : bills.get(charId);
  if (list?.length) emitNet(CORE.billsEvent, source, view(list));
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
  list.splice(list.indexOf(bill), 1);
  if (!list.length) bills.delete(payer.charId);
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
    const fromCharId =
      b.from === undefined ? undefined : players.get(b.from)?.charId;
    if (!b.job && fromCharId === undefined) return false;
    const list = bills.get(target.charId) ?? [];
    if (list.length >= MAX_BILLS) return false;
    list.push({
      id: String(nextId++),
      label: b.label,
      amount: b.amount,
      sender: b.jobLabel ?? b.fromName ?? "",
      job: b.job,
      fromCharId: b.job ? undefined : fromCharId,
    });
    bills.set(target.charId, list);
    showBills(b.to);
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
  { args: oneArg((v) => readText(v, 16)), lock: true },
  (source, id) => {
    const error = payBill(source, id);
    return error ? fail(error) : { ok: true };
  },
);

// Open bills come back on screen after each character load.
on(CORE.playerLoadedEvent, (source: number) => showBills(source));
