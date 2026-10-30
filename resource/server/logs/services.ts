import type { LogEntry } from "@aicore-fivem/shared"
import { log } from "../log"
import { fivemanageKey, logSettings } from "./settings"

const FIVEMANAGE_URL = "https://api.fivemanage.com/api/v3/logs"
const FLUSH_MS = 2000
const MAX_BATCH = 50

/** Fivemanage logs, batched per dataset (one request per 2 s or 50 logs). */
const batches = new Map<string, object[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let warned = false

function sendBatch(dataset: string, logs: object[]): void {
  fetch(FIVEMANAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: fivemanageKey(),
      "X-Fivemanage-Dataset": dataset,
    },
    body: JSON.stringify(logs),
  })
    .then((response) => {
      if (response.ok || warned) return
      warned = true
      log.warn(`Fivemanage logs answered ${response.status}`)
    })
    .catch((error: unknown) => {
      if (warned) return
      warned = true
      log.warn("Fivemanage logs could not be sent", error)
    })
}

export function flushFivemanage(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  for (const [dataset, logs] of batches) sendBatch(dataset, logs)
  batches.clear()
}

export function sendToFivemanage(entry: LogEntry): void {
  if (!fivemanageKey()) return
  const batch = batches.get(entry.dataset) ?? []
  batches.set(entry.dataset, batch)
  batch.push({
    level: entry.level,
    message: entry.message,
    resource: entry.resource,
    metadata: {
      ...entry.metadata,
      channel: entry.channel,
      player: entry.player,
      target: entry.targetPlayer,
    },
  })
  if (batch.length >= MAX_BATCH) {
    batches.delete(entry.dataset)
    sendBatch(entry.dataset, batch)
  } else {
    flushTimer ??= setTimeout(flushFivemanage, FLUSH_MS)
  }
}

/** FiveM Stats (tgiann-fivem-stats-script) batches and stores the logs itself; it adds identifiers from the sources. */
export function sendToFivemStats(entry: LogEntry): void {
  const resource = logSettings.fivemstatsResource
  if (GetResourceState(resource) !== "started") return
  const target = (
    globalThis.exports as unknown as Record<
      string,
      Record<string, unknown> | undefined
    >
  )[resource]
  const fn = target?.Log
  if (typeof fn !== "function") return
  fn(
    entry.dataset,
    entry.level,
    entry.message,
    {
      ...entry.metadata,
      channel: entry.channel,
      playerSource: entry.source,
      targetSource: entry.target,
    },
    entry.resource
  )
}

const CONSOLE_COLORS = {
  debug: "^5",
  info: "^7",
  warn: "^3",
  error: "^1",
} as const

/** The server console (txAdmin's live console and log file). */
export function sendToConsole(entry: LogEntry): void {
  const who = entry.player
    ? ` [${entry.player.name}${entry.player.citizenid ? ` ${entry.player.citizenid}` : ""} #${entry.player.serverId}]`
    : ""
  console.log(
    `${CONSOLE_COLORS[entry.level]}[log:${entry.resource}/${entry.channel}]${who} ${entry.message}^7`
  )
}
