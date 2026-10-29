import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
}

/** A centred panel over a dimmed screen (docs/design.md "Content panel"). */
export function Dialog({ title, description, icon, children, footer }: Props) {
  return (
    <div className="absolute inset-0 flex animate-fade items-center justify-center bg-[rgba(var(--bg-rgb),0.72)]">
      <div className="flex w-[48vh] animate-rise flex-col rounded-[1vh] border-[0.1vh] border-line bg-panel">
        <div className="flex items-start gap-[1.4vh] p-[2vh]">
          {icon}
          <div className="flex flex-col gap-[0.6vh]">
            <span className="text-[2.2vh] font-semibold leading-[1.2]">{title}</span>
            {description && <span className="text-[1.3vh] leading-[1.45] text-text-3">{description}</span>}
          </div>
        </div>
        {children && <div className="flex flex-col gap-[1.6vh] border-t-[0.1vh] border-line p-[2vh]">{children}</div>}
        <div className="flex gap-[1vh] border-t-[0.1vh] border-line p-[2vh]">{footer}</div>
      </div>
    </div>
  );
}
