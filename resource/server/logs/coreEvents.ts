import {
  CORE,
  type CharacterInfo,
  type GangMembership,
  type JobMembership,
  type UnloadReason,
} from "@aicore-fivem/shared"
import { coreLog } from "./index"

/** ai-core's own logs, taken from its local events so the mutators stay free of logging. */

on(CORE.playerLoadedEvent, (source: number, character: CharacterInfo) => {
  coreLog(
    "characters",
    `loaded ${character.firstname} ${character.lastname} (${character.citizenid})`,
    {
      source,
      metadata: { charId: character.id, citizenid: character.citizenid },
    }
  )
})

on(
  CORE.playerUnloadedEvent,
  (source: number, charId: number, reason: UnloadReason) => {
    coreLog("characters", `unloaded character #${charId} (${reason})`, {
      source,
      metadata: { charId, reason },
    })
  }
)

on(
  CORE.moneyChangedEvent,
  (
    source: number,
    account: string,
    balance: number,
    delta: number,
    reason: string
  ) => {
    coreLog(
      "money",
      `${delta > 0 ? "+" : ""}${delta} ${account} (${reason}), balance ${balance}`,
      {
        source,
        metadata: { account, delta, balance, reason },
      }
    )
  }
)

on(CORE.jobsChangedEvent, (source: number, jobs: JobMembership[]) => {
  coreLog(
    "jobs",
    `jobs: ${jobs.map((j) => `${j.job}:${j.grade}`).join(", ") || "none"}`,
    { source, metadata: { jobs } }
  )
})

on(CORE.dutyChangedEvent, (source: number, job: string | null) => {
  coreLog("jobs", job ? `on duty: ${job}` : "off duty", {
    source,
    metadata: { duty: job },
  })
})

on(CORE.gangsChangedEvent, (source: number, gangs: GangMembership[]) => {
  coreLog(
    "gangs",
    `gangs: ${gangs.map((g) => `${g.gang}:${g.grade}`).join(", ") || "none"}`,
    { source, metadata: { gangs } }
  )
})
