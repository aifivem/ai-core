import {
  cache,
  GlobalKey,
  onCache,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { CORE } from "@aicore-fivem/shared";

/** The panel's PvP setting on the local ped; a new ped (clothing scripts swap it) gets it again. */
const pvp = new GlobalKey(CORE.pvpStateKey, stateBoolean);
function apply(): void {
  const on = pvp.get() ?? true;
  SetCanAttackFriendly(cache.ped, on, false);
  NetworkSetFriendlyFireOption(on);
}
apply();
pvp.onChange(apply);
onCache("ped", apply);
