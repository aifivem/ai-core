import { useCallback } from "react";
import { useAppSelector } from "../../store";

const fill = (text: string, args: Array<string | number>): string =>
  text.replace(/\{(\d+)\}/g, (match, index: string) => (args[Number(index)] === undefined ? match : String(args[Number(index)])));

/** Texts for one script's panel: its own lang file first, ai-core's generic panel words second, else the key. */
export function usePanelLang(resource: string | undefined): (key: string, ...args: Array<string | number>) => string {
  const own = useAppSelector((state) => state.admin.panels.find((p) => p.resource === resource)?.texts);
  const core = useAppSelector((state) => state.admin.texts);
  return useCallback((key: string, ...args: Array<string | number>) => fill(own?.[key] ?? core[key] ?? key, args), [own, core]);
}
