import {
  Keybind,
  onServerEvent,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { ADMIN, toAdminShowTarget } from "@aicore-fivem/shared";
import { Locale } from "common";
import { NuiCallback, NuiMessage } from "common/nui";
import { panel } from "./panel";
import "./worldTools";

/** The admin panel on this client: F10, the server's open and delta events, edits and other scripts' commands. */

type NuiReply = (value: unknown) => void;

new Keybind({
  name: "aicore_admin",
  description: Locale("KEYBIND_ADMIN"),
  defaultKey: "F10",
  onPressed: () => void panel.show(),
});
onServerEvent(
  ADMIN.showEvent,
  { args: ([target]) => [toAdminShowTarget(target)] },
  (target) => void panel.show(target),
);

// The NUI checks the delta's shape itself; here it is only passed on while the panel is open.
onServerEvent(ADMIN.deltaEvent, { args: ([delta]) => [delta] }, (delta) => {
  if (panel.isOpen)
    SendNUIMessage({ action: NuiMessage.adminDelta, data: delta });
});
onServerEvent(
  ADMIN.recommendationEvent,
  { args: ([delta]) => [delta] },
  (delta) => {
    if (panel.isOpen)
      SendNUIMessage({ action: NuiMessage.adminRecommendation, data: delta });
  },
);

RegisterNuiCallback(NuiCallback.adminApply, (data: unknown, cb: NuiReply) => {
  if (!isRecord(data)) return cb({ ok: false, error: "ADMIN_ERR_TYPE" });
  triggerServerCallback(ADMIN.applyCallback, [data.resource, data.patch]).then(
    cb,
    () => cb({ ok: false, error: "ADMIN_ERR_BUSY" }),
  );
});

RegisterNuiCallback(
  NuiCallback.adminPanelData,
  (data: unknown, cb: NuiReply) => {
    if (!isRecord(data) || typeof data.resource !== "string") return cb(null);
    triggerServerCallback(ADMIN.panelDataCallback, [data.resource]).then(
      cb,
      () => cb(null),
    );
  },
);

RegisterNuiCallback(NuiCallback.adminClose, (_data: unknown, cb: NuiReply) => {
  panel.hide();
  cb(true);
});

// Another script's own panel: ai-core's closes first so the other NUI can take the focus.
RegisterNuiCallback(
  NuiCallback.adminRunCommand,
  (data: unknown, cb: NuiReply) => {
    cb(true);
    if (
      !isRecord(data) ||
      typeof data.command !== "string" ||
      !/^[A-Za-z0-9_:.-]{1,64}$/.test(data.command)
    )
      return;
    panel.hide();
    ExecuteCommand(data.command);
  },
);
