import {
  onServerEvent,
  player,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { ADMIN_PLAYERS, isPlayersAction } from "common/adminPlayers";
import { NuiCallback, NuiMessage } from "common/nui";
import { panel } from "./admin";

type NuiReply = (value: unknown) => void;

// The Players screen's calls: only listed actions, each answered by its own admin-only server callback.
RegisterNuiCallback(NuiCallback.adminPlayers, (data: unknown, cb: NuiReply) => {
  if (
    !isRecord(data) ||
    !isPlayersAction(data.action) ||
    !Array.isArray(data.args)
  )
    return cb({ ok: false, error: "ADMIN_ERR_TYPE" });
  triggerServerCallback(ADMIN_PLAYERS.callback(data.action), data.args).then(
    cb,
    () => cb({ ok: false, error: "ADMIN_ERR_BUSY" }),
  );
});

// The NUI checks the delta's shape itself; here it is only passed on while the panel is open.
onServerEvent(
  ADMIN_PLAYERS.deltaEvent,
  { args: ([delta]) => [delta] },
  (delta) => {
    if (panel.isOpen)
      SendNUIMessage({ action: NuiMessage.adminPlayers, data: delta });
  },
);

// Goto (the admin) and bring (the target): the server picked the point.
onServerEvent(
  ADMIN_PLAYERS.teleportEvent,
  {
    args: ([point]) =>
      isRecord(point) &&
      typeof point.x === "number" &&
      typeof point.y === "number" &&
      typeof point.z === "number"
        ? [
            {
              x: point.x,
              y: point.y,
              z: point.z,
              heading:
                typeof point.heading === "number" ? point.heading : undefined,
            },
          ]
        : null,
  },
  (point) => void player.teleport(point, { heading: point.heading }),
);
