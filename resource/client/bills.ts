import { callAction, menu, onServerEvent } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { CORE, type UnpaidBill } from "@aicore-fivem/shared";
import { Locale } from "common";

const toBills = (raw: unknown): [UnpaidBill[]] | null =>
  Array.isArray(raw)
    ? [
        raw.flatMap((b) =>
          isRecord(b) &&
          typeof b.id === "string" &&
          typeof b.label === "string" &&
          typeof b.amount === "number" &&
          typeof b.sender === "string"
            ? [{ id: b.id, label: b.label, amount: b.amount, sender: b.sender }]
            : [],
        ),
      ]
    : null;

/**
 * ai-core's own bills (used while no billing script runs): the server sends the open list when a bill arrives and
 * after a character load; picking one pays it (the server moves the money), closing leaves them open.
 */
onServerEvent(
  CORE.billsEvent,
  { args: ([raw]) => toBills(raw) },
  async (bills) => {
    if (!bills.length) return;
    const picked = await menu({
      title: Locale("BILLS_TITLE"),
      items: bills.map((b) => ({
        id: b.id,
        label: Locale("BILL_ITEM", b.amount, b.label),
        description: b.sender,
        icon: "money-bill-wave",
      })),
    });
    if (picked && bills.some((b) => b.id === picked))
      await callAction(CORE.payBillCallback, [picked], {
        fallback: "BILL_ERR_MONEY",
      });
  },
);
