import { useEffect, useState } from "react";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Input } from "../../../components/ui/input";
import { Popover } from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";
import { useEditor } from "../context";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** Colours a server owner reaches for most (job tags, markers, chat). */
const PRESETS = [
  "#36ff9f",
  "#ffffff",
  "#ff5a5a",
  "#ff9f43",
  "#feca57",
  "#48dbfb",
  "#5f8dff",
  "#a55eea",
  "#ff6b81",
  "#1dd1a1",
  "#8395a7",
  "#222222",
];
const HEX = /^#[0-9a-f]{6}$/i;

/** A colour `#rrggbb`: the swatch opens presets, the box takes any hex. */
export function ColorW({ spec, path }: { spec: Spec<"color">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "string" ? value : "";
  const [draft, setDraft] = useState(stored);
  const [open, setOpen] = useState(false);
  useEffect(() => setDraft(stored), [stored]);
  const put = (hex: string) => {
    const clean = hex.toLowerCase();
    setDraft(clean);
    if (HEX.test(clean) && clean !== stored) save(clean);
  };
  return (
    <div className="flex items-center gap-[0.8vh]">
      <Popover
        open={open}
        onOpenChange={setOpen}
        width="24vh"
        anchor={
          <button
            type="button"
            aria-label={t(spec.label)}
            onClick={() => setOpen((v) => !v)}
            className="size-[3.8vh] shrink-0 rounded-full [box-shadow:inset_0_0_0_0.15vh_rgba(255,255,255,0.15)] transition-transform duration-150 hover:[transform:scale(1.06)]"
            style={{ background: HEX.test(stored) ? stored : "transparent" }}
          />
        }
      >
        <div className="grid grid-cols-6 gap-[0.6vh] p-[0.6vh]">
          {PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => {
                put(hex);
                setOpen(false);
              }}
              className={cn(
                "size-[2.8vh] rounded-full transition-transform duration-150 hover:[transform:scale(1.12)]",
                hex === stored && "[box-shadow:0_0_0_0.2vh_var(--green)]",
              )}
              style={{ background: hex }}
            />
          ))}
        </div>
      </Popover>
      <Input
        value={draft}
        aria-label={t(spec.label)}
        placeholder="#36ff9f"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => (HEX.test(draft) ? put(draft) : setDraft(stored))}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="w-[14vh] font-mono"
      />
    </div>
  );
}
