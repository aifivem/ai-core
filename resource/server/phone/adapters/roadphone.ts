import { callExport } from "@aicore-fivem/lib/server";
import type { PhoneAdapter } from "@aicore-fivem/shared";

const RESOURCE = "roadphone";
const phone = (name: string, ...args: unknown[]) =>
  callExport(RESOURCE, name, ...args);
const text = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v) : null;

/**
 * RoadPhone Pro (resource `roadphone`; written from its docs, docs.roadshop.org/roadphonepro/api/server). Its server
 * mail export takes a framework identifier, not a number: mails are not mapped (false). The older RoadPhone (same
 * resource name) has none of these server exports.
 */
export const roadPhone: PhoneAdapter = {
  resource: RESOURCE,
  number: (source) => text(phone("GetPhoneNumberBySource", source)),
  sourceOf: (number) => {
    const s = phone("getSourceFromPhone", number);
    return typeof s === "number" ? s : null;
  },
  hasPhone: (source) => phone("hasPhone", source) === true,
  mail: () => false,
  message: (from, to, body) => phone("sendMessage", from, to, body) === true,
  notify: (source, n) => {
    phone("PhoneNotifyPlayer", source, {
      title: n.title,
      message: n.message,
      app: n.app,
    });
    return true;
  },
};
