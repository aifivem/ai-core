import { mysql } from "@aicore-fivem/mysql";
import { notify, onClientCallback } from "@aicore-fivem/lib/server";
import { fail, oneArg, readText } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type BillingAdapter,
  type BillSend,
  type UnpaidBill,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import { db } from "../db";
import { log } from "../log";
import { transferMoney } from "../money/transfer";
import { moneyWriter } from "../money/writer";
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

/** A bill before it has a row id. */
type NewBill = Omit<Bill, "id">;

/**
 * ai-core's own bills, used while no billing script runs. Every open bill is a row of `ai_core_bills` by character
 * id (an offline character's too); a loaded character's open bills are read in one query at load and kept here. The
 * player sees the open list when one arrives and after each character load, and pays one from it: one lib
 * `money.transfer` from the payer's bank (else cash) to the job's account or the issuer's bank (an issuer who is
 * offline cannot be paid until back). The row's delete rides in the money writer's batch of that transfer, so the
 * money and the bill commit or roll back together.
 */
const bills = new Map<number, Bill[]>();
/** Per character: the load and late additions run in order, so a bill stored while the list loads is not lost. */
const queues = new Map<number, Promise<void>>();

function inOrder(charId: number, task: () => Promise<void> | void): void {
  const run = (queues.get(charId) ?? Promise.resolve())
    .then(task)
    .catch((error: unknown) =>
      log.error(`bills of character #${charId} failed`, error),
    );
  queues.set(charId, run);
  void run.then(() => {
    if (queues.get(charId) === run) queues.delete(charId);
  });
}

const view = (list: readonly Bill[]): UnpaidBill[] =>
  list.map(({ id, label, amount, sender }) => ({ id, label, amount, sender }));

/** Shows the player their open bills (the list screen opens on their client). */
function showBills(charId: number): void {
  const player = players.byCharacter(charId);
  const list = bills.get(charId);
  if (player && list?.length)
    emitNet(CORE.billsEvent, player.source, view(list));
}

/** Reads a loaded character's open bills (one query) and shows them. */
async function load(charId: number): Promise<void> {
  const rows = await db.select(
    "ai_core_bills",
    ["id", "job", "issuer_char_id", "sender", "label", "amount"],
    { char_id: charId },
    { orderBy: { column: "id" } },
  );
  // The player may have left while the rows were loading.
  if (!players.byCharacter(charId)) return;
  bills.set(
    charId,
    rows.map((row) => ({
      id: String(row.id),
      label: row.label,
      amount: row.amount,
      sender: row.sender,
      job: row.job ?? undefined,
      fromCharId: row.issuer_char_id ?? undefined,
    })),
  );
  showBills(charId);
}

/** A stored bill joins a loaded character's list (unless the load already read it). */
function add(charId: number, bill: Bill): void {
  const list = bills.get(charId);
  if (!list || list.some((b) => b.id === bill.id)) return;
  list.push(bill);
  showBills(charId);
}

/**
 * Stores a bill for a character by citizen id, online or offline. The insert itself refuses an unknown or deleted
 * character and one with `MAX_BILLS` open, so the cap holds for offline characters too.
 */
function store(citizenid: string, bill: NewBill): void {
  mysql
    .insert(
      `INSERT INTO ai_core_bills (char_id, job, issuer_char_id, sender, label, amount, created_at)
       SELECT c.id, ?, ?, ?, ?, ?, UTC_TIMESTAMP() FROM ai_core_characters c
       WHERE c.citizenid = ? AND c.deleted_at IS NULL
         AND (SELECT COUNT(*) FROM ai_core_bills b WHERE b.char_id = c.id) < ?`,
      [
        bill.job ?? null,
        bill.fromCharId ?? null,
        bill.sender.slice(0, 64),
        bill.label,
        bill.amount,
        citizenid,
        MAX_BILLS,
      ],
    )
    .then(
      (id) => {
        if (!id)
          return log.warn(
            `bill "${bill.label}" for ${citizenid} refused: no such character or ${MAX_BILLS} open bills`,
          );
        const player = players.byCitizen(citizenid);
        if (player)
          inOrder(player.charId, () =>
            add(player.charId, { ...bill, id: String(id) }),
          );
      },
      (error: unknown) =>
        log.error(`storing a bill for ${citizenid} failed`, error),
    );
}

/** The stored shape of a bill; null when a personal bill has no loaded issuer. */
function newBill(b: Omit<BillSend, "to" | "toCitizenid">): NewBill | null {
  const fromCharId =
    b.from === undefined ? undefined : players.get(b.from)?.charId;
  if (!b.job && fromCharId === undefined) return null;
  return {
    label: b.label,
    amount: b.amount,
    sender: b.jobLabel ?? b.fromName ?? "",
    job: b.job,
    fromCharId: b.job ? undefined : fromCharId,
  };
}

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
