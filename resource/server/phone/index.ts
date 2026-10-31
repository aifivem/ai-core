import { registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  PhoneAdapter,
  PhoneMail,
  PhoneNotification,
} from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import { mov17Phone } from "./adapters/17mov_Phone";
import { gksPhone } from "./adapters/gksphone";
import { highPhone } from "./adapters/high-phone";
import { lbPhone } from "./adapters/lb-phone";
import { qsSmartphone } from "./adapters/qs-smartphone";
import { roadPhone } from "./adapters/roadphone";
import { tgiannPhone } from "./adapters/tgiann-phone";
import { ySeries } from "./adapters/yseries";

/** Supported phones in detection order; a new phone = one adapter file and one line here. */
const PHONES: readonly PhoneAdapter[] = [
  tgiannPhone,
  lbPhone,
  gksPhone,
  mov17Phone,
  ySeries,
  highPhone,
  roadPhone,
  qsSmartphone,
];

/**
 * ai-core's phone layer: scripts ask a player's number, send mails, texts and notifications through ai-core (lib
 * `phone`); the first running phone answers. With none running every call answers null / false.
 */
export const phones = new AdapterPicker({
  category: "phone",
  adapters: PHONES,
  log,
});

const toMail = (v: unknown): PhoneMail | null =>
  isRecord(v) && typeof v.subject === "string" && typeof v.message === "string"
    ? {
        sender: typeof v.sender === "string" ? v.sender : "",
        subject: v.subject.slice(0, 120),
        message: v.message.slice(0, 4000),
      }
    : null;
const toNotification = (v: unknown): PhoneNotification | null =>
  isRecord(v) && typeof v.title === "string"
    ? {
        title: v.title.slice(0, 80),
        message: typeof v.message === "string" ? v.message.slice(0, 500) : "",
        app: typeof v.app === "string" ? v.app : undefined,
      }
    : null;
/** A server id or a phone number -> the number. */
const numberOf = (to: unknown): string | null =>
  typeof to === "number"
    ? phones.call("number", (a) => a.number(to), null)
    : typeof to === "string" && to
      ? to
      : null;

registerExport("GetPhoneNumber", (source: unknown) =>
  typeof source === "number"
    ? phones.call("number", (a) => a.number(source), null)
    : null,
);
registerExport("GetSourceByPhone", (number: unknown) =>
  typeof number === "string"
    ? phones.call("sourceOf", (a) => a.sourceOf(number), null)
    : null,
);
registerExport(
  "HasPhone",
  (source: unknown) =>
    typeof source === "number" &&
    phones.call("hasPhone", (a) => a.hasPhone(source), false),
);
registerExport("SendPhoneMail", (to: unknown, mail: unknown) => {
  const number = numberOf(to);
  const m = toMail(mail);
  return (
    number !== null &&
    m !== null &&
    phones.call("mail", (a) => a.mail(number, m), false)
  );
});
registerExport(
  "SendPhoneMessage",
  (from: unknown, to: unknown, text: unknown) => {
    const number = numberOf(to);
    return (
      typeof from === "string" &&
      typeof text === "string" &&
      number !== null &&
      phones.call(
        "message",
        (a) => a.message(from, number, text.slice(0, 1000)),
        false,
      )
    );
  },
);
registerExport("PhoneNotify", (source: unknown, notification: unknown) => {
  const n = toNotification(notification);
  return (
    typeof source === "number" &&
    n !== null &&
    phones.call("notify", (a) => a.notify(source, n), false)
  );
});
