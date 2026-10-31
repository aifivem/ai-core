import { callExport } from "@aicore-fivem/lib/server";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const phone = (name: string, ...args: unknown[]) =>
  callExport("tgiann-phone", name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/** tgiann-phone's own exports (it also answers lb-phone's names: `SendNotification` comes from there; read from 2.0.0-b8). */
export const tgiannPhone: PhoneAdapter & { readonly version: string } = {
  resource: "tgiann-phone",
  version: "2.0.0-b8",
  number: (source) => text(phone("GetPhoneNumber", source)),
  sourceOf: (number) => {
    const s = phone("GetSourceByNumber", number);
    return typeof s === "number" ? s : null;
  },
  hasPhone: (source) => phone("HasPhone", source) === true,
  mail: (to, m) =>
    phone("SendMail", {
      to,
      from: m.sender,
      subject: m.subject,
      message: m.message,
    }) !== false,
  message: (from, to, body) => phone("SendSms", from, to, { body }) !== false,
  notify: (source, n) =>
    phone("SendNotification", source, {
      app: n.app,
      title: n.title,
      content: n.message,
    }) != null,
};
