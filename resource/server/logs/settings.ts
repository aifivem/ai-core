import { DataFile } from "@aicore-fivem/lib/server";
import type { LogLevel } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { bool, record, str } from "../content/parse";
import { log } from "../log";

/** Log settings (panel content, `data/logs.json`). Webhook urls and API keys are in `data/secrets.json` (below). */
export interface LogSettings {
  providers: { console: boolean; discord: boolean; fivemanage: boolean; fivemstats: boolean };
  minLevel: LogLevel;
  includeIp: boolean;
  discord: { name: string; avatar: string };
  fivemstatsResource: string;
}

export const LEVELS: Record<LogLevel, number> = { debug: 1, info: 2, warn: 3, error: 4 };

export function toLevel(value: unknown, fallback: LogLevel): LogLevel {
  return typeof value === "string" && value in LEVELS ? (value as LogLevel) : fallback;
}

function read(raw: unknown): LogSettings {
  const s = record(raw);
  const providers = record(s.providers);
  const discord = record(s.discord);
  return {
    providers: {
      console: bool(providers.console, true),
      discord: bool(providers.discord, true),
      fivemanage: bool(providers.fivemanage, false),
      fivemstats: bool(providers.fivemstats, false),
    },
    minLevel: toLevel(s.minLevel, "info"),
    includeIp: bool(s.includeIp, false),
    discord: { name: str(discord.name, "ai-core"), avatar: typeof discord.avatar === "string" ? discord.avatar : "" },
    fivemstatsResource: str(s.fivemstatsResource, "tgiann-fivem-stats-script"),
  };
}

export const logSettings: LogSettings = read(new DataFile(ResourceName, "logs", log).read());

/**
 * Log secrets (panel-edited like the rest, but in `data/secrets.json`, which git ignores: webhook urls and API keys
 * must not reach a public repo). Shape: `{ "discordWebhooks": { "default": "", "<resource>": "", "<resource>/<channel>": "" },
 * "fivemanageKey": "" }`.
 */
interface LogSecrets {
  discordWebhooks: Record<string, string>;
  fivemanageKey: string;
}

function readSecrets(raw: unknown): LogSecrets {
  const s = record(raw);
  const webhooks: Record<string, string> = {};
  for (const [key, value] of Object.entries(record(s.discordWebhooks))) if (typeof value === "string" && value) webhooks[key] = value;
  return { discordWebhooks: webhooks, fivemanageKey: typeof s.fivemanageKey === "string" ? s.fivemanageKey : "" };
}

export const logSecrets: LogSecrets = readSecrets(new DataFile(ResourceName, "secrets", log).read());

/** The Discord webhook of a channel: `<resource>/<channel>`, else `<resource>`, else `default`. Empty = no Discord log. */
export function discordWebhook(resource: string, channel: string): string {
  const hooks = logSecrets.discordWebhooks;
  return hooks[`${resource}/${channel}`] ?? hooks[resource] ?? hooks.default ?? "";
}

export const fivemanageKey = (): string => logSecrets.fivemanageKey;
