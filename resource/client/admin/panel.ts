import {
  hud,
  loadLocaleTexts,
  triggerServerCallback,
  vehicleLabel,
} from "@aicore-fivem/lib/client";
import { isRecord, record } from "@aicore-fivem/lib/shared";
import { ADMIN, type AdminShowTarget } from "@aicore-fivem/shared";
import { NuiMessage } from "common/nui";
import { keybinds } from "../keybinds";
import { isLoaded } from "../playerState";

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

/** The admin panel on this client: opens it for admins (F10, or /aiadmin on the server), relays edits and the server's deltas. */
class AdminPanelClient {
  private open = false;
  private opening = false;

  /** `target`: the section to open on (another admin tool asked for it), else where the admin left. */
  async show(target: AdminShowTarget | null = null): Promise<void> {
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
        target,
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
