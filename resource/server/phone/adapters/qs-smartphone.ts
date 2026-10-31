import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "qs-smartphone";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;
const live = (v: unknown) => v !== null && v !== undefined && v !== false;

/**
 * Quasar Smartphone (written from its docs, quasar-store.com/docs/smartphone/commands-and-exports). It has no
 * number -> player export (null) and mails a player id or mail address, not a number (false). A text comes from the
 * sender name `SendNewMessageFromApp` shows; a player has a phone while it has an active phone id.
 */
export const qsSmartphone: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("GetCurrentPhoneNumber", source)),
  sourceOf: () => null,
  hasPhone: (source) => live(phone("getPhoneScopeIdentifier", source)),
  mail: () => false,
  message: (from, to, body) => {
    const result = phone("SendNewMessageFromApp", {
      targetPhone: to,
      appLabel: from,
      message: body,
    });
    return isRecord(result) && result.ok === true;
  },
  notify: (source, n) =>
    phone("sendPhoneNotification", source, {
      appId: n.app,
      title: n.title,
      text: n.message,
    }) !== false,
};
