import { useEffect, useMemo } from "react";
import { useAppSelector } from "../../../store";
import { loadPanelData } from "../actions";

export type Kind = "job" | "gang";

interface Def {
  label: string;
  grades: string[];
}

const NO_DATA: Record<string, unknown> = {};

function readDefs(file: unknown): Map<string, Def> {
  const defs = new Map<string, Def>();
  if (typeof file !== "object" || file === null) return defs;
  for (const [name, raw] of Object.entries(file)) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as { label?: unknown; grades?: unknown };
    const grades = Array.isArray(r.grades)
      ? r.grades.map((g: unknown, i) =>
          typeof g === "object" &&
          g !== null &&
          typeof (g as { label?: unknown }).label === "string"
            ? (g as { label: string }).label
            : String(i),
        )
      : [];
    defs.set(name, {
      label: typeof r.label === "string" ? r.label : name,
      grades,
    });
  }
  return defs;
}

/**
 * Job, gang and account names as the admin reads them: ai-core's own panel data (jobs and gangs with their grades,
 * kept current by the panel's deltas) and the account lookup list. ai-core's records are not in the open summary,
 * so the first user loads them.
 */
export function useDefs() {
  const panel = useAppSelector((state) =>
    state.admin.panels.find((p) => p.resource === "ai-core"),
  );
  const data = panel?.data ?? NO_DATA;
  const unloaded = panel?.loaded === false;
  useEffect(() => {
    if (unloaded) void loadPanelData("ai-core");
  }, [unloaded]);
  const accounts = useAppSelector((state) => state.admin.lookups.account);
  return useMemo(() => {
    const defs = { job: readDefs(data.jobs), gang: readDefs(data.gangs) };
    const accountLabels = new Map(accounts.map((a) => [a.value, a.label]));
    return {
      label: (kind: Kind, name: string): string =>
        defs[kind].get(name)?.label ?? name,
      grade: (kind: Kind, name: string, grade: number): string =>
        defs[kind].get(name)?.grades[grade] ?? String(grade),
      grades: (
        kind: Kind,
        name: string,
      ): Array<{ value: string; label: string }> =>
        (defs[kind].get(name)?.grades ?? []).map((label, i) => ({
          value: String(i),
          label: `${i}: ${label}`,
        })),
      options: (kind: Kind): Array<{ value: string; label: string }> =>
        [...defs[kind]].map(([value, d]) => ({ value, label: d.label })),
      account: (name: string): string => accountLabels.get(name) ?? name,
    };
  }, [data, accounts]);
}

export type Defs = ReturnType<typeof useDefs>;
