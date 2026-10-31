import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { BillingAdapter, UnpaidBill } from "@aicore-fivem/shared";
import { accepted, first, listOf } from "../answer";

const RESOURCE = "okokBilling";

/**
 * okokBillingV3 (written from its docs, docs.okokscripts.io/scripts/okokbillingv3/exports): `CreateInvoice(receiver,
 * amount, reason, author)` (author = the job, or the issuing player's server id), `getInvoices(target)` (open = every
 * status but `paid`), `payReference(payer, ref)`.
 */
export const okokBilling: BillingAdapter = {
  resource: RESOURCE,
  send: (b) =>
    accepted(
      RESOURCE,
      callExport(
        RESOURCE,
        "CreateInvoice",
        b.to,
        b.amount,
        b.label,
        b.job ?? b.from,
      ),
    ),
  unpaid: (source, _citizenid, done) =>
    listOf<UnpaidBill>(
      callExport(RESOURCE, "getInvoices", source),
      (rows) =>
        rows.flatMap((r) =>
          isRecord(r) && r.status !== "paid" && typeof r.amount === "number"
            ? [
                {
                  id: String(r.ref_id ?? r.id),
                  label: String(r.reason ?? ""),
                  amount: r.amount + (typeof r.fees === "number" ? r.fees : 0),
                  sender: String(r.sender ?? ""),
                },
              ]
            : [],
        ),
      done,
    ),
  pay: (source, id) =>
    first(callExport(RESOURCE, "payReference", source, id)) !== false,
};
