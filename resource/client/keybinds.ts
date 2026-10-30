import { AdminWorld, registerExport } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { KEYBIND, type KeybindInfo } from "@aicore-fivem/shared";

/**
 * Every resource's keybinds on this client (the lib's `Keybind` announces each one) and their default keys: the
 * panel's `keybinds` file (cached at start + changes since start) wins over the script's own key. Answered once the
 * file is current; a change made later applies when the script starts again or the player reconnects.
 */
class KeybindDefaults {
  private readonly known = new Map<string, KeybindInfo>();
  /** The key each keybind was answered with (later panel changes apply on its next start). */
  private readonly answered = new Map<string, string>();
  private readonly world = new AdminWorld(["keybinds"]);
  private ready = false;

  constructor() {
    void this.world.ready.then(() => {
      this.ready = true;
      for (const info of this.known.values()) this.answer(info);
    });
  }

  announce(info: KeybindInfo): void {
    this.known.set(info.name, info);
    if (this.ready) this.answer(info);
  }

  /** A stopped resource's keybinds leave the list. */
  drop(resource: string): void {
    for (const [name, info] of this.known) {
      if (info.resource !== resource) continue;
      this.known.delete(name);
      this.answered.delete(name);
    }
  }

  /** What the admin panel lists (sent when it opens). */
  list(): KeybindInfo[] {
    return [...this.known.values()];
  }

  /** The key a keybind was registered with (its mapping command is `+<name>_<key>`); null until answered. */
  keyOf(name: string): string | null {
    return this.answered.get(name) ?? null;
  }

  private answer(info: KeybindInfo): void {
    const stored = this.world.get("keybinds")[info.name];
    const key =
      isRecord(stored) && typeof stored.key === "string" && stored.key !== ""
        ? stored.key.toUpperCase()
        : info.defaultKey;
    this.answered.set(info.name, key);
    emit(KEYBIND.keyEvent, info.resource, info.name, key);
  }
}

function toKeybindInfo(value: unknown): KeybindInfo | null {
  if (!isRecord(value)) return null;
  const { resource, name, description, defaultKey, mapper } = value;
  if (
    typeof resource !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof defaultKey !== "string" ||
    typeof mapper !== "string"
  )
    return null;
  return { resource, name, description, defaultKey, mapper };
}

export const keybinds = new KeybindDefaults();

on(KEYBIND.announceEvent, (value: unknown) => {
  const info = toKeybindInfo(value);
  if (info) keybinds.announce(info);
});
on("onClientResourceStop", (resource: string) => keybinds.drop(resource));
registerExport("GetKeybindKey", (name: unknown) =>
  typeof name === "string" ? keybinds.keyOf(name) : null,
);
