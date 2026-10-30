import { loadLocaleTexts, onServerEvent } from "@aicore-fivem/lib/client";
import { isRecord, sleep } from "@aicore-fivem/lib/shared";
import { NuiCallback, NuiMessage } from "common/nui";
import { SETUP_WELCOME_EVENT, type SetupWelcome } from "common/setup";
import { panel } from "./admin";

const toWelcome = (v: unknown): [SetupWelcome] | null =>
  isRecord(v) && typeof v.admin === "boolean" && typeof v.adminLine === "string"
    ? [{ admin: v.admin, adminLine: v.adminLine }]
    : null;

/** The setup guide is not finished: a card in the middle of the screen after spawning (admins open the panel from it). */
onServerEvent(
  SETUP_WELCOME_EVENT,
  { args: ([v]) => toWelcome(v) },
  async (welcome) => {
    // The spawn fade runs first.
    await sleep(3000);
    SetNuiFocus(true, true);
    SendNUIMessage({
      action: NuiMessage.setupWelcome,
      data: { ...welcome, texts: loadLocaleTexts() },
    });
  },
);

RegisterNuiCallback(
  NuiCallback.setupWelcomeClose,
  (data: unknown, cb: (value: unknown) => void) => {
    SetNuiFocus(false, false);
    cb(true);
    if (isRecord(data) && data.openPanel === true) void panel.show();
  },
);
