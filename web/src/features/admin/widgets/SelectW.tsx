import type { WidgetSpec } from "@aicore-fivem/shared";
import { Select } from "../../../components/ui/select";
import { useEditor } from "../context";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** Options are stored with their own type (a number option saves a number). */
const EMPTY_OPTION = "__empty";

export function SelectW({
  spec,
  path,
}: {
  spec: Spec<"select">;
  path: string;
}) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  // Radix refuses an empty item value: "" (a "default" choice) travels as a sentinel, and a missing value shows it.
  const hasEmpty = spec.options.some((o) => o.value === "");
  const wire = (v: string | number) => (v === "" ? EMPTY_OPTION : String(v));
  const options = spec.options.map((o) => ({
    value: wire(o.value),
    label: t(o.label),
  }));
  const current =
    value === undefined || value === null
      ? hasEmpty
        ? EMPTY_OPTION
        : undefined
      : wire(typeof value === "number" ? value : String(value));
  return (
    <Select
      aria-label={t(spec.label)}
      className="w-[24vh]"
      value={current}
      options={options}
      onChange={(picked) =>
        save(
          picked === EMPTY_OPTION
            ? ""
            : (spec.options.find((o) => String(o.value) === picked)?.value ??
                picked),
        )
      }
    />
  );
}
