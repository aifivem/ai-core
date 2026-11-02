import { callExport } from "@aifivem/lib/server";
import type { PhoneAdapter } from "@aifivem/shared";

const phone = (name: string, ...args: unknown[]) =>
  callExport("codem-phone", name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;
const sourceOf = (number: string): number | null => {
  const s = phone("GetSourceFromNumber", number);
  return typeof s === "number" ? s : null;
};

/**
 * codem-phone (CodeM mPhone 2.5) server exports (codem.gitbook.io, mPhone 2.5, Exports and events, Server Exports).
 * Mails and texts reach only the number's online player; a notification needs an app id.
 */
export const codemPhone: PhoneAdapter = {
  resource: "codem-phone",
  number: (source) => text(phone("GetPhoneNumberBySource", source)),
  sourceOf,
  hasPhone: (source) => text(phone("GetPhoneNumberBySource", source)) !== null,
  mail: (to, m) => {
    const source = sourceOf(to);
    return (
      source !== null &&
      phone("SendMailBySource", source, {
        sender: m.sender,
        title: m.subject,
        description: m.message,
      }) != null
    );
  },
  message: (from, to, body) => {
    const source = sourceOf(to);
    // Lua `return ok, result` arrives as an array.
    const answer =
      source !== null && phone("SendMessageFromBySource", from, source, body);
    return Array.isArray(answer) ? answer[0] === true : answer === true;
  },
  notify: (source, n) =>
    n.app !== undefined &&
    phone("SendNotify", source, {
      app: n.app,
      title: n.title,
      message: n.message,
    }) === true,
};
