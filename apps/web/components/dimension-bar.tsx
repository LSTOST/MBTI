import type { MatchDimension } from "@/lib/types";

const DIMENSION_COLORS = [
  { accent: "#7C5CFC", bg: "rgba(124,92,252,0.1)" },
  { accent: "#5090FC", bg: "rgba(80,144,252,0.1)" },
  { accent: "#40C8C0", bg: "rgba(64,200,192,0.1)" },
];

export function DimensionBar({ dimension, index }: { dimension: MatchDimension; index: number }) {
  const colors = DIMENSION_COLORS[index] ?? DIMENSION_COLORS[0];
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-xl px-4 py-2.5"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="font-mono text-[18px] font-bold tabular-nums" style={{ color: colors.accent }}>
          {dimension.score}
        </span>
        <span className="whitespace-nowrap text-[13px] text-[#8E8E93]">{dimension.label}</span>
      </div>
      <span className="shrink-0 whitespace-nowrap text-[12px] font-medium" style={{ color: colors.accent }}>
        {dimension.tag}
      </span>
    </div>
  );
}
