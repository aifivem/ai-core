import type { AdminPanelSnapshot, TabSpec } from "@aicore-fivem/shared";

/** One thing the global search can jump to. */
export interface SearchEntry {
  kind: "script" | "tab" | "field" | "record";
  resource: string;
  tab: string;
  /** A record of a records tab. */
  key?: string;
  /** A field of a settings tab: scrolled to and flashed. */
  path?: string;
  file: string;
  title: string;
  /** Where it lives: script / tab / card. */
  where: string;
  /** The hint or description under the title. */
  detail: string;
  icon: string;
  /** Lowercase text the query words are looked for in. */
  text: string;
}

type Texts = Record<string, string>;

const fold = (s: string) => s.toLocaleLowerCase();

/** Every script, tab, settings field and record of the open panels, in the admin's language. */
export function buildIndex(
  panels: AdminPanelSnapshot[],
  core: Texts,
): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const panel of panels) {
    const t = (key: string | undefined) =>
      key ? (panel.texts[key] ?? core[key] ?? key) : "";
    const script = t(panel.schema.title);
    const first = panel.schema.tabs[0];
    if (!first) continue;
    const add = (e: Omit<SearchEntry, "text" | "resource">) =>
      out.push({
        ...e,
        resource: panel.resource,
        text: fold(`${e.title} ${e.detail} ${e.where} ${panel.resource}`),
      });
    add({
      kind: "script",
      tab: first.id,
      file: first.file,
      title: script,
      where: panel.resource,
      detail: "",
      icon: panel.schema.icon,
    });
    for (const tab of panel.schema.tabs) addTab(panel, tab, script, t, add);
  }
  return out;
}

function addTab(
  panel: AdminPanelSnapshot,
  tab: TabSpec,
  script: string,
  t: (key: string | undefined) => string,
  add: (e: Omit<SearchEntry, "text" | "resource">) => void,
): void {
  const tabLabel = t(tab.label);
  const base = { tab: tab.id, file: tab.file };
  add({
    ...base,
    kind: "tab",
    title: tabLabel,
    where: script,
    detail: t(tab.desc),
    icon: tab.icon,
  });
  const spec = panel.schema.files[tab.file];
  for (const card of tab.cards)
    for (const field of card.fields)
      add({
        ...base,
        kind: "field",
        // A records tab has no single record to scroll in: the tab opens.
        path: spec?.kind === "settings" ? field.path : undefined,
        title: t(field.label) || t(card.title),
        where: `${script} / ${tabLabel} / ${t(card.title)}`,
        detail: t(field.hint) || t(card.desc),
        icon: card.icon,
      });
  if (spec?.kind !== "records") return;
  if (panel.loaded === false) {
    for (const [key, label] of Object.entries(panel.index?.[tab.file] ?? {}))
      add({
        ...base,
        kind: "record",
        key,
        title: label || key,
        where: `${script} / ${tabLabel}`,
        detail: key,
        icon: tab.icon,
      });
    return;
  }
  const records = panel.data[tab.file];
  if (typeof records !== "object" || records === null) return;
  for (const [key, value] of Object.entries(records)) {
    const label =
      spec.labelPath && typeof value === "object" && value !== null
        ? Reflect.get(value, spec.labelPath)
        : undefined;
    add({
      ...base,
      kind: "record",
      key,
      title: typeof label === "string" && label ? label : key,
      where: `${script} / ${tabLabel}`,
      detail: key,
      icon: tab.icon,
    });
  }
}

const KIND_RANK = { script: 0, tab: 1, field: 2, record: 3 };

/** Entries holding every word of the query; titles that start with it first. */
export function search(
  index: SearchEntry[],
  query: string,
  limit = 60,
): SearchEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const first = words.join(" ");
  const scored: Array<{ e: SearchEntry; score: number }> = [];
  for (const e of index) {
    if (!words.every((w) => e.text.includes(w))) continue;
    const title = fold(e.title);
    const score =
      (title.startsWith(first) ? 0 : title.includes(first) ? 10 : 20) +
      KIND_RANK[e.kind];
    scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.e);
}
