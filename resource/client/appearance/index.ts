import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  APPEARANCE_STATE_KEY,
  toCharacterAppearance,
  type AppearanceClientAdapter,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";
import { aiAppearance } from "./adapters/ai-appearance";
import { blAppearance } from "./adapters/bl_appearance";
import { crmAppearance } from "./adapters/crm-appearance";
import { illeniumAppearance } from "./adapters/illenium-appearance";
import { qbClothing } from "./adapters/qb-clothing";
import { rcoreClothing } from "./adapters/rcore_clothing";
import { tgiannClothing } from "./adapters/tgiann-clothing";

/** Client halves of the clothing scripts (server list: `server/appearance/registry.ts`). */
const ADAPTERS: readonly AppearanceClientAdapter[] = [
  tgiannClothing,
  illeniumAppearance,
  qbClothing,
  crmAppearance,
  rcoreClothing,
  blAppearance,
  aiAppearance,
];

/** The client half of the appearance layer: follows the clothing script the server picked (GlobalState). */
const layer = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(APPEARANCE_STATE_KEY, stateString),
  createLogger("ai-core"),
);

/** Model hashes compared unsigned (natives may hand either form back). */
export const sameModel = (a: number, b: number): boolean => a >>> 0 === b >>> 0;

/** Puts a layer look on a ped of the look's model; false when it cannot (no clothing script, wrong model). */
export function applyLook(ped: number, raw: unknown): boolean {
  const look = toCharacterAppearance(raw);
  if (
    !look ||
    !layer.active ||
    !DoesEntityExist(ped) ||
    !sameModel(GetEntityModel(ped), look.model)
  )
    return false;
  return layer.call(
    "apply",
    (a) => {
      a.apply(ped, look.data);
      return true;
    },
    false,
  );
}

registerExport("ApplyAppearance", (ped: unknown, look: unknown) =>
  typeof ped === "number" ? applyLook(ped, look) : false,
);
registerExport(
  "GetPedAppearance",
  (ped: unknown): CharacterAppearance | null => {
    if (typeof ped !== "number" || !DoesEntityExist(ped)) return null;
    const data = layer.call("read", (a) => a.read?.(ped) ?? null, null);
    return data == null ? null : { model: GetEntityModel(ped), data };
  },
);
