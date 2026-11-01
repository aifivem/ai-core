import { onClientCallback } from "@aicore-fivem/lib/server";
import {
  ITEM_DEFINITIONS_CALLBACK,
  ITEM_DEFINITIONS_EVENT,
  type ItemDefinition,
} from "@aicore-fivem/shared";

/**
 * Item definitions on every client (they concern everyone): each client asks once at start for the snapshot
 * (`ITEM_DEFINITIONS_CALLBACK`), then gets only the definitions that changed (`ITEM_DEFINITIONS_EVENT`, broadcast).
 * `refresh` reads the active inventory's definitions again (it became active, or its adapter said they changed)
 * and sends the difference against the last copy; while no inventory runs the last definitions stay.
 */
export class ClientItemDefinitions {
  private snapshot: Record<string, ItemDefinition> = {};
  /** Name -> JSON text of the definition clients have. */
  private readonly sent = new Map<string, string>();

  /** `read` answers the active inventory's definitions, null while none runs. */
  constructor(
    private readonly read: () => Record<string, ItemDefinition> | null,
  ) {
    // The snapshot is a few hundred bytes per item: a client asks once per start.
    onClientCallback(ITEM_DEFINITIONS_CALLBACK, () => this.snapshot, {
      rate: { count: 2, windowMs: 10_000 },
    });
  }

  refresh(): void {
    const next = this.read();
    if (!next) return;
    const changes: Record<string, ItemDefinition | null> = {};
    let changed = false;
    const names = new Set(Object.keys(next));
    for (const name of names) {
      const def = next[name] as ItemDefinition;
      const json = JSON.stringify(def);
      if (this.sent.get(name) === json) continue;
      this.sent.set(name, json);
      changes[name] = def;
      changed = true;
    }
    for (const name of this.sent.keys())
      if (!names.has(name)) {
        this.sent.delete(name);
        changes[name] = null;
        changed = true;
      }
    this.snapshot = next;
    if (changed) emitNet(ITEM_DEFINITIONS_EVENT, -1, changes);
  }
}
