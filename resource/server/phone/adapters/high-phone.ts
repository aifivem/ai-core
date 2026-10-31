import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "high-phone";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/**
 * High Phone (written from its docs, docs.high-scripts.com/phone/exports/server). Its `sendMail` sends from a mail
 * address set up in its mail config to mail addresses, not to a number: mails are not mapped (false).
 */
export const highPhone: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("getPlayerPhoneNumber", source)),
  sourceOf: (number) => {
    const player = phone("getPlayerByPhone", number);
    return isRecord(player) && typeof player.id === "number" ? player.id : null;
  },
  hasPhone: (source) => isRecord(phone("getPlayerPhone", source)),
  mail: () => false,
  message: (from, to, body) => {
    phone("sendMessage", { sender: from, recipient: to, content: body });
    return true;
  },
  notify: (source, n) => {
    phone("sendNotification", source, {
      application: n.app ? { name: n.app } : undefined,
      title: n.title,
      content: n.message,
      duration: 5000,
    });
    return true;
  },
};
