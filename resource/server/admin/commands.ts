import { ByResource, caller, registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import {
  ADMIN,
  type CommandInfo,
  type CommandParam,
} from "@aicore-fivem/shared";
import { panel } from "../content";
import { log } from "../log";

/** A row of the panel's Commands tab (memory file `commands`, key = the command name). */
interface CommandRow {
  name: string;
  aliases: string;
  resource: string;
  help: string;
  usage: string;
  /** "" = everyone, "?" = not declared (a plain RegisterCommand), else the aces / principals. */
  access: string;
  kind: "lib" | "plain";
}

const FILE = "commands";
const PARAM_TYPES = new Set(["number", "playerId", "string", "longString"]);

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";
const names = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter(
          (n): n is string =>
            typeof n === "string" && /^[\w.:-]{1,64}$/.test(n),
        )
        .map((n) => n.toLowerCase())
    : [];

function readParam(value: unknown): CommandParam | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string" ||
    !PARAM_TYPES.has(value.type)
  )
    return null;
  return {
    name: text(value.name, 32),
    type: value.type as CommandParam["type"],
    help: text(value.help, 120),
    optional: value.optional === true,
  };
}

function readInfo(value: unknown): CommandInfo | null {
  if (!isRecord(value)) return null;
  const list = names(value.names);
  if (!list.length) return null;
  const params = Array.isArray(value.params)
    ? value.params.map(readParam).filter((p): p is CommandParam => p !== null)
    : [];
  const aces = Array.isArray(value.aces)
    ? value.aces.filter(
        (a): a is string => typeof a === "string" && /^[\w.:-]{1,64}$/.test(a),
      )
    : null;
  return { names: list, help: text(value.help, 200), params, aces };
}

/**
 * Every command on the server for the panel: the lib's `addCommand` commands as their resources announce them, and
 * every other registered command (`GetRegisteredCommands`) as plain. Rows go through the panel's `commit`, so admins
 * with the panel open get them as deltas. Plain commands are re-read when the panel opens and after resources start
 * or stop (debounced).
 */
class CommandRegistry {
  /** Every name and alias of a lib command -> its row key, owned by the announcing resource (gone when it stops). */
  private readonly libNames = new ByResource<string, string>({
    onDrop: (_resource, n, key) => {
      if (key === n) panel.commit(FILE, n, null);
    },
  });
  /** Keys of the plain rows. */
  private readonly plain = new Set<string>();
  /** `<principal> command.<name>` granted for a resource's command, taken back when it stops. */
  private readonly grants = new ByResource<string, true>({
    onDrop: (_resource, grant) => ExecuteCommand(`remove_ace ${grant} allow`),
  });
  private timer: ReturnType<typeof setTimeout> | null = null;
  private warned = false;

  register(resource: string, list: CommandInfo[]): void {
    for (const info of list) {
      const [name, ...aliases] = info.names;
      if (!name) continue;
      for (const n of info.names) {
        this.libNames.set(n, name, resource);
        if (this.plain.delete(n)) panel.commit(FILE, n, null);
      }
      this.grant(resource, info);
      const row: CommandRow = {
        name,
        aliases: aliases.join(", "),
        resource,
        help: info.help,
        usage: [
          `/${name}`,
          ...info.params.map((p) =>
            p.optional ? `[${p.name}]` : `<${p.name}>`,
          ),
        ].join(" "),
        access: info.aces ? info.aces.join(", ") : "",
        kind: "lib",
      };
      panel.commit(FILE, name, row);
    }
  }

  /** Re-reads the registered commands: adds the new plain ones, removes the gone ones. */
  refreshPlain(): void {
    const seen = new Set<string>();
    for (const command of GetRegisteredCommands() as Array<{
      name: string;
      resource: string;
    }>) {
      const name = command.name.toLowerCase();
      // Commands of the server itself (no resource) are console commands; +/- are key mappings.
      if (
        !command.resource ||
        name.startsWith("+") ||
        name.startsWith("-") ||
        this.libNames.get(name) !== undefined ||
        seen.has(name)
      )
        continue;
      seen.add(name);
      if (this.plain.has(name)) continue;
      this.plain.add(name);
      const row: CommandRow = {
        name,
        aliases: "",
        resource: command.resource,
        help: "",
        usage: `/${name}`,
        access: "?",
        kind: "plain",
      };
      panel.commit(FILE, name, row);
    }
    for (const name of this.plain) {
      if (seen.has(name)) continue;
      this.plain.delete(name);
      panel.commit(FILE, name, null);
    }
  }

  refreshSoon(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refreshPlain();
    }, 1000);
  }

  /**
   * `group.admin` and other principals are not aces (IsPlayerAceAllowed is always false for them): like ox_lib, give
   * each listed principal `command.<name>`, which the lib's check accepts. Needs `command.add_ace` for ai-core.
   */
  private grant(resource: string, info: CommandInfo): void {
    for (const principal of info.aces ?? []) {
      if (principal === ADMIN.ace || principal.startsWith("command.")) continue;
      if (!IsPrincipalAceAllowed("resource.ai-core", "command.add_ace")) {
        if (!this.warned)
          log.warn(
            "permission.cfg lacks `add_ace resource.ai-core command.add_ace allow` (and remove_ace): commands restricted to a principal like group.admin work only through command.<name>",
          );
        this.warned = true;
        return;
      }
      for (const name of info.names) {
        const ace = `command.${name}`;
        if (IsPrincipalAceAllowed(principal, ace)) continue;
        ExecuteCommand(`add_ace ${principal} ${ace} allow`);
        this.grants.set(`${principal} ${ace}`, true, resource);
      }
    }
  }
}

export const commandRegistry = new CommandRegistry();

// The first argument (the caller's name) stays for older callers; entries are owned by `caller()`.
registerExport("RegisterCommands", (_resource: unknown, list: unknown) => {
  const resource = caller();
  if (!Array.isArray(list)) return;
  const infos = list.map(readInfo).filter((i): i is CommandInfo => i !== null);
  if (infos.length !== list.length)
    log.warn(
      `${resource}: ${list.length - infos.length} command(s) with an invalid description skipped`,
    );
  commandRegistry.register(resource, infos);
});
// Plain commands of a stopped resource are gone too.
on("onResourceStop", () => commandRegistry.refreshSoon());
on("onServerResourceStart", () => commandRegistry.refreshSoon());
