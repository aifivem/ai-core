import { callExport } from "@aicore-fivem/lib/server";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "yseries";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/**
 * TeamsGG YSeries (YPhone / YFlip in one resource; written from its docs, teamsgg.dev/docs phone server exports): a
 * player has a phone when it answers a number; the mail sender name also fills its sender address.
 */
export const ySeries: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("GetPhoneNumberBySourceId", source)),
  sourceOf: (number) => {
    const s = Number(phone("GetPlayerSourceIdByPhoneNumber", number));
    return Number.isInteger(s) && s > 0 ? s : null;
  },
  hasPhone: (source) =>
    text(phone("GetPhoneNumberBySourceId", source)) !== null,
  mail: (to, m) =>
    phone(
      "SendMail",
      {
        title: m.subject,
        sender: m.sender,
        senderDisplayName: m.sender,
        content: m.message,
      },
      "phoneNumber",
      to,
    ) != null,
  message: (from, to, body) => phone("SendMessageTo", from, to, body) != null,
  notify: (source, n) =>
    phone(
      "SendNotification",
      { app: n.app, title: n.title, text: n.message },
      "source",
      source,
    ) === true,
};
