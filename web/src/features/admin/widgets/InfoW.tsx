import type { ValueLabels, WidgetSpec } from "@aicore-fivem/shared";
import { cn } from "../../../lib/utils";
import { useEditor } from "../context";
import { useField } from "./basic";

type T = (key: string, ...args: Array<string | number>) => string;

/** A stored value as text: its lang label when it has one, `empty` (or a dash) when there is none. */
export function showValue(value: unknown, labels: ValueLabels, t: T): { text: string; muted: boolean } {
  const raw = Array.isArray(value) ? value.join(", ") : typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (raw === "") return { text: labels.empty ? t(labels.empty) : "-", muted: true };
  const label = labels.values?.[raw];
  return { text: label ? t(label) : raw, muted: false };
}

/** Read only: a value the script fills in (a reported default, a state), shown on the right of its label. */
export function InfoW({ spec, path }: { spec: Extract<WidgetSpec, { widget: "info" }>; path: string }) {
  const { t } = useEditor();
  const [value] = useField(path);
  const { text, muted } = showValue(value, spec, t);
  return <span className={cn("text-[1.4vh] leading-[1.3]", spec.mono && !muted && "font-mono text-[1.3vh]", muted ? "text-text-4" : "text-text-2")}>{text}</span>;
}
