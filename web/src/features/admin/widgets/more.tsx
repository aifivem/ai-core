import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrosshairs, faLocationArrow, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { myPosition, teleport, type Point } from "../actions";
import { useEditor } from "../context";
import { useField } from "./basic";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** Free names typed one by one: Enter or comma adds, the x removes, Backspace on an empty box drops the last. */
export function TagsW({ spec, path }: { spec: Spec<"tags">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const tags = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  const [draft, setDraft] = useState("");
  const add = () => {
    const name = draft.trim().replace(/,$/, "");
    setDraft("");
    if (name && !tags.includes(name)) save([...tags, name]);
  };
  return (
    <div className="flex min-h-[3.6vh] flex-wrap items-center gap-[0.6vh] rounded-[0.6vh] border border-line bg-raised p-[0.5vh] focus-within:border-accent">
      {tags.map((tag) => (
        <span key={tag} className="flex h-[2.6vh] items-center gap-[0.6vh] rounded-full bg-panel px-[1vh] text-[1.25vh] text-text-2">
          {tag}
          <button type="button" aria-label={`${t("ADMIN_REMOVE")} ${tag}`} className="text-text-3 hover:text-text" onClick={() => save(tags.filter((x) => x !== tag))}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        aria-label={t(spec.label)}
        placeholder={spec.placeholder ? t(spec.placeholder) : undefined}
        className="h-[2.6vh] min-w-[12vh] flex-1 bg-transparent px-[0.6vh] text-[1.3vh] text-text outline-none placeholder:text-text-3"
        onChange={(event) => (event.target.value.endsWith(",") ? (setDraft(event.target.value), add()) : setDraft(event.target.value))}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Enter") add();
          if (event.key === "Backspace" && draft === "" && tags.length) save(tags.slice(0, -1));
        }}
      />
    </div>
  );
}

const isPoint = (v: unknown): v is Point =>
  typeof v === "object" && v !== null && ["x", "y", "z"].every((k) => typeof (v as Record<string, unknown>)[k] === "number");

/** A place in the world: read only coordinates, "Use my position" (or the camera's) and a teleport there. */
export function PointW({ spec, path }: { spec: Spec<"point">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const point = isPoint(value) ? value : null;
  const fmt = (n: number) => n.toFixed(2);
  return (
    <div className="flex items-center gap-[0.8vh]">
      <Input
        readOnly
        aria-label={t(spec.label)}
        className="flex-1 font-mono text-[1.25vh] text-text-2"
        value={point ? `${fmt(point.x)}, ${fmt(point.y)}, ${fmt(point.z)}${spec.heading ? `  ${Math.round(point.heading ?? 0)}°` : ""}` : t("ADMIN_NOT_SET")}
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          const here = await myPosition(spec.from === "camera" ? "camera" : "ped", spec.ground === true);
          if (here) save(spec.heading ? here : { x: here.x, y: here.y, z: here.z });
        }}
      >
        <FontAwesomeIcon icon={faCrosshairs} data-icon="inline-start" aria-hidden />
        {t(spec.from === "camera" ? "ADMIN_USE_CAMERA" : "ADMIN_USE_POSITION")}
      </Button>
      <Button size="sm" variant="secondary" disabled={!point} aria-label={t("ADMIN_TELEPORT")} title={t("ADMIN_TELEPORT")} onClick={() => point && teleport(point)}>
        <FontAwesomeIcon icon={faLocationArrow} aria-hidden />
      </Button>
    </div>
  );
}
