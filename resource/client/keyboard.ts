import { registerExport } from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";
import { Locale } from "common";
import { NuiCallback, NuiMessage, type KeyboardBind } from "common/nui";
import { hudHidden } from "./hud";
import { boundKey } from "./keyHints";
import { keybinds } from "./keybinds";
import { pauseGuard } from "./menu";

/**
 * The keys screen (the radial menu's Keys entry): a keyboard where every key with an action is coloured, the actions
 * of the key under the pointer below it (every action while none is). Keys are the ones the player has bound now.
 */
class KeyboardScreen {
  open = false;

  show(): void {
    if (this.open) return;
    const binds: KeyboardBind[] = [];
    for (const name of keybinds.names()) {
      const info = keybinds.info(name);
      const key = boundKey(name).toUpperCase();
      if (info && key)
        binds.push({
          name,
          key,
          label: info.description,
          resource: info.resource,
          mouse: info.mapper !== "keyboard",
        });
    }
    this.open = true;
    hudHidden.set("keyboard", true, CORE.resource);
    SetNuiFocus(true, true);
    SendNUIMessage({
      action: NuiMessage.keyboardOpen,
      data: {
        binds,
        texts: {
          title: Locale("KEYS_TITLE"),
          hint: Locale("KEYS_HINT"),
          free: Locale("KEYS_FREE"),
          mouse: Locale("KEYS_MOUSE"),
          search: Locale("KEYS_SEARCH"),
        },
      },
    });
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    hudHidden.set("keyboard", false, CORE.resource);
    SetNuiFocus(false, false);
    pauseGuard.set(true);
    SendNUIMessage({ action: NuiMessage.keyboardClose });
  }
}

const screen = new KeyboardScreen();
registerExport("OpenKeyboard", () => screen.show());
RegisterNuiCallback(
  NuiCallback.keyboardClose,
  (_data: unknown, cb: (r: unknown) => void) => {
    screen.close();
    cb(true);
  },
);
