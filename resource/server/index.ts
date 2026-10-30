import "./admin/host"
import { gangs, jobs, panel } from "./content"
import { databaseReady } from "./database"
import { resetDutyCounts } from "./jobs/dutyCount"
import { log } from "./log"
import { sharedAccounts } from "./money/book"
import "./logs"
import "./logs/coreEvents"
import "./clientErrors"
import "./connection"
import "./player/session"
import "./player/deaths"
import "./persistence"
import "./jobs/paycheck"
import "./exports"
import "./inventory"
import "./vehicleKeys"
import "./interaction"
import "./scopes"
import "./devCommands"

resetDutyCounts(jobs.keys())

// A job or gang created in the panel gets its shared accounts and duty count at once.
const known = { job: new Set(jobs.keys()), gang: new Set(gangs.keys()) }
for (const type of ["job", "gang"] as const) {
  panel.onChange(type === "job" ? "jobs" : "gangs", (key, value) => {
    if (!key || value === null || known[type].has(key)) return
    known[type].add(key)
    if (type === "job") resetDutyCounts([key])
    sharedAccounts
      .load(type, key)
      .catch((error: unknown) =>
        log.error(`loading the accounts of ${type} ${key} failed`, error)
      )
  })
}

// Job and gang accounts load once at start so the society money exports can stay synchronous.
databaseReady
  .then(() =>
    Promise.all([
      ...[...jobs.keys()].map((job) => sharedAccounts.load("job", job)),
      ...[...gangs.keys()].map((gang) => sharedAccounts.load("gang", gang)),
    ])
  )
  .then(() => log.info(`ready: ${jobs.size} jobs, ${gangs.size} gangs`))
  .catch((error: unknown) =>
    log.error("loading job and gang accounts failed", error)
  )
