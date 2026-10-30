import {
  menu,
  onServerEvent,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger, isRecord } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { Locale, ResourceName } from "common";

const log = createLogger(ResourceName);

interface SpawnOption {
  id: number;
  label: string;
  last: boolean;
}

const toOptions = (raw: unknown): [SpawnOption[]] | null =>
  Array.isArray(raw)
    ? [
        raw.flatMap((o) =>
          isRecord(o) && typeof o.id === "number" && typeof o.label === "string"
            ? [{ id: o.id, label: o.label, last: o.last === true }]
            : [],
        ),
      ]
    : null;

/**
 * The panel lets players choose where to appear: after picking a character, ai-core's menu lists the last location
 * and the panel's places over the character scene; closing it keeps the first option. The spawn follows the answer.
 */
onServerEvent(
  CORE.chooseSpawnEvent,
  { args: ([raw]) => toOptions(raw) },
  async (options) => {
    const first = options[0];
    if (!first) return;
    const picked = await menu({
      title: Locale("SPAWN_CHOOSE_TITLE"),
      items: options.map((o) => ({
        id: String(o.id),
        label: o.last ? Locale("SPAWN_LAST_LOCATION") : o.label,
        icon: o.last ? "clock-rotate-left" : "location-dot",
      })),
    });
    const id = options.find((o) => String(o.id) === picked)?.id ?? first.id;
    await triggerServerCallback(CORE.spawnChoiceCallback, [id]).catch(
      (error: unknown) => log.error("spawn choice failed", error),
    );
  },
);
