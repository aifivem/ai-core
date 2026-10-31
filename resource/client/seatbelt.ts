import {
  cache,
  callExport,
  PlayerState,
  registerExport,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE, SEATBELT_EVENT } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";

/** qbx_seatbelt keeps the belt in the local player's state bag `seatbelt` (set on its own client). */
const qbxBelt = new PlayerState("seatbelt", stateBoolean);

/** Answer of a seat belt export: a boolean, else unknown (null). */
const belt = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

/**
 * Seat belt scripts ai-core reads, first running wins (a HUD with its own belt before ai-smallresources). `worn` is
 * read on demand (actions, not frames); `watch` exists where the script tells changes, which ai-core passes on as
 * `CORE.clientSeatbeltEvent`. Calls per script: `docs/compat/seatbelt.md`.
 */
const ADAPTERS: ReadonlyArray<{
  resource: string;
  /** The version the calls were read from; ai-core warns when another one runs. */
  version?: string;
  worn: () => boolean | null;
  watch?: (changed: (worn: boolean | null) => void) => void;
}> = [
  {
    // client/editable.lua: exports("Seatbelt") answers anyBeltActive().
    resource: "tgiann-lumihud",
    version: "2.2.1",
    worn: () => belt(callExport("tgiann-lumihud", "Seatbelt")),
  },
  {
    resource: "tgiann-hudv2",
    worn: () => belt(callExport("tgiann-hudv2", "seatbelt")),
  },
  {
    resource: "tgiann-modern-hud",
    worn: () => belt(callExport("tgiann-modern-hud", "seatbelt")),
  },
  {
    // client/main.lua: LocalPlayer.state.seatbelt, flipped by its toggle.
    resource: "qbx_seatbelt",
    version: "1.0.0",
    worn: () => qbxBelt.get(cache.serverId) ?? false,
    watch: (changed) =>
      qbxBelt.onChange((id, value) => {
        if (id === cache.serverId) changed(value ?? false);
      }),
  },
  {
    resource: "ai-smallresources",
    worn: () => belt(callExport("ai-smallresources", "GetSeatbelt")),
    watch: (changed) =>
      on(SEATBELT_EVENT, (worn: unknown) => changed(belt(worn))),
  },
];

const belts = new AdapterPicker({
  category: "seat belt",
  adapters: ADAPTERS,
  log: createLogger("ai-core"),
});

// Each script's changes are passed on only while it is the one picked.
for (const adapter of ADAPTERS)
  adapter.watch?.((worn) => {
    if (belts.active === adapter) emit(CORE.clientSeatbeltEvent, worn);
  });

registerExport("GetSeatbeltProvider", () => belts.active?.resource ?? null);
registerExport("GetSeatbelt", () => belts.call("worn", (a) => a.worn(), null));
