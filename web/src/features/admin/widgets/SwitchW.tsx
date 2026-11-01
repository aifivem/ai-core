import type { WidgetSpec } from "@aicore-fivem/shared";
import { Switch } from "../../../components/ui/switch";
import { useEditor } from "../context";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

export function SwitchW({
  spec,
  path,
}: {
  spec: Spec<"switch">;
  path: string;
}) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  return (
    <Switch
      aria-label={t(spec.label)}
      checked={value === true}
      onCheckedChange={(on) => save(on)}
    />
  );
}
