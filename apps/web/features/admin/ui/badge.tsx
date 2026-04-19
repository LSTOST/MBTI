import type { ReactNode } from "react";
import clsx from "clsx";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-[#2A2A36] text-[#8E8E93]",
  accent: "bg-[rgba(124,92,252,0.12)] text-[#C4B5FC]",
  success: "bg-[rgba(52,199,89,0.12)] text-[#34C759]",
  warning: "bg-[rgba(255,159,10,0.14)] text-[#FF9F0A]",
  danger: "bg-[rgba(255,69,58,0.12)] text-[#FF453A]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
