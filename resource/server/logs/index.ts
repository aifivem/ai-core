import { ByResource, caller, registerExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type {
  LogChannel,
  LogEntry,
  LogOptions,
  LogPlayer,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { players } from "../player/registry";
import { sendToDiscord } from "./discord";
import {
  flushFivemanage,
  sendToConsole,
  sendToFivemanage,
  sendToFivemStats,
} from "./services";
import { discordWebhook, LEVELS, logSettings, toLevel } from "./settings";

/**
 * The log system: resources name their channels, ai-core decides where logs go (`data/logs.json` providers,
 * webhook urls and API keys in the git-ignored `data/secrets.json`). Every ai-* resource logs through the `Log` export (lib `aiLog`).
 */
/** Each resource's channel settings, keyed by the resource itself (dropped when it stops). */
const channels = new ByResource<string, Record<string, LogChannel>>();

function playerInfo(source: number): LogPlayer | undefined {
  const name = GetPlayerName(String(source));
  if (!name) return undefined;
  const identifiers: Record<string, string> = {};
  for (let i = 0; i < GetNumPlayerIdentifiers(String(source)); i++) {
    const identifier = GetPlayerIdentifier(String(source), i);
    const type = identifier?.split(":")[0];
    if (type && (type !== "ip" || logSettings.includeIp))
      identifiers[type] = identifier;
  }
  const player = players.get(source);
  return {
    serverId: source,
    name,
    identifiers,
    ...(player
      ? { citizenid: player.citizenid, character: player.fullName }
      : {}),
  };
}

/** Builds the entry once and hands it to every provider that is on. */
export function writeLog(
  resource: string,
  channelName: string,
  message: unknown,
  options: LogOptions = {},
): void {
  const level = toLevel(options.level, "info");
  if (LEVELS[level] < LEVELS[logSettings.minLevel]) return;
  const channel = channels.get(resource)?.[channelName] ?? {};
  if (channel.active === false) return;

  const source =
    typeof options.source === "number" && options.source > 0
      ? options.source
      : undefined;
  const target =
    typeof options.target === "number" && options.target > 0
      ? options.target
      : undefined;
  const entry: LogEntry = {
    resource,
    channel: channelName,
    level,
    message: String(message),
    time: Math.floor(Date.now() / 1000),
    dataset: channel.dataset ?? resource,
    source,
    target,
    player: source ? playerInfo(source) : undefined,
    targetPlayer: target ? playerInfo(target) : undefined,
    metadata: isRecord(options.metadata) ? options.metadata : {},
  };

  const providers = logSettings.providers;
  if (providers.console) sendToConsole(entry);
  if (providers.discord)
    sendToDiscord(entry, discordWebhook(resource, channelName));
  if (providers.fivemanage) sendToFivemanage(entry);
  if (providers.fivemstats) sendToFivemStats(entry);
}

/** ai-core's own logs. */
export const coreLog = (
  channel: string,
  message: string,
  options?: LogOptions,
): void => writeLog(ResourceName, channel, message, options);

registerExport(
  "Log",
  (channel: unknown, message: unknown, options?: LogOptions) => {
    writeLog(
      caller(),
      typeof channel === "string" ? channel : "log",
      message,
      isRecord(options) ? options : {},
    );
  },
);

registerExport("LogChannels", (list: unknown) => {
  if (isRecord(list))
    channels.set(caller(), list as Record<string, LogChannel>);
});

on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) flushFivemanage();
});
