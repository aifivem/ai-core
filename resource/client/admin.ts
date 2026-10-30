import { Keybind, loadLocaleTexts, onServerEvent, triggerServerCallback } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { ADMIN } from "@aicore-fivem/shared";
import { Locale } from "common";
import { NuiCallback, NuiMessage } from "common/nui";
import { pickPoint, placeNames } from "./freecam";
import { keybinds } from "./keybinds";
import { isLoaded } from "./playerState";

type NuiReply = (value: unknown) => void;
const round = (value: number): number => Math.round(value * 100) / 100;

/** The admin panel on this client: opens it for admins (F10, or /aiadmin on the server), relays edits and the server's deltas. */
class AdminPanelClient {
  private open = false;
  private opening = false;

  async show(): Promise<void> {
    if (this.open || this.opening || !isLoaded()) return;
    this.opening = true;
    // The keybinds live on clients: the admin's own list fills the panel's Keybinds tab.
    const answer = await triggerServerCallback(ADMIN.openCallback, [keybinds.list()]).catch(() => null);
    this.opening = false;
    // Not an admin: nothing happens, not even a message. ai-core's own server built the answer; the NUI checks its parts.
    if (!isRecord(answer) || !Array.isArray(answer.panels)) return;
    this.open = true;
    SetNuiFocus(true, true);
    SendNUIMessage({ action: NuiMessage.adminOpen, data: { ...answer, texts: loadLocaleTexts() } });
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    SetNuiFocus(false, false);
    emitNet(ADMIN.closeEvent);
  }

  get isOpen(): boolean {
    return this.open;
  }
}

const panel = new AdminPanelClient();

new Keybind({ name: "aicore_admin", description: Locale("KEYBIND_ADMIN"), defaultKey: "F10", onPressed: () => void panel.show() });
onServerEvent(ADMIN.showEvent, () => void panel.show());

// The NUI checks the delta's shape itself; here it is only passed on while the panel is open.
onServerEvent(ADMIN.deltaEvent, { args: ([delta]) => [delta] }, (delta) => {
  if (panel.isOpen) SendNUIMessage({ action: NuiMessage.adminDelta, data: delta });
});

RegisterNuiCallback(NuiCallback.adminApply, (data: unknown, cb: NuiReply) => {
  if (!isRecord(data)) return cb({ ok: false, error: "ADMIN_ERR_TYPE" });
  triggerServerCallback(ADMIN.applyCallback, [data.resource, data.patch]).then(cb, () => cb({ ok: false, error: "ADMIN_ERR_BUSY" }));
});

RegisterNuiCallback(NuiCallback.adminClose, (_data: unknown, cb: NuiReply) => {
  panel.hide();
  cb(true);
});

RegisterNuiCallback(NuiCallback.adminPosition, (data: unknown, cb: NuiReply) => {
  const camera = isRecord(data) && data.from === "camera";
  const ground = isRecord(data) && data.ground === true;
  const ped = PlayerPedId();
  const [x = 0, y = 0, root = 0] = camera ? GetFinalRenderedCamCoord() : GetEntityCoords(ped, false);
  const z = ground && !camera ? root - GetEntityHeightAboveGround(ped) : root;
  const heading = camera ? GetFinalRenderedCamRot(2)[2] ?? 0 : GetEntityHeading(ped);
  cb({ x: round(x), y: round(y), z: round(z), heading: round(((heading % 360) + 360) % 360) });
});

RegisterNuiCallback(NuiCallback.adminTeleport, (data: unknown, cb: NuiReply) => {
  if (isRecord(data) && typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number") {
    const ped = PlayerPedId();
    RequestCollisionAtCoord(data.x, data.y, data.z);
    SetEntityCoordsNoOffset(ped, data.x, data.y, data.z, false, false, false);
    if (typeof data.heading === "number") SetEntityHeading(ped, data.heading);
  }
  cb(true);
});

// Free camera pick: the NUI hides the panel and gives the focus back to the game until a place is picked or cancelled.
RegisterNuiCallback(NuiCallback.adminPickPoint, (data: unknown, cb: NuiReply) => {
  if (!panel.isOpen) return cb(null);
  SetNuiFocus(false, false);
  void pickPoint(isRecord(data) && data.root === true).then((point) => {
    if (panel.isOpen) SetNuiFocus(true, true);
    cb(point);
  });
});

RegisterNuiCallback(NuiCallback.adminPlaceNames, (data: unknown, cb: NuiReply) => {
  const at = isRecord(data) && typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number" ? data : null;
  const [x = 0, y = 0, z = 0] = at ? [at.x as number, at.y as number, at.z as number] : GetEntityCoords(PlayerPedId(), false);
  cb(placeNames(x, y, z));
});

// Another script's own panel: ai-core's closes first so the other NUI can take the focus.
RegisterNuiCallback(NuiCallback.adminRunCommand, (data: unknown, cb: NuiReply) => {
  cb(true);
  if (!isRecord(data) || typeof data.command !== "string" || !/^[A-Za-z0-9_:.-]{1,64}$/.test(data.command)) return;
  panel.hide();
  ExecuteCommand(data.command);
});
