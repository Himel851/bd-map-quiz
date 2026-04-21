import { NW_TRANSFORM, nwDistrictPaths } from "./transformed-nw";
import { absoluteDistrictPaths1 } from "./absolute-districts-1";
import { absoluteDistrictPaths2 } from "./absolute-districts-2";

export { NW_TRANSFORM, nwDistrictPaths } from "./transformed-nw";

const allAbsolute = [...absoluteDistrictPaths1, ...absoluteDistrictPaths2];

export const ALL_SVG_PATH_IDS: string[] = [
  ...nwDistrictPaths.map((p) => p.id),
  ...allAbsolute.map((p) => p.id),
];

export type DistrictPathDef = { id: string; d: string; sw?: number };

export function BangladeshDistrictPaths({
  fillById,
  defaultFill = "#CECECE",
}: {
  fillById: Record<string, string>;
  defaultFill?: string;
}) {
  return (
    <>
      <g transform={NW_TRANSFORM}>
        {nwDistrictPaths.map((p) => (
          <path
            key={p.id}
            id={p.id}
            d={p.d}
            fill={fillById[p.id] ?? defaultFill}
            stroke="#000000"
            strokeWidth={p.sw ?? 0.3965}
            className="transition-[fill] duration-300"
          />
        ))}
      </g>
      {allAbsolute.map((p) => (
        <path
          key={p.id}
          id={p.id}
          d={p.d}
          fill={fillById[p.id] ?? defaultFill}
          stroke="#000000"
          strokeWidth={p.sw ?? 1}
          className="transition-[fill] duration-300"
        />
      ))}
    </>
  );
}

export function BangladeshDistrictMapSvg({
  fillById,
  defaultFill,
  className,
  title,
}: {
  fillById: Record<string, string>;
  defaultFill?: string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1530.748 2138"
      className={className}
      role="img"
      aria-label={title ?? "Bangladesh district map"}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title ?? "Bangladesh district map"}</title>
      <rect width="1530.748" height="2138" fill="#e8f4fc" rx={24} ry={24} />
      <BangladeshDistrictPaths fillById={fillById} defaultFill={defaultFill} />
    </svg>
  );
}
