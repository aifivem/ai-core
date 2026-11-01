import { mysql } from "@aicore-fivem/mysql";
import { CORE, type BillSend, type UnpaidBill } from "@aicore-fivem/shared";
import { db } from "../db";
import { log } from "../log";
import { players } from "../player/registry";

/** Open bills a character may hold; a full list refuses new ones. */
export const MAX_BILLS = 20;

export interface Bill extends UnpaidBill {
  job?: string;
  /** The issuer of a personal bill (gets the money). */
  fromCharId?: number;
}

/** A bill before it has a row id. */
export type NewBill = Omit<Bill, "id">;

/**
 * ai-core's own bills, used while no billing script runs. Every open bill is a row of `ai_core_bills` by character
 * id (an offline character's too); a loaded character's open bills are read in one query at load and kept here. The
 * player sees the open list when one arrives and after each character load, and pays one from it: one lib
 * `money.transfer` from the payer's bank (else cash) to the job's account or the issuer's bank (an issuer who is
 * offline cannot be paid until back). The row's delete rides in the money writer's batch of that transfer, so the
 * money and the bill commit or roll back together.
 */
export const bills = new Map<number, Bill[]>();
/** Per character: the load and late additions run in order, so a bill stored while the list loads is not lost. */
const queues = new Map<number, Promise<void>>();

export function inOrder(
  charId: number,
  task: () => Promise<void> | void,
): void {
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

export const view = (list: readonly Bill[]): UnpaidBill[] =>
  list.map(({ id, label, amount, sender }) => ({ id, label, amount, sender }));

/** Shows the player their open bills (the list screen opens on their client). */
function showBills(charId: number): void {
  const player = players.byCharacter(charId);
  const list = bills.get(charId);
  if (player && list?.length)
    emitNet(CORE.billsEvent, player.source, view(list));
}

/** Reads a loaded character's open bills (one query) and shows them. */
export async function load(charId: number): Promise<void> {
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
export function store(citizenid: string, bill: NewBill): void {
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
export function newBill(
  b: Omit<BillSend, "to" | "toCitizenid">,
): NewBill | null {
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
