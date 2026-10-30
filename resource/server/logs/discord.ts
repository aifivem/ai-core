import type { LogEntry, LogPlayer } from "@aicore-fivem/shared";
import { log } from "../log";
import { logSettings } from "./settings";

const COLORS = {
  debug: 9807270,
  info: 5793266,
  warn: 16705372,
  error: 15548997,
} as const;
const MAX_FIELD = 1020;
/** A webhook that cannot keep up drops its oldest waiting logs past this many. */
const MAX_QUEUE = 500;
const IDENTIFIER_ORDER = [
  "fivem",
  "license",
  "license2",
  "discord",
  "steam",
  "xbl",
  "live",
  "ip",
];

interface Embed {
  color: number;
  title?: string;
  author: { name: string };
  fields: { name: string; value: string; inline: boolean }[];
  timestamp: string;
}

/** One webhook's queue: sent one at a time, waiting out Discord's rate limit (429 retry_after). */
class WebhookQueue {
  private readonly queue: Embed[] = [];
  private running = false;
  private warnedFull = false;

  constructor(private readonly url: string) {}

  push(embed: Embed): void {
    this.queue.push(embed);
    if (this.queue.length > MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
      if (!this.warnedFull)
        log.warn(
          "a Discord log webhook cannot keep up; oldest logs are dropped",
        );
      this.warnedFull = true;
    }
    if (!this.running) void this.run();
  }

  private async run(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const wait = await this.send(this.queue[0] as Embed);
      if (wait === 0) this.queue.shift();
      await new Promise((resolve) => setTimeout(resolve, wait || 100));
    }
    this.running = false;
  }

  /** 0 when sent (or dropped as invalid), else the milliseconds to wait before trying again. */
  private async send(embed: Embed): Promise<number> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: logSettings.discord.name,
          avatar_url: logSettings.discord.avatar || undefined,
          embeds: [embed],
        }),
      });
      if (response.ok) return 0;
      if (response.status === 429) {
        const body = (await response.json().catch(() => ({}))) as {
          retry_after?: number;
        };
        return Math.ceil((body.retry_after ?? 5) * 1000) + 500;
      }
      if (response.status >= 400 && response.status < 500) {
        log.warn(
          `Discord log webhook answered ${response.status}; the log is dropped`,
        );
        return 0;
      }
      return 10_000;
    } catch {
      return 10_000;
    }
  }
}

const queues = new Map<string, WebhookQueue>();

function playerText(player: LogPlayer): string {
  const lines = [
    player.name,
    `Server ID: ${player.serverId}`,
    player.citizenid
      ? `Character: ${player.character} (${player.citizenid})`
      : "[no character loaded]",
  ];
  for (const type of IDENTIFIER_ORDER)
    if (player.identifiers[type])
      lines.push(player.identifiers[type] as string);
  return lines.join("\n").slice(0, MAX_FIELD);
}

export function sendToDiscord(entry: LogEntry, url: string): void {
  if (!url) return;
  let queue = queues.get(url);
  if (!queue) {
    queue = new WebhookQueue(url);
    queues.set(url, queue);
  }
  const metadata = Object.keys(entry.metadata).length
    ? JSON.stringify(entry.metadata).slice(0, MAX_FIELD)
    : null;
  for (let i = 0; i < Math.max(1, entry.message.length); i += MAX_FIELD) {
    const fields: Embed["fields"] = [];
    if (entry.player)
      fields.push({
        name: "Player",
        value: playerText(entry.player),
        inline: false,
      });
    if (entry.targetPlayer)
      fields.push({
        name: "Target",
        value: playerText(entry.targetPlayer),
        inline: false,
      });
    fields.push({
      name: "Log",
      value: entry.message.slice(i, i + MAX_FIELD) || "-",
      inline: false,
    });
    if (metadata) fields.push({ name: "Data", value: metadata, inline: false });
    queue.push({
      color: COLORS[entry.level],
      title: entry.channel,
      author: { name: entry.resource },
      fields,
      timestamp: new Date(entry.time * 1000).toISOString(),
    });
  }
}
