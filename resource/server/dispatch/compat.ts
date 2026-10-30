import {
  addCommand,
  hasCharacter,
  onClientEvent,
} from "@aicore-fivem/lib/server";
import { Locale } from "common";
import { log } from "../log";
import { dispatch, sendAlert } from ".";

/**
 * QB's police alert event (qb-policejob / qbx_police contract), sent by many QB and Qbox scripts: clients send
 * `(text)`, server scripts `TriggerEvent(name, text, camId, playerSource)`. Both reach the active alert system at the
 * player's position; an alert system that answers the event itself (tgiann-policealert) is left alone.
 */
const QB_POLICE_ALERT = "police:server:policeAlert";
const toText = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null;

function qbAlert(text: string, source: number | undefined): void {
  if (dispatch.active?.answersPoliceAlert) return;
  sendAlert({ title: text, source, priority: "normal" });
}

onClientEvent(
  QB_POLICE_ALERT,
  {
    args: ([text]) => {
      const t = toText(text);
      return t ? [t] : null;
    },
    guards: [hasCharacter()],
    rate: { count: 1, windowMs: 10_000 },
  },
  (source, text) => qbAlert(text, source),
);
// Server scripts' local emits (the net handler above drops them); a client's net emit reaches here too and is skipped.
on(QB_POLICE_ALERT, (text: unknown, _camId: unknown, playerSource: unknown) => {
  if (Number(globalThis.source) > 0) return;
  const t = toText(text);
  if (t)
    qbAlert(
      t,
      typeof playerSource === "number" && playerSource > 0
        ? playerSource
        : undefined,
    );
});

/** Legion Square: where a console test alert lands. */
const CONSOLE_POINT = { x: 195.2, y: -933.8, z: 30.7 };

addCommand(
  "aicore_alert",
  {
    help: Locale("COMMAND_AICORE_ALERT"),
    restricted: true,
    params: [
      {
        name: "priority",
        type: "string",
        help: Locale("COMMAND_P_PRIORITY"),
        optional: true,
      },
    ],
  },
  (source, args) => {
    const sent = sendAlert({
      code: "10-99",
      title: Locale("DISPATCH_TEST_TITLE"),
      message: Locale("DISPATCH_TEST_MESSAGE"),
      source: source > 0 ? source : undefined,
      coords: source > 0 ? undefined : CONSOLE_POINT,
      icon: "flask",
      priority: args.priority === "high" ? "high" : "normal",
    });
    log.info(
      sent
        ? `test alert sent through ${dispatch.active?.resource}`
        : "no alert system runs",
    );
  },
);
