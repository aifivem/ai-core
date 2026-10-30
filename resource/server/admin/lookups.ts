import { registerExport } from "@aicore-fivem/lib/server"
import type { LookupOption, Lookups, LookupSource } from "@aicore-fivem/shared"
import { accountTypes, gangs, jobs } from "../content"
import { inventory } from "../inventory"

const SOURCES: readonly LookupSource[] = ["item", "job", "gang", "account"]

const sorted = (options: LookupOption[]): LookupOption[] =>
  options.sort((a, b) => a.label.localeCompare(b.label))

/** The choices of one lookup list, read from what exists now (the active inventory's items, ai-core's content). */
export function lookupOptions(source: LookupSource): LookupOption[] {
  switch (source) {
    case "item":
      return sorted(
        Object.entries(
          inventory.call(
            "GetItemDefinitions",
            (a) => a.getItemDefinitions(),
            {}
          )
        ).map(([value, d]) => ({ value, label: d.label || value }))
      )
    case "job":
      return sorted([...jobs].map(([value, d]) => ({ value, label: d.label })))
    case "gang":
      return sorted([...gangs].map(([value, d]) => ({ value, label: d.label })))
    case "account":
      return sorted(
        [...accountTypes].map(([value, d]) => ({ value, label: d.label }))
      )
    default: {
      const _exhaustive: never = source
      return _exhaustive
    }
  }
}

/** Every list, for the panel's open payload. */
export function allLookups(): Lookups {
  return {
    item: lookupOptions("item"),
    job: lookupOptions("job"),
    gang: lookupOptions("gang"),
    account: lookupOptions("account"),
  }
}

// The values only, for the lib's validation in every script (an empty list = not known yet: the lib accepts then).
registerExport("GetLookupValues", (source: unknown) =>
  SOURCES.includes(source as LookupSource)
    ? lookupOptions(source as LookupSource).map((o) => o.value)
    : []
)
