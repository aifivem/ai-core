import {
  cache,
  hud,
  Keybind,
  loadLocaleTexts,
  onServerEvent,
  player,
  triggerServerCallback,
  vehicleLabel,
} from "@aicore-fivem/lib/client";
import { isRecord, record, round as roundTo } from "@aicore-fivem/lib/shared";
import { ADMIN } from "@aicore-fivem/shared";
import { Locale } from "common";
import { NuiCallback, NuiMessage } from "common/nui";
import { pickEntity, pickPoint, placeNames } from "./freecam";
import { keybinds } from "./keybinds";
import { isLoaded } from "./playerState";

/** Every vehicle model this game has (addons included), for the panel's model pickers. */
function vehicleModels(): Array<{ value: string; label: string }> {
  const names: unknown = GetAllVehicleModels();
  if (!Array.isArray(names)) return [];
  return names
    .filter((n): n is string => typeof n === "string")
    .map((n) => {
      const value = n.toLowerCase();
      const label = vehicleLabel(value);
      return {
        value,
        label: label.toLowerCase() !== value ? `${label} (${value})` : value,
      };
    });
}

type NuiReply = (value: unknown) => void;
const round = (value: number): number => roundTo(value, 2);

/** The admin panel on this client: opens it for admins (F10, or /aiadmin on the server), relays edits and the server's deltas. */
class AdminPanelClient {
  private open = false;
  private opening = false;

  async show(): Promise<void> {
    if (this.open || this.opening || !isLoaded()) return;
    this.opening = true;
    // The keybinds live on clients: the admin's own list fills the panel's Keybinds tab.
    const answer = await triggerServerCallback(ADMIN.openCallback, [
      keybinds.list(),
    ]).catch(() => null);
    this.opening = false;
    // Not an admin: nothing happens, not even a message. ai-core's own server built the answer; the NUI checks its parts.
    if (!isRecord(answer) || !Array.isArray(answer.panels)) return;
    this.open = true;
    SetNuiFocus(true, true);
    hud.hide("admin");
    SendNUIMessage({
      action: NuiMessage.adminOpen,
      data: {
        ...answer,
        lookups: { ...record(answer.lookups), vehicle: vehicleModels() },
        texts: loadLocaleTexts(),
      },
    });
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    SetNuiFocus(false, false);
    hud.show("admin");
    emitNet(ADMIN.closeEvent);
  }

  get isOpen(): boolean {
    return this.open;
  }
}

export const panel = new AdminPanelClient();

new Keybind({
  name: "aicore_admin",
  description: Locale("KEYBIND_ADMIN"),
  defaultKey: "F10",
  onPressed: () => void panel.show(),
});
onServerEvent(ADMIN.showEvent, () => void panel.show());

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

RegisterNuiCallback(
  NuiCallback.adminPosition,
  (data: unknown, cb: NuiReply) => {
    const camera = isRecord(data) && data.from === "camera";
    const ground = isRecord(data) && data.ground === true;
    const ped = cache.ped;
    const [x = 0, y = 0, root = 0] = camera
      ? GetFinalRenderedCamCoord()
      : GetEntityCoords(ped, false);
    const z = ground && !camera ? root - GetEntityHeightAboveGround(ped) : root;
    const heading = camera
      ? (GetFinalRenderedCamRot(2)[2] ?? 0)
      : GetEntityHeading(ped);
    cb({
      x: round(x),
      y: round(y),
      z: round(z),
      heading: round(((heading % 360) + 360) % 360),
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminTeleport,
  (data: unknown, cb: NuiReply) => {
    if (
      isRecord(data) &&
      typeof data.x === "number" &&
      typeof data.y === "number" &&
      typeof data.z === "number"
    )
      // A floor point (door, ground spot) is where the feet go; the others are the body's centre.
      void player.teleport(
        { x: data.x, y: data.y, z: data.z },
        {
          ground: data.ground === true,
          heading: typeof data.heading === "number" ? data.heading : undefined,
        },
      );
    cb(true);
  },
);

// Free camera pick: the NUI hides the panel and gives the focus back to the game until a place is picked or cancelled.
RegisterNuiCallback(
  NuiCallback.adminPickPoint,
  (data: unknown, cb: NuiReply) => {
    if (!panel.isOpen) return cb(null);
    SetNuiFocus(false, false);
    void pickPoint(isRecord(data) && data.root === true).then((point) => {
      if (panel.isOpen) SetNuiFocus(true, true);
      cb(point);
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminPickEntity,
  (_data: unknown, cb: NuiReply) => {
    if (!panel.isOpen) return cb(null);
    SetNuiFocus(false, false);
    void pickEntity().then((entity) => {
      if (panel.isOpen) SetNuiFocus(true, true);
      cb(entity);
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminPlaceNames,
  (data: unknown, cb: NuiReply) => {
    const at =
      isRecord(data) &&
      typeof data.x === "number" &&
      typeof data.y === "number" &&
      typeof data.z === "number"
        ? data
        : null;
    const [x = 0, y = 0, z = 0] = at
      ? [at.x as number, at.y as number, at.z as number]
      : GetEntityCoords(cache.ped, false);
    cb(placeNames(x, y, z));
  },
);

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
