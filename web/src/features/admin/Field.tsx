import type { WidgetSpec } from "@aicore-fivem/shared";
import { FieldShell } from "./FieldShell";
import { NumberW, SelectW, SwitchW, TextW } from "./widgets/basic";
import { InfoW } from "./widgets/InfoW";
import { ListW } from "./widgets/ListW";
import { PointW, TagsW } from "./widgets/more";

/** One schema field: its shell (label, hint, save state) around the widget it names. */
export function Field({ spec }: { spec: WidgetSpec }) {
  const shell = (control: React.ReactNode, inline = false) => (
    <FieldShell path={spec.path} label={spec.label} hint={spec.hint} inline={inline}>
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
    case "info":
      return shell(<InfoW spec={spec} path={spec.path} />, true);
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
