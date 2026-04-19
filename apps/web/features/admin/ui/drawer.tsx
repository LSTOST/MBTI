"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** 右侧滑出抽屉，用于详情编辑等「偏情境型」的操作。比 Modal 更适合长表单。 */
export function Drawer({
  title,
  onClose,
  children,
  footer,
  width = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const widthClass = width === "lg" ? "w-[640px]" : width === "sm" ? "w-[380px]" : "w-[480px]";

  return (
    <div className="fixed inset-0 z-[150]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="关闭"
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full ${widthClass} max-w-full flex-col bg-[#111118] shadow-2xl ring-1 ring-[#1A1A24]`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#1A1A24] px-5">
          <h2 className="text-[15px] font-semibold text-[#F5F5F7]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#1A1A24] hover:text-[#F5F5F7]"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-[#1A1A24] px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
