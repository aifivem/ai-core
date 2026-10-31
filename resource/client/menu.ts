import { ByResource, controls } from "@aicore-fivem/lib/client";
import { MENU_EVENTS } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "common/nui";

/**
 * Escape closes the dialogs: the game must not open the pause menu with the same key press once the focus is gone.
 */
class PauseGuard {
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Blocks the pause controls (199, 200) for the next 500 ms. */
  set(on: boolean): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!on) return controls.enable("pauseGuard");
    controls.disable("pauseGuard", [199, 200]);
    this.timer = setTimeout(() => {
      this.timer = null;
      controls.enable("pauseGuard");
    }, 500);
  }
}

export const pauseGuard = new PauseGuard();

/**
 * ai-core's own dialog: the admin item picker (lib `itemPicker`; menus, inputs and minigames are ai-lib's). One at a
 * time; the answer goes back to the asking resource as `MENU_EVENTS.menuResult`.
 */
class Dialogs {
  /** The open dialog's id, owned by the asking resource: its stop closes the dialog (answered with null). */
  private readonly current = new ByResource<"dialog", number>({
    onDrop: (resource, _key, id) => this.close(resource, id, null),
  });

  open(resource: string, id: number, data: unknown): void {
    this.answer(null);
    this.current.set("dialog", id, resource);
    SetNuiFocus(true, true);
    SendNUIMessage({ action: NuiMessage.itemsOpen, data });
  }

  answer(value: unknown): void {
    const id = this.current.get("dialog");
    const resource = this.current.ownerOf("dialog");
    if (id === undefined || resource === undefined) return;
    this.current.delete("dialog");
    this.close(resource, id, value);
  }

  private close(resource: string, id: number, value: unknown): void {
    SetNuiFocus(false, false);
    pauseGuard.set(true);
    SendNUIMessage({ action: NuiMessage.dialogClose });
    emit(MENU_EVENTS.menuResult, resource, id, value);
  }
}

export const dialogs = new Dialogs();

RegisterNuiCallback(
  NuiCallback.dialogAnswer,
  (data: unknown, cb: (r: unknown) => void) => {
    dialogs.answer(
      typeof data === "object" && data !== null && "value" in data
        ? data.value
        : null,
    );
    cb(true);
  },
);
