import {
  callExport,
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger, logSafe } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type Notification,
  type NotificationKind,
  type NotifyClientAdapter,
} from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";

/** A kind in a script's own words. */
const kinds =
  (map: Record<NotificationKind, string>) =>
  (kind: NotificationKind): string =>
    map[kind];
const oxKind = kinds({
  success: "success",
  error: "error",
  info: "inform",
  warning: "warning",
});
const plainKind = kinds({
  success: "success",
  error: "error",
  info: "info",
  warning: "warning",
});

/**
 * Notification UIs ai-lib's cards can go to (server list: `server/notify.ts`); each translates one card. Calls per
 * script: `docs/compat/notify.md`.
 */
const ADAPTERS: readonly NotifyClientAdapter[] = [
  {
    // client/client.lua: Notify({ title, description, type, duration }), types primary / success / error.
    resource: "tgiann-lumihud",
    version: "2.2.1",
    notify: (n) =>
      void callExport("tgiann-lumihud", "Notify", {
        title: n.title,
        description: n.text,
        type: n.kind === "success" || n.kind === "error" ? n.kind : "primary",
        duration: n.duration,
      }),
  },
  {
    // Alert(title, message, time, type, playSound).
    resource: "okokNotify",
    notify: (n) =>
      void callExport(
        "okokNotify",
        "Alert",
        n.title ?? "",
        n.text,
        n.duration ?? 4000,
        plainKind(n.kind),
        false,
      ),
  },
  {
    // notify({ title, description, type, duration }).
    resource: "ox_lib",
    notify: (n) =>
      void callExport("ox_lib", "notify", {
        title: n.title,
        description: n.text,
        type: oxKind(n.kind),
        duration: n.duration,
      }),
  },
  {
    // SendAlert(type, text, length): inform / error / success.
    resource: "mythic_notify",
    notify: (n) =>
      void callExport(
        "mythic_notify",
        "SendAlert",
        n.kind === "success" || n.kind === "error" ? n.kind : "inform",
        n.text,
        n.duration ?? 4000,
      ),
  },
  {
    // SendAlert(title, message, time, type, playSound).
    resource: "brutal_notify",
    notify: (n) =>
      void callExport(
        "brutal_notify",
        "SendAlert",
        n.title ?? "",
        n.text,
        n.duration ?? 4000,
        plainKind(n.kind),
        false,
      ),
  },
];

/** The client half of the notify layer: follows the UI the server picked (unset = ai-lib draws its own cards). */
const layer = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(CORE.notifyStateKey, stateString),
  createLogger("ai-core"),
);

const KINDS: readonly NotificationKind[] = [
  "success",
  "error",
  "info",
  "warning",
];

/** A card from ai-lib (already checked there; checked again: it crosses a resource boundary). */
function toCard(v: unknown): Notification | null {
  if (typeof v !== "object" || v === null) return null;
  const { text, title, kind, duration } = v as Record<string, unknown>;
  if (typeof text !== "string") return null;
  return {
    text: logSafe(text, 300),
    title: typeof title === "string" ? logSafe(title, 60) : undefined,
    kind: KINDS.includes(kind as NotificationKind)
      ? (kind as NotificationKind)
      : "info",
    duration: typeof duration === "number" ? duration : undefined,
  };
}

registerExport("ExternalNotify", (raw: unknown) => {
  const card = toCard(raw);
  return (
    card !== null && layer.call("notify", (a) => (a.notify(card), true), false)
  );
});
