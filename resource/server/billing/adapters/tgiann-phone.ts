import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { BillingAdapter, UnpaidBill } from "@aicore-fivem/shared";
import { accepted, listOf } from "../answer";

const RESOURCE = "tgiann-phone";

/**
 * tgiann-phone's billing app (written from its 2.0.0-b8 source, `server/billing/exports.lua`): `CreateInvoice` with a
 * job or player sender and one line item, `GetUnpaidInvoices(citizenid)` (pending, unpaid, disputed). Payments happen
 * in the phone app only (no script export), so `pay` is absent.
 */
export const tgiannPhoneBilling: BillingAdapter = {
  resource: RESOURCE,
  version: "2.0.0-b8",
  send: (b) => {
    const sender = b.job
      ? { type: "job", id: b.job, label: b.jobLabel ?? b.job }
      : { type: "player", id: b.fromCitizenid, label: b.fromName };
    if (!sender.id) return false;
    return accepted(
      RESOURCE,
      callExport(RESOURCE, "CreateInvoice", {
        sender,
        issuer: b.from,
        target: { kind: "source", value: b.to },
        items: [{ label: b.label, price: b.amount, quantity: 1 }],
        vat: false,
      }),
    );
  },
  unpaid: (_source, citizenid, done) =>
    listOf<UnpaidBill>(
      callExport(RESOURCE, "GetUnpaidInvoices", citizenid),
      (rows) =>
        rows.flatMap((r) =>
          isRecord(r) && typeof r.amount === "number"
            ? [
                {
                  id: String(r.ref ?? r.id),
                  label: String(r.label ?? ""),
                  amount: r.amount,
                  sender: String(r.sender ?? ""),
                },
              ]
            : [],
        ),
      done,
    ),
};
