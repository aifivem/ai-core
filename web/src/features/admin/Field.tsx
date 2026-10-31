import type { WidgetSpec } from "@aicore-fivem/shared";
import { useEditor } from "./context";
import { FieldShell } from "./FieldShell";
import { getAt } from "./path";
import { ActionW } from "./widgets/ActionW";
import { NumberW, SelectW, SwitchW, TextW } from "./widgets/basic";
import { BlipW } from "./widgets/BlipW";
import { BrowseW } from "./widgets/BrowseW";
import { GradeW } from "./widgets/GradeW";
import { InfoW } from "./widgets/InfoW";
import { ListW } from "./widgets/ListW";
import { PointW, TagsW } from "./widgets/more";
import { ColorW, EntityW, ModelW } from "./widgets/pickers";
import { ZoneW } from "./widgets/ZoneW";

/** One schema field: its shell (label, hint, save state) around the widget it names; hidden while `showIf` fails. */
export function Field({ spec }: { spec: WidgetSpec }) {
  const { record } = useEditor();
  if (spec.showIf) {
    const value = getAt(record, spec.showIf.path);
    if (!spec.showIf.values.some((v) => v === value)) return null;
  }
  const shell = (control: React.ReactNode, inline = false) => (
    <FieldShell
      path={spec.path}
      label={spec.label}
      hint={spec.hint}
      inline={inline}
    >
      {control}
    </FieldShell>
  );
  switch (spec.widget) {
    case "text":
      return shell(<TextW spec={spec} path={spec.path} />);
    case "number":
      return shell(<NumberW spec={spec} path={spec.path} />, true);
    case "switch":
      return shell(<SwitchW spec={spec} path={spec.path} />, true);
    case "select":
      return shell(<SelectW spec={spec} path={spec.path} />, true);
    case "tags":
      return shell(<TagsW spec={spec} path={spec.path} />);
    case "point":
      return shell(<PointW spec={spec} path={spec.path} />);
    case "list":
      return shell(<ListW spec={spec} />);
    case "blip":
      return shell(<BlipW spec={spec} path={spec.path} />);
    case "model":
      return shell(<ModelW spec={spec} path={spec.path} />);
    case "color":
      return shell(<ColorW spec={spec} path={spec.path} />, true);
    case "entity":
      return shell(<EntityW spec={spec} path={spec.path} />);
    case "info":
      return shell(<InfoW spec={spec} path={spec.path} />, true);
    case "action":
      return shell(<ActionW spec={spec} />, true);
    case "zone":
      return shell(<ZoneW spec={spec} path={spec.path} />);
    case "grade":
      return shell(<GradeW spec={spec} path={spec.path} />, true);
    case "browse":
      return shell(<BrowseW spec={spec} />);
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
