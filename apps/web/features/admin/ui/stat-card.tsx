import type { ReactNode } from "react";
import clsx from "clsx";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** 右上角小徽标，例如趋势箭头 */
  badge?: ReactNode;
  /** 可选外边距/跨列控制 */
  className?: string;
};

export function StatCard({ label, value, hint, badge, className }: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-[#111118] px-5 py-4 ring-1 ring-[#1A1A24]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#48484A]">
          {label}
        </p>
        {badge}
      </div>
      <p className="mt-1.5 font-display text-[28px] font-semibold tabular-nums text-[#F5F5F7]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[#48484A]">{hint}</p> : null}
    </div>
  );
}
