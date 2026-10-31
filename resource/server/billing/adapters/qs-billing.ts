import { callExport } from "@aicore-fivem/lib/server";
import type { BillingAdapter } from "@aicore-fivem/shared";
import { accepted } from "../answer";

const RESOURCE = "qs-billing";

/**
 * Quasar Billing (written from its docs, "Server-side invoice"): `ServerCreateInvoice(receiver, title, description,
 * amount, isSociety, isAlreadyPaid, giveItem, questToGiveItem, customSocietyName)`. Its docs say `isSociety` must be
 * true, so only job bills are sent (the job is the society).
 */
export const qsBilling: BillingAdapter = {
  resource: RESOURCE,
  send: (b) =>
    b.job !== undefined &&
    accepted(
      RESOURCE,
      callExport(
        RESOURCE,
        "ServerCreateInvoice",
        b.to,
        b.label,
        b.label,
        b.amount,
        true,
        false,
        false,
        false,
        b.job,
      ),
    ),
};
