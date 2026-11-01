import { onServerEvent, triggerServerCallback } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { ADMIN_BANS, isBansAction } from "common/adminBans";
import { NuiCallback, NuiMessage } from "common/nui";
import { panel } from "./admin";

type NuiReply = (value: unknown) => void;

// The ban screens' calls: only listed actions, each answered by its own admin-only server callback.
RegisterNuiCallback(NuiCallback.adminBans, (data: unknown, cb: NuiReply) => {
  if (
    !isRecord(data) ||
    !isBansAction(data.action) ||
    !Array.isArray(data.args)
  )
    return cb({ ok: false, error: "ADMIN_ERR_TYPE" });
  triggerServerCallback(ADMIN_BANS.callback(data.action), data.args).then(
    cb,
    () => cb({ ok: false, error: "ADMIN_ERR_BUSY" }),
  );
});

// The NUI checks the delta's shape itself; here it is only passed on while the panel is open.
onServerEvent(
  ADMIN_BANS.deltaEvent,
  { args: ([delta]) => [delta] },
  (delta) => {
    if (panel.isOpen)
      SendNUIMessage({ action: NuiMessage.adminBans, data: delta });
  },
);
