import {
  Keybind,
  onServerEvent,
  registerExport,
} from "@aicore-fivem/lib/client";
import { asArgs, logSafe } from "@aicore-fivem/lib/shared";
import { CORE, type Notification } from "@aicore-fivem/shared";
import { NuiMessage } from "common/nui";
import { Locale } from "common";

const KINDS = ["success", "error", "info", "warning"] as const;

function toNotification(v: unknown): Notification | null {
  if (
    typeof v !== "object" ||
    v === null ||
    !("text" in v) ||
    typeof v.text !== "string"
  )
    return null;
  const kind =
    "kind" in v && KINDS.includes(v.kind as Notification["kind"])
      ? (v.kind as Notification["kind"])
      : "info";
  const title =
    "title" in v && typeof v.title === "string"
      ? logSafe(v.title, 60)
      : undefined;
  const duration =
    "duration" in v && typeof v.duration === "number"
      ? Math.min(30_000, Math.max(1000, v.duration))
      : 4000;
  return { text: logSafe(v.text, 300), title, kind, duration };
}

/** Notification cards and the progress bar for every resource (lib `notify` / `progress`); ai-core only draws them. */
const show = (n: Notification | null) =>
  n && SendNUIMessage({ action: NuiMessage.notify, data: n });

registerExport("Notify", (n: unknown) => show(toNotification(n)));
onServerEvent(
  CORE.clientNotifyEvent,
  { args: ([n]) => asArgs(toNotification(n)) },
  (n) => show(n),
);

let progressShown = false;

registerExport("ShowProgress", (label: unknown, duration: unknown) => {
  if (typeof label !== "string" || typeof duration !== "number") return;
  progressShown = true;
  SendNUIMessage({
    action: NuiMessage.progressShow,
    data: { label: logSafe(label, 60), duration },
  });
});
registerExport("HideProgress", () => {
  progressShown = false;
  SendNUIMessage({ action: NuiMessage.progressHide });
});

// One cancel key for every resource's progress bar (lib `progress` with `canCancel`, the framework bars).
new Keybind({
  name: "aicore_cancel_progress",
  description: Locale("KEYBIND_CANCEL_PROGRESS"),
  defaultKey: "BACK",
  onPressed: () => {
    if (progressShown) emit(CORE.clientCancelProgressEvent);
  },
});
