import { registerExport } from "@aicore-fivem/lib/server";
import {
  toBillRequest,
  type BillRequest,
  type BillSend,
  type UnpaidBill,
} from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { jobs, panel, settings } from "../content";
import { log } from "../log";
import { players } from "../player/registry";
import { billOffline, builtinBilling } from "./builtin";
import { BILLING_SCRIPTS } from "./registry";

/**
 * ai-core's billing layer (lib `billing`): bills from a job or a player go to the active billing script (panel
 * setting `billing`, `auto` = first running of `registry.ts`), else to ai-core's own bills (`builtin.ts`), which is
 * always there, so a bill never goes nowhere.
 */
const billing = new AdapterPicker({
  category: "billing",
  adapters: [...BILLING_SCRIPTS, builtinBilling],
  log,
  choice: settings.billing,
});
panel.onChange("settings", () => billing.setChoice(settings.billing));

/**
 * Sends a valid bill; false when the issuer is not loaded, the job does not exist, the recipient is the issuer or the
 * billing script refused it. A recipient named by citizen id who is offline gets it only from ai-core's own bills
 * (stored by character id); a billing script needs the player online.
 */
export function sendBill(bill: BillRequest): boolean {
  const from = bill.from === undefined ? undefined : players.get(bill.from);
  const job = bill.job === undefined ? undefined : jobs.get(bill.job);
  if (bill.from !== undefined && !from) return false;
  if (bill.job !== undefined && !job) return false;
  const known = {
    amount: bill.amount,
    label: bill.label,
    from: bill.from,
    job: bill.job,
    fromCitizenid: from?.citizenid,
    fromName: from?.fullName,
    jobLabel: job?.label,
  };
  const to =
    bill.to !== undefined
      ? players.get(bill.to)
      : bill.toCitizenid !== undefined
        ? players.byCitizen(bill.toCitizenid)
        : undefined;
  if (to) {
    if (from === to) return false;
    const send: BillSend = {
      ...known,
      to: to.source,
      toCitizenid: to.citizenid,
    };
    return billing.call("send", (a) => a.send(send), false);
  }
  const citizenid = bill.to === undefined ? bill.toCitizenid : undefined;
  return (
    citizenid !== undefined &&
    citizenid !== from?.citizenid &&
    billing.active === builtinBilling &&
    billOffline(citizenid, known)
  );
}

registerExport("GetBillingSystem", () => billing.active?.resource ?? null);
registerExport("SendBill", (raw: unknown) => {
  const bill = toBillRequest(raw);
  return bill !== null && sendBill(bill);
});
registerExport("GetUnpaidBills", (source: unknown, done: unknown) => {
  if (typeof done !== "function") return;
  const answer = (bills: UnpaidBill[] | null) => {
    try {
      Reflect.apply(done, undefined, [bills]);
    } catch (error) {
      log.error("an unpaid bills callback failed", error);
    }
  };
  const player = typeof source === "number" ? players.get(source) : undefined;
  const adapter = billing.active;
  if (!player || !adapter?.unpaid) return answer(null);
  billing.call(
    "unpaid",
    (a) => a.unpaid?.(player.source, player.citizenid, answer),
    undefined,
  );
});
registerExport(
  "PayBill",
  (source: unknown, id: unknown) =>
    typeof source === "number" &&
    typeof id === "string" &&
    players.get(source) !== undefined &&
    billing.call("pay", (a) => a.pay?.(source, id) ?? false, false),
);
