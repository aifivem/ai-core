import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "gksphone";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;
const sourceOf = (number: string) => {
  const s = Number(phone("GetSourceByPhone", number));
  return Number.isInteger(s) && s > 0 ? s : null;
};

/**
 * GKSPHONE V2 (written from its docs, docs.gkshop.org "Server Exports"): it has no has-phone export, so a player has a
 * phone when it answers a number; mail goes to the number's online player (`SendNewMail` takes a server id).
 */
export const gksPhone: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("GetPhoneBySource", source)),
  sourceOf,
  hasPhone: (source) => text(phone("GetPhoneBySource", source)) !== null,
  mail: (to, m) => {
    const source = sourceOf(to);
    if (source === null) return false;
    phone("SendNewMail", source, {
      sender: m.sender,
      subject: m.subject,
      message: m.message,
    });
    return true;
  },
  message: (from, to, body) => {
    const result = phone("SendMessage", from, to, body);
    return isRecord(result) && result.status === true;
  },
  notify: (source, n) => {
    phone("sendNotification", source, {
      title: n.title,
      message: n.message,
      duration: 5000,
    });
    return true;
  },
};
