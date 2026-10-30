import type { KeyboardData } from "../features/keyboard/Keyboard";

const bind = (name: string, key: string, label: string, resource: string) => ({
  name,
  key,
  label,
  resource,
  mouse: false,
});

/** Browser preview only: `?view=keys` shows the keys screen. */
export const KEYBOARD_MOCK: KeyboardData | undefined =
  new URLSearchParams(window.location.search).get("view") === "keys"
    ? {
        binds: [
          bind("inventory_open", "F2", "Open the inventory", "ai-inventory"),
          bind("inventory_hotbar", "TAB", "Quick slots bar", "ai-inventory"),
          bind("radialmenu_open", "F3", "Open the radial menu", "ai-radialmenu"),
          bind("point", "B", "Point", "ai-smallresources"),
          bind("handsup", "X", "Hands up", "ai-smallresources"),
          bind("ragdoll", "M", "Ragdoll", "ai-smallresources"),
          bind("engine", "M", "Engine on / off", "ai-vehiclekeys"),
          bind("lock", "U", "Lock / unlock", "ai-vehiclekeys"),
          bind("belt", "K", "Seatbelt", "ai-smallresources"),
          bind("crouch", "LCONTROL", "Crouch", "ai-smallresources"),
          bind("chat", "T", "Open the chat", "ai-chat"),
          bind("interact", "E", "Interact", "ai-core"),
          bind("admin", "F10", "Open the admin panel", "ai-core"),
        ],
        texts: {
          title: "Keys",
          hint: "Point at a key to see what it does",
          free: "Nothing is on this key",
          mouse: "Mouse and other buttons",
          search: "Search by action or script",
        },
      }
    : undefined;
