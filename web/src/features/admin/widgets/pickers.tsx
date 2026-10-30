import { useEffect, useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faLocationArrow,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Popover } from "../../../components/ui/popover";
import { Tooltip } from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { pickEntity, saveField, teleport } from "../actions";
import { useEditor } from "../context";
import { getAt } from "../path";
import { useField } from "./basic";
import { LookupBox } from "./lookup";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;
type Kind = Spec<"model">["kind"];

/** Pictures of game models in the FiveM docs; objects have none. */
const PICTURES: Partial<Record<Kind, string>> = {
  vehicle: "https://docs.fivem.net/vehicles/{m}.webp",
  ped: "https://docs.fivem.net/peds/{m}.webp",
};

function ModelPicture({ kind, model }: { kind: Kind; model: string }) {
  const [failed, setFailed] = useState("");
  const template = PICTURES[kind];
  const url = model && template ? template.replace("{m}", model) : "";
  return (
    <span className="flex size-[4.4vh] shrink-0 items-center justify-center overflow-hidden rounded-[0.9vh] bg-row text-text-4">
      {url && failed !== url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          loading="lazy"
          onError={() => setFailed(url)}
          className="size-full object-contain"
        />
      ) : (
        <FontAwesomeIcon icon={faCube} className="text-[1.6vh]" aria-hidden />
      )}
    </span>
  );
}

interface BoxProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** A game model: picture, then a search over the admin game's models (vehicles, peds); a typed addon name is kept. */
export function ModelW({ spec, path }: { spec: Spec<"model">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const stored = typeof value === "string" ? value : "";
  const [query, setQuery] = useState(stored);
  useEffect(() => setQuery(stored), [stored]);
  const commit = (model: string) => {
    const clean = model.trim().toLowerCase();
    setQuery(clean);
    if (clean !== stored) save(clean);
  };
  const box = (props: BoxProps) => (
    <Input
      value={props.value}
      aria-label={t(spec.label)}
      placeholder={
        spec.placeholder ? t(spec.placeholder) : t("ADMIN_MODEL_SEARCH")
      }
      onChange={(event) => props.onChange(event.target.value)}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      className="flex-1 font-mono"
    />
  );
  return (
    <div className="flex items-center gap-[0.8vh]">
      <ModelPicture kind={spec.kind} model={stored} />
      {spec.kind === "object" ? (
        box({
          value: query,
          onChange: setQuery,
          onFocus: () => undefined,
          onBlur: () => commit(query),
          onKeyDown: (event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          },
        })
      ) : (
        <LookupBox
          source={spec.kind}
          query={query}
          onQuery={setQuery}
          onPick={(option) => commit(option.value)}
          onEnterText={commit}
          empty={t("ADMIN_MODEL_CUSTOM")}
          anchor={box}
        />
      )}
    </div>
  );
}

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

/** A world object picked with the free camera: its position at `path`, its model name at `modelPath`. */
export function EntityW({
  spec,
  path,
}: {
  spec: Spec<"entity">;
  path: string;
}) {
  const { t, resource, file, key, record } = useEditor();
  const [value, save] = useField(path);
  const point =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  const model = getAt(record, spec.modelPath);
  const fmt = (n: unknown) => (typeof n === "number" ? n.toFixed(2) : "?");
  const at =
    point &&
    typeof point.x === "number" &&
    typeof point.y === "number" &&
    typeof point.z === "number"
      ? { x: point.x, y: point.y, z: point.z }
      : null;
  return (
    <div className="flex items-center gap-[0.8vh]">
      <Input
        readOnly
        aria-label={t(spec.label)}
        className="flex-1 font-mono text-[1.25vh] text-text-2"
        value={
          point
            ? `${typeof model === "string" && model ? model : "?"}  ${fmt(point.x)}, ${fmt(point.y)}, ${fmt(point.z)}`
            : t("ADMIN_NOT_SET")
        }
      />
      <Button
        variant="ghost"
        onClick={async () => {
          const picked = await pickEntity();
          if (!picked) return;
          void saveField(resource, file, key, spec.modelPath, picked.model);
          save({ x: picked.x, y: picked.y, z: picked.z });
        }}
      >
        <FontAwesomeIcon icon={faVideo} data-icon="inline-start" aria-hidden />
        {t("ADMIN_PICK_ENTITY")}
      </Button>
      <Tooltip content={t("ADMIN_TELEPORT")}>
        <Button
          variant="icon"
          disabled={!at}
          aria-label={t("ADMIN_TELEPORT")}
          onClick={() => at && teleport(at, true)}
        >
          <FontAwesomeIcon icon={faLocationArrow} aria-hidden />
        </Button>
      </Tooltip>
    </div>
  );
}
