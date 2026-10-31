import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "17mov_Phone";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/**
 * 17mov_Phone (written from its docs, docs.17movement.net/phone/exports): a player has a phone when it answers an
 * active number; mails come from a sender name that is no phone account (`customUser`); notifications go to its
 * `SYSTEM` app (its app ids are its own).
 */
export const mov17Phone: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("GetNumberFromPlayer", source)),
  sourceOf: (number) => {
    const s = phone("GetPlayerSrcFromActiveNumber", number);
    return typeof s === "number" ? s : null;
  },
  hasPhone: (source) => text(phone("GetNumberFromPlayer", source)) !== null,
  mail: (to, m) => {
    phone(
      "Email_SendEmailByNumber",
      to,
      m.sender,
      m.subject,
      m.message,
      undefined,
      true,
    );
    return true;
  },
  message: (from, to, body) => {
    const result = phone("Messages_SendMessageToNumber", to, body, from);
    return isRecord(result) && result.success === true;
  },
  notify: (source, n) => {
    phone("SendNotificationToSrc", source, {
      app: "SYSTEM",
      title: n.title,
      message: n.message,
    });
    return true;
  },
};
