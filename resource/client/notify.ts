import { onServerEvent, registerExport } from "@aicore-fivem/lib/client";
import { asArgs, logSafe } from "@aicore-fivem/lib/shared";
import { CORE, type Notification } from "@aicore-fivem/shared";
import { NuiMessage } from "common/nui";

const KINDS = ["success", "error", "info", "warning"] as const;

function toNotification(v: unknown): Notification | null {
  if (typeof v !== "object" || v === null || !("text" in v) || typeof v.text !== "string") return null;
  const kind = "kind" in v && KINDS.includes(v.kind as Notification["kind"]) ? (v.kind as Notification["kind"]) : "info";
  const title = "title" in v && typeof v.title === "string" ? logSafe(v.title, 60) : undefined;
  const duration = "duration" in v && typeof v.duration === "number" ? Math.min(30_000, Math.max(1000, v.duration)) : 4000;
  return { text: logSafe(v.text, 300), title, kind, duration };
}

/** Notification cards and the progress bar for every resource (lib `notify` / `progress`); ai-core only draws them. */
const show = (n: Notification | null) => n && SendNUIMessage({ action: NuiMessage.notify, data: n });

registerExport("Notify", (n: unknown) => show(toNotification(n)));
onServerEvent(CORE.clientNotifyEvent, { args: ([n]) => asArgs(toNotification(n)) }, (n) => show(n));

registerExport("ShowProgress", (label: unknown, duration: unknown) => {
  if (typeof label === "string" && typeof duration === "number") SendNUIMessage({ action: NuiMessage.progressShow, data: { label: logSafe(label, 60), duration } });
});
registerExport("HideProgress", () => SendNUIMessage({ action: NuiMessage.progressHide }));
