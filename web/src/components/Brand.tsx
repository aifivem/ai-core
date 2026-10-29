import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCity } from "@fortawesome/free-solid-svg-icons";
import type { Branding } from "@aicore-fivem/shared";

/** Server name and subtitle, top left of full-screen menus (docs/design.md "Typography"). */
export function Brand({ branding }: { branding: Branding }) {
  return (
    <div className="flex items-center gap-[1.6vh]">
      <FontAwesomeIcon icon={faCity} className="text-[3.6vh] text-accent" />
      <div className="flex flex-col gap-[0.8vh]">
        <span className="text-[2.6vh] font-semibold uppercase leading-none tracking-[0.3em]">{branding.name}</span>
        <span className="text-[1.1vh] uppercase leading-none tracking-[0.5em] text-text-3">{branding.subtitle}</span>
      </div>
    </div>
  );
}

/** Optional tagline, top right: two small caption lines and an accent rule. */
export function Tagline({ branding }: { branding: Branding }) {
  if (!branding.tagline && !branding.taglineSub) return null;
  return (
    <div className="flex items-center gap-[1.6vh]">
      <div className="flex flex-col items-end gap-[0.8vh]">
        <span className="text-[1.1vh] font-semibold uppercase leading-none tracking-[0.24em] text-text-2">{branding.tagline}</span>
        <span className="text-[1vh] uppercase leading-none tracking-[0.24em] text-text-3">{branding.taglineSub}</span>
      </div>
      <span className="h-[0.2vh] w-[3.6vh] bg-accent" />
    </div>
  );
}
