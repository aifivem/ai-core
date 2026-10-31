import {
  callExport,
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE, type MdtClientAdapter } from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";

/** A client export without arguments that opens the MDT (it checks the job itself). */
const exportOpener = (resource: string, name: string): MdtClientAdapter => ({
  resource,
  open: () => {
    callExport(resource, name);
    return true;
  },
});

/** Client halves of the MDTs that can be opened from outside (server list: `server/mdt/registry.ts`). */
const ADAPTERS: readonly MdtClientAdapter[] = [
  // tgiann-mdt (written from its source): its own client event, which checks the police job.
  {
    resource: "tgiann-mdt",
    open: () => {
      emit("tgiann-mdt:open");
      return true;
    },
  },
  // ps-mdt 3.1.4 (written from its source, client/exports.lua).
  exportOpener("ps-mdt", "OpenMDT"),
  // Wasabi MDT (written from its docs, docs.wasabiscripts.com/advanced-series/wasabi-mdt/exports).
  exportOpener("wasabi_mdt", "OpenMDT"),
];

/** The client half of the MDT layer: opens the screen of the MDT the server picked (export `OpenMdt`, lib `mdt.open`). */
const layer = new AdapterFollower(
  ADAPTERS,
  new GlobalKey(CORE.mdtStateKey, stateString),
  createLogger("ai-core"),
);

registerExport("OpenMdt", () => layer.call("open", (a) => a.open(), false));
