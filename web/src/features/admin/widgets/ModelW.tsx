import { useEffect, useState, type KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Input } from "../../../components/ui/input";
import { useEditor } from "../context";
import { useField } from "./useField";
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
