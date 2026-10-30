import {
  cache,
  every,
  onCache,
  registerExport,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  KEY_HINTS,
  type KeyHintRequest,
  type KeyHintView,
} from "@aicore-fivem/shared";
import { keybinds } from "./keybinds";

const WHEN = new Set(["foot", "vehicle", "always", "never"]);

/** The key a player has bound to a keybind's mapping now (they may have changed it in GTA's settings). */
export function boundKey(name: string): string {
  const key = keybinds.keyOf(name);
  if (key === null) return "";
  const command = key ? `+${name}_${key}` : `+${name}`;
  const button = GetControlInstructionalButton(
    0,
    GetHashKey(command) | 0x80000000,
    true,
  );
  return button.startsWith("t_") ? button.slice(2) : key;
}

/**
 * The key hints HUDs show on the left: keybinds that declare a `hint` (the owner's panel choice wins: never, on foot,
 * in a vehicle, always) for the player's situation now, plus hints scripts show for a while. Sent to HUDs as a local
 * event when the list changes; on foot / in a vehicle comes from the cache, nothing is polled.
 */
class KeyHints {
  private readonly extra = new Map<
    string,
    KeyHintRequest & { resource: string }
  >();
  private last = "";
  current: KeyHintView[] = [];

  update(): void {
    const inVehicle = cache.vehicle !== false;
    const list: KeyHintView[] = [];
    for (const name of keybinds.names()) {
      const info = keybinds.info(name);
      const stored = keybinds.stored(name);
      const choice =
        isRecord(stored) &&
        typeof stored.hint === "string" &&
        WHEN.has(stored.hint)
          ? stored.hint
          : info?.hint;
      if (!info || !choice || choice === "never") continue;
      if (choice === "foot" && inVehicle) continue;
      if (choice === "vehicle" && !inVehicle) continue;
      const key = boundKey(name);
      if (key)
        list.push({
          id: name,
          key,
          label: info.hintLabel ?? info.description,
          icon: info.icon,
        });
    }
    for (const [id, hint] of this.extra) {
      const key = hint.keybind ? boundKey(hint.keybind) : (hint.key ?? "");
      if (key) list.push({ id, key, label: hint.label, icon: hint.icon });
    }
    const text = JSON.stringify(list);
    if (text === this.last) return;
    this.last = text;
    this.current = list;
    emit(KEY_HINTS.changedEvent, list);
  }

  show(resource: string, id: string, hint: KeyHintRequest): void {
    this.extra.set(`${resource}:${id}`, { ...hint, resource });
    this.update();
  }

  hide(resource: string, id: string): void {
    if (this.extra.delete(`${resource}:${id}`)) this.update();
  }

  drop(resource: string): void {
    for (const [key, hint] of this.extra)
      if (hint.resource === resource) this.extra.delete(key);
    this.update();
  }
}

const toRequest = (v: unknown): KeyHintRequest | null =>
  isRecord(v) && typeof v.label === "string"
    ? {
        label: v.label.slice(0, 60),
        keybind: typeof v.keybind === "string" ? v.keybind : undefined,
        key: typeof v.key === "string" ? v.key.slice(0, 16) : undefined,
        icon: typeof v.icon === "string" ? v.icon.slice(0, 32) : undefined,
      }
    : null;

const hints = new KeyHints();
keybinds.onChange(() => hints.update());
onCache("vehicle", () => hints.update());
// A player can rebind a key in GTA's settings at any time: a cheap re-read now and then catches it.
every(5000, () => hints.update(), { name: "keyHints" });
on("onClientResourceStop", (resource: string) => hints.drop(resource));

registerExport("ShowKeyHint", (id: unknown, hint: unknown) => {
  const request = toRequest(hint);
  if (typeof id === "string" && request)
    hints.show(GetInvokingResource() ?? "", id, request);
});
registerExport("HideKeyHint", (id: unknown) => {
  if (typeof id === "string") hints.hide(GetInvokingResource() ?? "", id);
});
registerExport("GetKeyHints", () => hints.current);
