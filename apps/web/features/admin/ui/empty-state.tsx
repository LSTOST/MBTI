import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** 主 CTA（通常是按钮） */
  action?: ReactNode;
  /** 上方图标位，传 SVG 或 lucide 图标 */
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#0A0A0F] px-6 py-14 text-center ring-1 ring-[#1A1A24]">
      {icon ? <div className="text-[#48484A]">{icon}</div> : null}
      <p className="text-[15px] font-medium text-[#F5F5F7]">{title}</p>
      {description ? (
        <p className="max-w-[420px] text-[13px] leading-relaxed text-[#8E8E93]">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
