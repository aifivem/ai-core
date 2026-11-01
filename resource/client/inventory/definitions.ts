import {
  registerExport,
  onServerEvent,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger, isRecord, sleep } from "@aicore-fivem/lib/shared";
import {
  CLIENT_ITEM_DEFINITIONS_EVENT,
  ITEM_DEFINITIONS_CALLBACK,
  ITEM_DEFINITIONS_EVENT,
  type ItemDefinition,
} from "@aicore-fivem/shared";

/**
 * The active inventory's item definitions on this client (server side: `server/inventory/clientDefinitions.ts`): one
 * snapshot asked at start, then the changed definitions the server broadcasts. Changes that arrive before the
 * snapshot are dropped: the snapshot is read later on the server, so it holds them. Other resources read them with
 * the exports and follow `CLIENT_ITEM_DEFINITIONS_EVENT`.
 */
const log = createLogger("ai-core");
const definitions = new Map<string, ItemDefinition>();
let loaded = false;

const isDefinition = (v: unknown): v is ItemDefinition =>
  isRecord(v) && typeof v.name === "string" && typeof v.label === "string";

/** Applies `name -> definition | null` and tells the other resources. */
function apply(changes: Record<string, unknown>): void {
  const applied: Record<string, ItemDefinition | null> = {};
  for (const [name, def] of Object.entries(changes)) {
    if (def === null) definitions.delete(name);
    else if (isDefinition(def)) definitions.set(name, def);
    else continue;
    applied[name] = isDefinition(def) ? def : null;
  }
  emit(CLIENT_ITEM_DEFINITIONS_EVENT, applied);
}

async function load(): Promise<void> {
  for (;;) {
    try {
      const snapshot = await triggerServerCallback(ITEM_DEFINITIONS_CALLBACK);
      if (isRecord(snapshot)) apply(snapshot);
      loaded = true;
      return;
    } catch (error) {
      log.warn("item definitions not loaded, asking again in 10 s", error);
      await sleep(10_000);
    }
  }
}

onServerEvent(
  ITEM_DEFINITIONS_EVENT,
  { args: ([changes]) => (isRecord(changes) ? ([changes] as const) : null) },
  (changes) => {
    if (loaded) apply(changes);
  },
);

registerExport("GetItemDefinitions", () => Object.fromEntries(definitions));
registerExport("GetItemDefinition", (name: unknown) =>
  typeof name === "string" ? (definitions.get(name) ?? null) : null,
);

void load();
