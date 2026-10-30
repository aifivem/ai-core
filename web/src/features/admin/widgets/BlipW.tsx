import { memo, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faMagnifyingGlass, faPalette } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { Popover } from "../../../components/ui/popover";
import { Select } from "../../../components/ui/select";
import { VirtualList } from "../../../components/VirtualList";
import { cn } from "../../../lib/utils";
import blips from "../blips.json";
import { useEditor } from "../context";
import { useField } from "./basic";

type Spec = Extract<WidgetSpec, { widget: "blip" }>;
interface Sprite {
  id: number;
  name: string;
  ext: string;
}
interface Color {
  id: number;
  hex: string;
  name: string;
}
// The FiveM blip reference (docs.fivem.net/docs/game-references/blips): sprite pictures and blip colours.
const SPRITES: Sprite[] = blips.sprites.filter((s) => s.name !== "radar_empty");
const COLORS: Color[] = blips.colors;
const COLS = 8;
const url = (s: Sprite) => `${blips.base}${s.name}.${s.ext}`;
const label = (s: Sprite) => s.name.replace(/^radar_/, "").replace(/_/g, " ");

interface BlipValue {
  sprite: number;
  color: number;
  scale: number;
}
const toBlip = (v: unknown): BlipValue => {
  const r = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  return { sprite: typeof r.sprite === "number" ? r.sprite : 1, color: typeof r.color === "number" ? r.color : 0, scale: typeof r.scale === "number" ? r.scale : 0.8 };
};

const Icon = memo(function Icon({ sprite, size }: { sprite: number; size: string }) {
  const s = blips.sprites.find((x) => x.id === sprite);
  if (!s) return <span style={{ width: size, height: size }} className="rounded-full bg-white/10" />;
  // A few sprites have no picture in the reference: the cell stays empty instead of a broken image.
  return <img src={url(s)} alt="" draggable={false} loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} style={{ width: size, height: size, objectFit: "contain" }} />;
});

/** A map blip: picture (searchable grid of every sprite), colour (swatches) and size, previewed as the game shows it. */
export function BlipW({ spec, path }: { spec: Spec; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const blip = toBlip(value);
  const [picking, setPicking] = useState(false);
  const [colors, setColors] = useState(false);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const found = q ? SPRITES.filter((s) => label(s).includes(q) || String(s.id) === q) : SPRITES;
    const out: Sprite[][] = [];
    for (let i = 0; i < found.length; i += COLS) out.push(found.slice(i, i + COLS));
    return out;
  }, [query]);
  const color = COLORS.find((c) => c.id === blip.color);
  const sprite = blips.sprites.find((s) => s.id === blip.sprite);
  const put = (patch: Partial<BlipValue>) => save({ ...blip, ...patch });

  return (
    <div className="flex items-center gap-[0.8vh]">
      <span className="flex size-[4.4vh] shrink-0 items-center justify-center rounded-[0.9vh] bg-row">
        <Icon sprite={blip.sprite} size="3vh" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[0.3vh]">
        <span className="truncate text-[1.35vh] font-medium capitalize">{sprite ? label(sprite) : t(spec.label)}</span>
        <span className="flex items-center gap-[0.6vh] text-[1.15vh] text-text-3">
          <span className="size-[1.2vh] rounded-full" style={{ background: color?.hex ?? "#fff" }} />
          {color?.name ?? blip.color} · {blip.scale.toFixed(1)}x
        </span>
      </div>
      <Button variant="ghost" onClick={() => setPicking(true)}>
        <FontAwesomeIcon icon={faImage} data-icon="inline-start" aria-hidden />
        {t("ADMIN_BLIP_PICK_ICON")}
      </Button>
      <Popover
        open={colors}
        onOpenChange={setColors}
        width="30vh"
        anchor={
          <Button variant="ghost" onClick={() => setColors((v) => !v)}>
            <FontAwesomeIcon icon={faPalette} data-icon="inline-start" aria-hidden />
            {t("ADMIN_BLIP_PICK_COLOR")}
          </Button>
        }
      >
        <div className="grid grid-cols-10 gap-[0.5vh] p-[0.6vh]">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.name}
              aria-label={c.name}
              onClick={() => {
                put({ color: c.id });
                setColors(false);
              }}
              className={cn("size-[2.4vh] rounded-full transition-transform duration-150 hover:[transform:scale(1.15)]", c.id === blip.color && "[box-shadow:0_0_0_0.2vh_var(--green)]")}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </Popover>
      <Select
        aria-label={t("ADMIN_BLIP_SCALE")}
        className="w-[11vh]"
        value={String(blip.scale)}
        options={[0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5].map((n) => ({ value: String(n), label: `${n.toFixed(1)}x` }))}
        onChange={(picked) => put({ scale: Number(picked) })}
      />
      <Dialog open={picking} onOpenChange={setPicking} title={t("ADMIN_BLIP_PICK_ICON")}>
        <div className="flex h-[56vh] w-[64vh] flex-col gap-[1vh]">
          <label className="flex h-[3.8vh] shrink-0 items-center gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] focus-within:border-tgi-green-40">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[1.2vh] text-text-3" aria-hidden />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ADMIN_BLIP_SEARCH")} className="h-full min-w-0 flex-1 bg-transparent text-[1.4vh] outline-none placeholder:text-text-4" />
          </label>
          <VirtualList
            className="min-h-0 flex-1"
            items={rows}
            estimateSize={7.4}
            getItemKey={(row) => row[0]?.id ?? 0}
            renderItem={(row) => (
              <div className="grid grid-cols-8 gap-[0.6vh]">
                {row.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={`${s.id} ${label(s)}`}
                    onClick={() => {
                      put({ sprite: s.id });
                      setPicking(false);
                    }}
                    className={cn("flex h-[6.8vh] flex-col items-center justify-center gap-[0.4vh] rounded-[0.8vh] bg-white/3 transition-colors duration-150 hover:bg-white/8", s.id === blip.sprite && "bg-tgi-green-15 [box-shadow:inset_0_0_0_1px_var(--green)]")}
                  >
                    <Icon sprite={s.id} size="3vh" />
                    <span className="font-mono text-[1vh] text-text-3">{s.id}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </div>
      </Dialog>
    </div>
  );
}
