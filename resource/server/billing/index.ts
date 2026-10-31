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
import { builtinBilling } from "./builtin";
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

/** The request with the players' citizen ids, the issuer's name and the job's label; null when a player is not loaded or the job does not exist. */
function resolve(bill: BillRequest): BillSend | null {
  const to = players.get(bill.to);
  const from = bill.from === undefined ? undefined : players.get(bill.from);
  if (!to || (bill.from !== undefined && !from)) return null;
  const job = bill.job === undefined ? undefined : jobs.get(bill.job);
  if (bill.job !== undefined && !job) return null;
  return {
    ...bill,
    toCitizenid: to.citizenid,
    fromCitizenid: from?.citizenid,
    fromName: from?.fullName,
    jobLabel: job?.label,
  };
}

/** Sends a valid bill; false when a player is not loaded, the job does not exist or the billing script refused it. */
export function sendBill(bill: BillRequest): boolean {
  const send = resolve(bill);
  return send !== null && billing.call("send", (a) => a.send(send), false);
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
