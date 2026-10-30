import { AdminWorld, registerExport } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { KEYBIND, type KeybindInfo } from "@aicore-fivem/shared";

/**
 * Every resource's keybinds on this client (the lib's `Keybind` announces each one) and their default keys: the
 * panel's `keybinds` file (cached at start + changes since start) wins over the script's own key. Answered once the
 * file is current; a change made in the panel later is answered again at once (the keybind maps the new key).
 */
class KeybindDefaults {
  private readonly known = new Map<string, KeybindInfo>();
  /** The key each keybind was answered with last. */
  private readonly answered = new Map<string, string>();
  private readonly world = new AdminWorld(["keybinds"]);
  private ready = false;

  constructor() {
    void this.world.ready.then(() => {
      this.ready = true;
      for (const info of this.known.values()) this.answer(info);
    });
    // A key changed in the panel applies at once: the keybind registers the new key's mapping.
    this.world.onChange("keybinds", (name) => {
      const info = name ? this.known.get(name) : undefined;
      if (info && this.ready) this.answer(info);
      else this.changed();
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
    this.changed();
  }

  /** Names of the keybinds of running resources, in the order they were announced. */
  names(): string[] {
    return [...this.known.keys()];
  }

  /** What the admin panel lists (sent when it opens). */
  list(): KeybindInfo[] {
    return [...this.known.values()];
  }

  /** A keybind's announcement (description, hint), while its resource runs. */
  info(name: string): KeybindInfo | undefined {
    return this.known.get(name);
  }

  /** The panel record of a keybind (the owner's key and hint choice). */
  stored(name: string): Record<string, unknown> | null {
    const raw = this.world.get("keybinds")[name];
    return isRecord(raw) ? raw : null;
  }

  /** Runs `fn` after the panel's keybinds file changes and when keybinds come or go. */
  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private readonly listeners: Array<() => void> = [];

  private changed(): void {
    for (const fn of this.listeners) fn();
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
    this.changed();
  }
}

function toKeybindInfo(value: unknown): KeybindInfo | null {
  if (!isRecord(value)) return null;
  const { resource, name, description, defaultKey, mapper, hint } = value;
  if (
    typeof resource !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof defaultKey !== "string" ||
    typeof mapper !== "string"
  )
    return null;
  return {
    resource,
    name,
    description,
    defaultKey,
    mapper,
    hint:
      hint === "foot" || hint === "vehicle" || hint === "always"
        ? hint
        : undefined,
  };
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
