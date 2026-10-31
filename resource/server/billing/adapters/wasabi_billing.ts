import { callExport } from "@aicore-fivem/lib/server";
import type { BillingAdapter } from "@aicore-fivem/shared";
import { accepted, first } from "../answer";

const RESOURCE = "wasabi_billing";

/**
 * Wasabi Billing (written from its docs, docs.wasabiscripts.com/core-ui-series/wasabi-billing/exports):
 * `CreateInvoice(authorSource, targetCitizenid, amount, reason, "society" | "personal")` (a society invoice goes to
 * the issuing player's job, so it needs an issuer), `PayInvoiceByReference(payer, ref)`. Its invoice list rows are not
 * documented, so open bills are not listed.
 */
export const wasabiBilling: BillingAdapter = {
  resource: RESOURCE,
  send: (b) =>
    b.from !== undefined &&
    accepted(
      RESOURCE,
      callExport(
        RESOURCE,
        "CreateInvoice",
        b.from,
        b.toCitizenid,
        b.amount,
        b.label,
        b.job ? "society" : "personal",
        "personal",
      ),
    ),
  pay: (source, id) =>
    first(callExport(RESOURCE, "PayInvoiceByReference", source, id)) === true,
};
