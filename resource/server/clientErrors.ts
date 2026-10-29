import { onClientEvent } from "@aicore-fivem/lib/server";
import { logSafe } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { coreLog } from "./logs";

/**
 * Client script errors go to the log system (channel `clientErrors`), with who got them. Each client sends a line
 * once; the rate only stops a broken or hostile client from flooding the console.
 */
onClientEvent(
  CORE.clientErrorEvent,
  {
    args: ([resource, text]) => (typeof resource === "string" && typeof text === "string" ? [resource, text] : null),
    rate: { count: 30, windowMs: 60_000 },
  },
  (source, resource, text) => {
    // Client text: one line, no colour codes, so it cannot forge other log lines.
    coreLog("clientErrors", `[client error] ${logSafe(resource, 64)}: ${logSafe(text, 4000)}`, { level: "error", source });
  },
);
