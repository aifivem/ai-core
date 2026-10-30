import { registerExport } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { settings } from "../content";
import { identify } from "../player/users";
import { conflicts } from "./conflicts";

const log = createLogger("ai-core");

/** The part of FXServer's deferrals object used here (not in the @citizenfx/server typings). */
interface Deferrals {
  defer(): void;
  update(message: string): void;
  done(failureReason?: string): void;
}

/** A check a connecting player must pass: a refusal text, or null / undefined to let the player through. */
type Check = (source: number, identifiers: Record<string, string>) => string | null | undefined;

/**
 * The connecting stage: every player passes ai-core's checks (a FiveM account, no conflicting scripts running) and
 * the checks other resources add (`AddConnectionCheck`: whitelists, bans), in the order they were added.
 */
class ConnectionGate {
  private readonly checks = new Map<string, { resource: string; run: Check }>();

  add(id: string, resource: string, run: Check): void {
    this.checks.set(id, { resource, run });
  }

  dropResource(resource: string): void {
    for (const [id, check] of this.checks) if (check.resource === resource) this.checks.delete(id);
  }

  /** The first refusal, or null. */
  run(source: number): string | null {
    const identifiers: Record<string, string> = {};
    for (const id of getPlayerIdentifiers(String(source))) {
      const at = id.indexOf(":");
      if (at > 0) identifiers[id.slice(0, at)] = id.slice(at + 1);
    }
    for (const [id, check] of this.checks) {
      try {
        const reason = check.run(source, identifiers);
        if (typeof reason === "string" && reason) return reason;
      } catch (error) {
        log.error(`connection check ${id} (${check.resource}) failed`, error);
      }
    }
    return null;
  }
}

const gate = new ConnectionGate();
gate.add("ai-core:fivem", "ai-core", (source) => (identify(source) ? null : Locale("CONNECT_NO_FIVEM")));
gate.add("ai-core:conflicts", "ai-core", () => {
  if (!settings.refuseOnConflict) return null;
  const blocking = conflicts.blocking();
  return blocking.length > 0 ? Locale("CONNECT_CONFLICT", blocking.map((c) => c.remove).join(", ")) : null;
});

on("playerConnecting", (_name: string, _kick: (reason: string) => void, deferrals: Deferrals) => {
  const source = Number(globalThis.source);
  deferrals.defer();
  // Deferrals need a tick between defer() and done(); setImmediate runs on the main thread natives need.
  setImmediate(() => {
    const reason = gate.run(source);
    if (reason) deferrals.done(reason);
    else deferrals.done();
  });
});

// Conflicts: once every resource of the boot has started, then again whenever a resource starts or stops.
conflicts.schedule(5000);
on("onServerResourceStart", () => conflicts.schedule(1000));
on("onResourceStop", (resource: string) => {
  gate.dropResource(resource);
  conflicts.dropFrom(resource);
  conflicts.schedule(1000);
});

registerExport("AddConnectionCheck", (id: unknown, check: unknown) => {
  // A function from another resource arrives as a callable reference.
  if (typeof id === "string" && id && typeof check === "function") gate.add(id, GetInvokingResource() ?? "?", check as Check);
});
registerExport("RegisterReplacement", (keep: unknown, remove: unknown) => {
  const names = (Array.isArray(remove) ? remove : [remove]).filter((n): n is string => typeof n === "string" && n !== "");
  if (typeof keep === "string" && keep && names.length > 0) conflicts.declare(keep, names, GetInvokingResource() ?? keep);
});
registerExport("GetConflicts", () => conflicts.list().map((c) => ({ ...c })));
