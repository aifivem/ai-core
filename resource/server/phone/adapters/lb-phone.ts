import { callExport } from "@aicore-fivem/lib/server";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const phone = (name: string, ...args: unknown[]) =>
  callExport("lb-phone", name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/** lb-phone's server exports (untested on ai-core). */
export const lbPhone: PhoneAdapter = {
  resource: "lb-phone",
  number: (source) => text(phone("GetEquippedPhoneNumber", source)),
  sourceOf: (number) => {
    const s = phone("GetSourceFromNumber", number);
    return typeof s === "number" ? s : null;
  },
  hasPhone: (source) => phone("HasPhoneItem", source) === true,
  mail: (to, m) =>
    phone("SendMail", {
      to,
      sender: m.sender,
      subject: m.subject,
      message: m.message,
    }) !== false,
  message: (from, to, body) => phone("SendMessage", from, to, body) !== false,
  notify: (source, n) =>
    phone("SendNotification", source, {
      app: n.app,
      title: n.title,
      content: n.message,
    }) != null,
};
