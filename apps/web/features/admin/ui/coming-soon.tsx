import type { ReactNode } from "react";

/**
 * 骨架页的占位面板。用于 P0 阶段铺设路由 — 对应功能在后续阶段实装。
 */
export function ComingSoon({
  phase,
  bullets,
  children,
}: {
  /** 所属阶段标签（P1/P2/...）以便浏览时一目了然 */
  phase: string;
  /** 核心能力摘要 */
  bullets: string[];
  /** 额外补充 */
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#111118] p-6 ring-1 ring-[#1A1A24]">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-[rgba(124,92,252,0.14)] px-2.5 py-0.5 text-[11px] font-medium text-[#C4B5FC]">
          {phase}
        </span>
        <span className="text-[12px] text-[#48484A]">功能建设中</span>
      </div>
      <ul className="mt-4 space-y-1.5 text-[13px] text-[#8E8E93]">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#2A2A36]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {children ? <div className="mt-5 text-[13px] text-[#8E8E93]">{children}</div> : null}
    </div>
  );
}
